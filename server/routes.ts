import type { Express } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./supabaseAuth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";

import { analyzeBusinessFromData, generatePitchDeckSlides, enhanceBusinessDescription, generateSlideContentForTemplate } from "./services/openai";
import * as openai from "./services/openai";
import { FinancialAnalyzer } from "./services/financialAnalyzer";
import { generatePitchDeckPDF, validateSlideContent } from "./services/pdfGenerator";
import { WebsiteCrawler } from "./services/websiteCrawler";
import { BusinessResearcher } from "./services/businessResearcher";
import { generateBrandKitSuggestions, extractBrandLogos } from "./services/brandKit";
import { BrandAnalyzer } from "./services/brandAnalyzer";
import { insertProjectSchema, insertBrandKitSchema, insertDeckSchema, insertCrmContactSchema, insertCampaignSchema, insertAudienceSchema } from "@shared/schema";
import { templateManager } from "./templates/templateManager";
import { subscriptionService } from "./services/subscriptionService";
import { rateLimiters } from "./middleware/rateLimiter";

// Helper function to extract string value from potential object or string
const extractStringValueUtil = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    // Handle cases where OpenAI returns {estimate, methodology} or similar nested objects
    return value.estimate || value.value || value.description || JSON.stringify(value);
  }
  return String(value);
};

// Recursively sanitize nested objects to prevent React rendering errors
const sanitizeBusinessProfile = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeBusinessProfile(item));
  }
  
  if (typeof obj === 'object') {
    // Check if this looks like a nested object that should be a string
    // (has estimate, methodology, value, description keys)
    if (obj.estimate !== undefined || obj.methodology !== undefined) {
      return extractStringValueUtil(obj);
    }
    
    // Otherwise recursively sanitize all properties
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeBusinessProfile(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for DigitalOcean
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Serve template thumbnail placeholders
  app.get('/templates/thumbnails/:filename', (req, res) => {
    const { filename } = req.params;
    const templateName = filename.replace('.png', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Generate SVG placeholder
    const svg = `
      <svg width="400" height="225" xmlns="http://www.w3.org/2000/svg">
        <rect width="400" height="225" fill="#f3f4f6"/>
        <rect x="20" y="20" width="360" height="185" fill="white" rx="8"/>
        <circle cx="200" cy="90" r="30" fill="#e5e7eb"/>
        <rect x="150" y="135" width="100" height="10" fill="#d1d5db" rx="5"/>
        <rect x="130" y="155" width="140" height="8" fill="#e5e7eb" rx="4"/>
        <text x="200" y="200" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">${templateName}</text>
      </svg>
    `;
    
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    res.send(svg);
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get('/api/dashboard/recent-projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projects = await storage.getUserProjects(userId);
      // Return only the 5 most recent projects
      res.json(projects.slice(0, 5));
    } catch (error) {
      console.error("Error fetching recent projects:", error);
      res.status(500).json({ message: "Failed to fetch recent projects" });
    }
  });

  app.get('/api/dashboard/recent-activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const activities = await storage.getUserActivities(userId, 10);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  // PDF export route for decks
  app.get('/api/decks/pdf/:fileName', async (req, res) => {
    try {
      const fileName = req.params.fileName;
      console.log(`PDF request for: ${fileName}`);
      
      // Check if PDF exists in cache
      (global as any).pdfCache = (global as any).pdfCache || new Map();
      let pdfBuffer: any = (global as any).pdfCache.get(fileName);
      
      if (pdfBuffer) {
        // Normalize to Buffer if it's Uint8Array
        if (pdfBuffer && !(Buffer.isBuffer(pdfBuffer))) {
          pdfBuffer = Buffer.from(pdfBuffer);
        }

        // Validate PDF buffer
        if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
          console.error(`Invalid PDF buffer for: ${fileName}`);
          return res.status(500).json({ message: "Invalid PDF file" });
        }
        
        // Check if buffer starts with PDF header
        const pdfHeader = pdfBuffer.slice(0, 4);
        if (pdfHeader.toString() !== '%PDF') {
          console.error(`Corrupted PDF file (invalid header): ${fileName}`);
          return res.status(500).json({ message: "Corrupted PDF file" });
        }
        
        console.log(`Serving valid PDF: ${fileName} (${pdfBuffer.length} bytes)`);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
      } else {
        console.log(`PDF not found in cache: ${fileName}`);
        const availablePdfs = Array.from(((global as any).pdfCache || new Map()).keys());
        console.log('Available PDFs:', availablePdfs);
        
        // PDF not found, return error
        res.status(404).json({ 
          message: "PDF not found. Please regenerate the deck to create a new PDF." 
        });
      }
    } catch (error) {
      console.error("Error serving PDF:", error);
      res.status(500).json({ message: "Failed to serve PDF" });
    }
  });

  // Object Storage routes
  // Public must be registered BEFORE the authenticated catch-all route below
  app.get("/objects/public/:objectPath(*)", async (req: any, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const filePath = `public/${req.params.objectPath}`;
      await objectStorageService.downloadObject(filePath, res);
    } catch (error) {
      console.error("Error downloading public object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
    const objectStorageService = new ObjectStorageService();
    try {
      // For Supabase, we'll use the file path directly
      const filePath = req.params.objectPath;
      await objectStorageService.downloadObject(filePath, res);
    } catch (error) {
      console.error("Error downloading object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const fileName = `${randomUUID()}-${Date.now()}`;
      const uploadURL = await objectStorageService.getSignedUploadURL(fileName, 'application/octet-stream');
      const publicPath = `public/${fileName}`;
      const publicUrl = objectStorageService.getPublicUrl(publicPath);
      res.json({ uploadURL, fileName, publicPath, publicUrl });
    } catch (error) {
      console.error("Error creating upload URL:", error);
      res.status(500).json({ error: "Failed to create upload URL" });
    }
  });

  app.put("/api/business-documents", isAuthenticated, async (req: any, res) => {
    if (!req.body.documentURL) {
      return res.status(400).json({ error: "documentURL is required" });
    }

    const userId = req.user.id;

    try {
      // For Supabase, we'll store the file path directly
      // The documentURL should be the file path in Supabase Storage
      const objectPath = req.body.documentURL;
      
      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting document path:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Project routes
  app.get('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projects = await storage.getUserProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post('/api/projects', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projectData = insertProjectSchema.parse({
        ...req.body,
        userId
      });

      const project = await storage.createProject(projectData);

      // Log activity
      await storage.logActivity({
        userId,
        projectId: project.id,
        action: 'project_created',
        description: `Created new project: ${project.name}`,
        metadata: { projectId: project.id }
      });

      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(400).json({ message: "Failed to create project" });
    }
  });

  app.get('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || project.userId !== req.user.id) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Sanitize business profile to handle any existing nested objects
      if (project.businessProfile) {
        project.businessProfile = sanitizeBusinessProfile(project.businessProfile);
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.put('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || project.userId !== req.user.id) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Validate the update data using the schema
      const updateData = insertProjectSchema.partial().parse(req.body);
      
      const updatedProject = await storage.updateProject(req.params.id, updateData);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      if (error instanceof Error && error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data provided", details: error.message });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || project.userId !== req.user.id) {
        return res.status(404).json({ message: "Project not found" });
      }

      await storage.deleteProject(req.params.id);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // AI Business Analysis route
  app.post('/api/projects/:id/analyze', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { documents } = req.body;
      const project = await storage.getProject(req.params.id);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      console.log(`Starting analysis for project: ${project.name}`);
      if (documents && documents.length > 0) {
        console.log(`Processing ${documents.length} uploaded documents`);
      }

      let websiteContent = '';
      let crawledData = null;
      
      // Crawl website if URL provided
      if (project.websiteUrl) {
        try {
          const crawler = new WebsiteCrawler();
          crawledData = await crawler.crawlWebsite(project.websiteUrl);
          if (crawledData) {
            websiteContent = crawledData.content;
          }
        } catch (error) {
          console.warn("Website crawling failed:", error);
          // Continue without website content
        }
      }

      // Enhanced comprehensive business analysis with document context
      const projectWithDocuments = {
        ...project,
        uploadedDocuments: documents || [],
        hasDocuments: Boolean(documents && documents.length > 0)
      };
      
      const businessProfile = await analyzeProjectWithEnhancedResearch(projectWithDocuments);

      // Update project with business profile
      const updatedProject = await storage.updateProject(req.params.id, {
        businessProfile: {
          ...businessProfile,
          processedDocuments: documents || [],
          analysisTimestamp: new Date().toISOString()
        },
        status: 'discovery'
      });

      // Log activity
      await storage.logActivity({
        userId,
        projectId: project.id,
        action: 'business_analyzed', 
        description: `Enhanced business research completed for ${project.name}${documents && documents.length > 0 ? ` with ${documents.length} documents` : ''}`,
        metadata: { projectId: project.id, documentCount: documents?.length || 0 }
      });

      res.json({
        project: updatedProject,
        businessProfile: updatedProject.businessProfile
      });
    } catch (error) {
      console.error("Error analyzing business:", error);
      res.status(500).json({ message: "Failed to analyze business data" });
    }
  });

  // Update business profile
  app.put('/api/projects/:id/business-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const project = await storage.getProject(req.params.id);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Update the business profile with the new data
      const updatedBusinessProfile = {
        ...(project.businessProfile || {}),
        ...req.body
      };

      // Update project
      const updatedProject = await storage.updateProject(req.params.id, {
        businessProfile: updatedBusinessProfile
      });

      // Log activity
      await storage.logActivity({
        userId,
        projectId: project.id,
        action: "business_profile_updated",
        description: `Updated business profile for: ${project.name}`,
        metadata: { projectId: project.id }
      });

      res.json({ businessProfile: updatedBusinessProfile });
    } catch (error) {
      console.error("Error updating business profile:", error);
      res.status(500).json({ message: "Failed to update business profile" });
    }
  });

  // Process uploaded logo route
  app.post('/api/projects/:id/process-logo', isAuthenticated, async (req: any, res) => {
    try {
      const { logoUrl } = req.body;
      
      if (!logoUrl) {
        return res.status(400).json({ error: "Logo URL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(logoUrl);
      
      // Set public ACL for logo
      if (objectPath.startsWith('/objects/')) {
        await objectStorageService.trySetObjectEntityAclPolicy(logoUrl, {
          owner: req.user?.claims?.sub,
          visibility: "public" as const
        });
      }
      
      res.json({ objectPath });
    } catch (error) {
      console.error("Error processing logo:", error);
      res.status(500).json({ error: "Failed to process logo" });
    }
  });

  // Brand Kit routes
  app.post('/api/projects/:id/brand-kit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const project = await storage.getProject(req.params.id);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get business profile to extract website design elements
      const businessProfile = project.businessProfile || {};
      
      console.log('Brand kit generation - business profile:', {
        hasBusinessProfile: !!businessProfile,
        hasWebsiteContent: !!(businessProfile as any)?.websiteContent,
        hasDesignElements: !!(businessProfile as any)?.websiteContent?.designElements,
        colors: (businessProfile as any)?.websiteContent?.designElements?.colors || [],
        fonts: (businessProfile as any)?.websiteContent?.designElements?.fonts || [],
        logoUrls: (businessProfile as any)?.websiteContent?.designElements?.logoUrls || [],
        keyImages: (businessProfile as any)?.websiteContent?.designElements?.keyImages || []
      });
      
      // Generate brand kit suggestions using website design elements
      const suggestions = generateBrandKitSuggestions(businessProfile);

      // Get the first extracted logo URL if available
      const extractedLogoUrl = (businessProfile as any)?.websiteContent?.designElements?.logoUrls?.[0] || null;
      
      console.log('Logo URL for brand kit:', {
        requestedLogoUrl: req.body.logoUrl,
        extractedLogoUrl: extractedLogoUrl,
        finalLogoUrl: req.body.logoUrl || extractedLogoUrl
      });
      
      const brandKitData = insertBrandKitSchema.parse({
        name: req.body.name || `${project.name} Brand Kit`,
        primaryColor: req.body.primaryColor || suggestions.primaryColor,
        secondaryColor: req.body.secondaryColor || suggestions.secondaryColor,
        accentColor: req.body.accentColor || suggestions.accentColor,
        fontFamily: req.body.fontFamily || suggestions.fontFamily,
        logoUrl: req.body.logoUrl || extractedLogoUrl,
        projectId: req.params.id
      });

      const brandKit = await storage.createBrandKit(brandKitData);
      
      // Update project status
      await storage.updateProject(req.params.id, { status: 'brand_kit' });

      // Log activity
      await storage.logActivity({
        userId,
        projectId: project.id,
        action: 'brand_kit_created',
        description: `Brand kit created for ${project.name}${suggestions.reasoning ? ` - ${suggestions.reasoning}` : ''}`,
        metadata: { brandKitId: brandKit.id, extractedFromWebsite: !!(businessProfile as any)?.websiteContent?.designElements }
      });

      // Extract logo information for response
      const logoInfo = extractBrandLogos(businessProfile);
      
      res.json({
        ...brandKit,
        suggestions: {
          reasoning: suggestions.reasoning,
          extractedElements: (businessProfile as any)?.websiteContent?.designElements || null,
          logoAnalysis: logoInfo
        }
      });
    } catch (error) {
      console.error("Error creating brand kit:", error);
      res.status(400).json({ message: "Failed to create brand kit" });
    }
  });

  app.get('/api/projects/:id/brand-kits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const project = await storage.getProject(req.params.id);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const brandKits = await storage.getProjectBrandKits(req.params.id);
      res.json(brandKits);
    } catch (error) {
      console.error("Error fetching brand kits:", error);
      res.status(500).json({ message: "Failed to fetch brand kits" });
    }
  });

  // AI Brand Analysis from Website
  app.post('/api/projects/:id/analyze-brand', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const project = await storage.getProject(req.params.id);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!project.websiteUrl) {
        return res.status(400).json({ message: "Project must have a website URL for brand analysis" });
      }

      console.log(`Starting AI brand analysis for: ${project.name}`);
      const brandAnalyzer = new BrandAnalyzer();
      const brandExtraction = await brandAnalyzer.extractBrandFromWebsite(project.websiteUrl);
      
      console.log('Brand extraction results:', {
        colors: brandExtraction.colors,
        fonts: brandExtraction.typography,
        logo: brandExtraction.logo,
        logoUrl: brandExtraction.logo.logoUrl
      });
      
      // Create brand kit from extracted data
      const brandKitData = insertBrandKitSchema.parse({
        name: `AI-Generated Brand Kit for ${project.name}`,
        primaryColor: brandExtraction.colors.primary,
        secondaryColor: brandExtraction.colors.secondary,
        accentColor: brandExtraction.colors.accent,
        fontFamily: brandExtraction.typography.primaryFont,
        logoUrl: brandExtraction.logo.logoUrl || null,
        projectId: req.params.id
      });

      const brandKit = await storage.createBrandKit(brandKitData);
      
      // Update the business profile with extracted website design elements
      const currentBusinessProfile = project.businessProfile || {};
      const updatedBusinessProfile = {
        ...currentBusinessProfile,
        websiteContent: {
          ...(currentBusinessProfile as any)?.websiteContent,
          designElements: {
            colors: brandExtraction.colors.brandColors || [],
            fonts: brandExtraction.typography.fontFamilies || [],
            logoUrls: brandExtraction.logo.logoUrl ? [brandExtraction.logo.logoUrl] : [],
            keyImages: brandExtraction.logo.logoUrl ? [brandExtraction.logo.logoUrl] : []
          }
        }
      };
      
      // Update project with enhanced business profile
      await storage.updateProject(req.params.id, { 
        businessProfile: updatedBusinessProfile,
        status: project.status === 'discovery' ? 'brand_kit' : project.status
      });
      
      console.log('Updated business profile with website elements:', {
        colors: updatedBusinessProfile.websiteContent.designElements.colors,
        fonts: updatedBusinessProfile.websiteContent.designElements.fonts,
        logoUrls: updatedBusinessProfile.websiteContent.designElements.logoUrls,
        keyImages: updatedBusinessProfile.websiteContent.designElements.keyImages
      });

      // Log activity
      await storage.logActivity({
        userId,
        projectId: project.id,
        action: 'ai_brand_analysis',
        description: `AI brand analysis completed for ${project.name} from website`,
        metadata: { 
          brandKitId: brandKit.id, 
          websiteUrl: project.websiteUrl,
          colorsExtracted: brandExtraction.colors.brandColors.length,
          logoFound: !!brandExtraction.logo.logoUrl
        }
      });

      res.json({
        ...brandKit,
        analysis: brandExtraction,
        message: "Brand analysis completed successfully"
      });
    } catch (error) {
      console.error("Error analyzing brand from website:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: `Brand analysis failed: ${errorMessage}` });
    }
  });

  // Deck generation route
  app.post('/api/projects/:id/generate-deck', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const project = await storage.getProject(req.params.id);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!project.businessProfile) {
        return res.status(400).json({ message: "Business analysis must be completed first" });
      }

      // Get brand kit - either from request or get the project's default brand kit
      let brandKit = null;
      if (req.body.brandKitId) {
        brandKit = await storage.getBrandKit(req.body.brandKitId);
      } else {
        // Get project's brand kits and use the first one
        const brandKits = await storage.getProjectBrandKits(req.params.id);
        if (brandKits && brandKits.length > 0) {
          brandKit = brandKits[0];
        }
      }

      // Generate slides using AI with latest business profile and brand kit
      const brandingInfo = brandKit ? {
        primaryColor: brandKit.primaryColor || undefined,
        secondaryColor: brandKit.secondaryColor || undefined,
        accentColor: brandKit.accentColor || undefined,
        fontFamily: brandKit.fontFamily || undefined,
        logoUrl: brandKit.logoUrl || undefined,
        brandAssets: brandKit.brandAssets || undefined
      } : undefined;

      const slides = await generatePitchDeckSlides({
        businessProfile: project.businessProfile as any,
        brandingInfo,
        templateManager // Pass template manager for template-based generation
      });

      const deckData = insertDeckSchema.parse({
        projectId: req.params.id,
        brandKitId: brandKit?.id || null,
        title: `${project.name} Pitch Deck`,
        slides,
        status: 'generated'
      });

      const deck = await storage.createDeck(deckData);
      
      // Note: PDF generation is now handled separately when user clicks Export PDF button
      // This improves performance and user experience by not blocking deck generation

      // Update project status
      await storage.updateProject(req.params.id, { status: 'deck_ready' });

      // Log activity
      await storage.logActivity({
        userId,
        projectId: project.id,
        action: 'deck_generated',
        description: `Pitch deck generated for ${project.name}`,
        metadata: { deckId: deck.id }
      });

      res.json(deck);
    } catch (error) {
      console.error("Error generating deck:", error);
      res.status(500).json({ message: "Failed to generate pitch deck" });
    }
  });

  // Deck routes
  app.get('/api/projects/:id/decks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const project = await storage.getProject(req.params.id);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const decks = await storage.getProjectDecks(req.params.id);
      res.json(decks);
    } catch (error) {
      console.error("Error fetching decks:", error);
      res.status(500).json({ message: "Failed to fetch decks" });
    }
  });

  // Reorder slides in deck (MUST come before the general slide update route)
  app.put(`/api/decks/:deckId/slides/reorder`, isAuthenticated, async (req, res) => {
    console.log('=== REORDER SLIDES ENDPOINT HIT ===');
    console.log('Deck ID:', req.params.deckId);
    console.log('Request body:', req.body);
    try {
      const userId = (req as any).user.id;
      const deckId = req.params.deckId;
      const { slideOrders } = req.body;
      
      // Get the deck first to verify ownership
      const deck = await storage.getDeck(deckId);
      if (!deck) {
        return res.status(404).json({ error: 'Deck not found' });
      }
      
      // Get the project to verify user ownership
      const project = await storage.getProject(deck.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to edit this deck' });
      }

      // Get current slides
      const slides = Array.isArray(deck.slides) ? [...deck.slides] : [];
      
      // Create a map of slideId to new order for quick lookup
      const orderMap = new Map();
      slideOrders.forEach(({ slideId, order }: { slideId: string; order: number }) => {
        orderMap.set(slideId, order);
      });
      
      // Update the order property for each slide
      const updatedSlides = slides.map(slide => {
        const newOrder = orderMap.get(slide.id);
        if (newOrder !== undefined) {
          return { ...slide, order: newOrder };
        }
        return slide;
      });
      
      // Sort slides by the new order
      updatedSlides.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      // Update the deck with the reordered slides
      await storage.updateDeck(deckId, { slides: updatedSlides });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error reordering slides:', error);
      res.status(500).json({ error: 'Failed to reorder slides' });
    }
  });

  // Update slide content and styling
  app.put('/api/decks/:deckId/slides/:slideId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { deckId, slideId } = req.params;
      const updates = req.body;
      
      // Get the deck first to verify ownership
      const deck = await storage.getDeck(deckId);
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }
      
      // Get the project to verify user ownership
      const project = await storage.getProject(deck.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to edit this deck" });
      }
      
      // Find and update the specific slide
      const slides = Array.isArray(deck.slides) ? deck.slides : [];
      const slideIndex = slides.findIndex(slide => slide.id === slideId);
      
      if (slideIndex === -1) {
        return res.status(404).json({ message: "Slide not found" });
      }
      
      // Update the slide with the new data - only allow specific properties for security
      const { title, content, layout, styling, backgroundColor, textColor, positionedElements } = updates;
      
      // Log what we're updating for debugging
      console.log('=== SERVER SLIDE UPDATE DEBUG ===');
      console.log('Full updates object received:', JSON.stringify(updates, null, 2));
      console.log('Extracted positionedElements:', positionedElements);
      console.log('Extracted positionedElements type:', typeof positionedElements);
      console.log('Extracted positionedElements keys:', positionedElements ? Object.keys(positionedElements) : 'undefined');
      
      console.log('Updating slide with properties:', {
        title: title !== undefined,
        content: content !== undefined,
        layout: layout !== undefined,
        styling: styling !== undefined,
        backgroundColor: backgroundColor !== undefined,
        textColor: textColor !== undefined,
        positionedElements: positionedElements !== undefined
      });
      
      if (backgroundColor !== undefined) {
        console.log('Background color update:', backgroundColor);
      }
      if (textColor !== undefined) {
        console.log('Text color update:', textColor);
      }
      if (positionedElements !== undefined) {
        console.log('Positioned elements update:', positionedElements);
      }
      
      slides[slideIndex] = { 
        ...slides[slideIndex], 
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(layout !== undefined && { layout }),
        ...(styling !== undefined && { styling }),
        ...(backgroundColor !== undefined && { backgroundColor }),
        ...(textColor !== undefined && { textColor }),
        ...(positionedElements !== undefined && { positionedElements })
      };
      
      // Log the final slide object for debugging
      console.log('=== FINAL SLIDE OBJECT DEBUG ===');
      console.log('Final slide object to be saved:', JSON.stringify(slides[slideIndex], null, 2));
      console.log('Final slide positionedElements:', slides[slideIndex].positionedElements);
      console.log('Final slide positionedElements type:', typeof slides[slideIndex].positionedElements);
      console.log('Final slide positionedElements keys:', slides[slideIndex].positionedElements ? Object.keys(slides[slideIndex].positionedElements) : 'undefined');
      
      // Update the deck with the modified slides
      const updatedDeck = await storage.updateDeck(deckId, { slides });
      
      // Log the updated deck for debugging
      console.log('=== UPDATED DECK DEBUG ===');
      console.log('Updated deck slides count:', Array.isArray(updatedDeck.slides) ? updatedDeck.slides.length : 'not an array');
      if (Array.isArray(updatedDeck.slides) && updatedDeck.slides[slideIndex]) {
        console.log('Updated slide positionedElements:', updatedDeck.slides[slideIndex].positionedElements);
        console.log('Updated slide positionedElements type:', typeof updatedDeck.slides[slideIndex].positionedElements);
        console.log('Updated slide positionedElements keys:', updatedDeck.slides[slideIndex].positionedElements ? Object.keys(updatedDeck.slides[slideIndex].positionedElements) : 'undefined');
      } else {
        console.log('Updated slide not found or slides is not an array');
      }
      
      // Log activity with rich text formatting info
      const activityDescription = `Updated slide "${updates.title || slides[slideIndex].title}" in deck "${deck.title}"`;
      const hasRichContent = updates.content && (
        updates.content.titleHtml || 
        updates.content.descriptionHtml || 
        updates.content.bulletPointsHtml || 
        updates.content.callToActionHtml
      );
      
      await storage.logActivity({
        userId,
        projectId: project.id,
        action: 'slide_updated',
        description: hasRichContent ? `${activityDescription} with rich text formatting` : activityDescription,
        metadata: { 
          deckId, 
          slideId, 
          slideTitle: updates.title || slides[slideIndex].title,
          hasRichFormatting: Boolean(hasRichContent)
        }
      });
      
      res.json({ success: true, deck: updatedDeck });
    } catch (error) {
      console.error("Error updating slide:", error);
      res.status(500).json({ message: "Failed to update slide" });
    }
  });

  // Generate PDF for a deck (called when Export PDF button is clicked)
  app.post('/api/decks/:id/generate-pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const deckId = req.params.id;
      
      const deck = await storage.getDeck(deckId);
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }

      const project = await storage.getProject(deck.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to generate PDF for this deck" });
      }

      // Get brand kit info for PDF generation
      const brandKit = deck.brandKitId ? await storage.getBrandKit(deck.brandKitId) : null;
      const brandingInfo = brandKit ? {
        primaryColor: brandKit.primaryColor || undefined,
        secondaryColor: brandKit.secondaryColor || undefined, // Fixed: was using accentColor
        accentColor: brandKit.accentColor || undefined,
        fontFamily: brandKit.fontFamily || undefined,
        logoUrl: brandKit.logoUrl || undefined,
        brandAssets: brandKit.brandAssets || undefined
      } : undefined;

      // Generate PDF with enhanced styling data
      const pdfUrl = await generatePitchDeckPDF({
        slides: deck.slides as any,
        title: deck.title,
        branding: brandingInfo,
        projectName: project.name
      });

      // Update deck with PDF URL
      await storage.updateDeck(deckId, { pdfUrl });

      console.log(`PDF generated successfully for deck ${deckId}: ${pdfUrl}`);

      res.json({ success: true, pdfUrl });
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Add PDF regeneration endpoint
  app.post('/api/decks/:id/regenerate-pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const deckId = req.params.id;
      
      const deck = await storage.getDeck(deckId);
      if (!deck) {
        return res.status(403).json({ message: "Not authorized to regenerate PDF for this deck" });
      }

      const project = await storage.getProject(deck.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to regenerate PDF for this deck" });
      }

      // Get brand kit info for PDF generation
      const brandKit = deck.brandKitId ? await storage.getBrandKit(deck.brandKitId) : null;
      const brandingInfo = brandKit ? {
        primaryColor: brandKit.primaryColor || undefined,
        secondaryColor: brandKit.secondaryColor || undefined, // Fixed: was incorrectly using accentColor
        accentColor: brandKit.accentColor || undefined,
        fontFamily: brandKit.fontFamily || undefined,
        logoUrl: brandKit.logoUrl || undefined
      } : undefined;

      // Generate new PDF with enhanced styling data
      const pdfUrl = await generatePitchDeckPDF({
        slides: deck.slides as any,
        title: deck.title,
        branding: brandingInfo,
        projectName: project.name
      });

      // Update deck with new PDF URL
      await storage.updateDeck(deckId, { pdfUrl });

      console.log(`PDF regenerated successfully for deck ${deckId}: ${pdfUrl}`);

      res.json({ success: true, pdfUrl });
    } catch (error) {
      console.error("Error regenerating PDF:", error);
      res.status(500).json({ message: "Failed to regenerate PDF" });
    }
  });

  app.get('/api/decks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const deck = await storage.getDeck(req.params.id);
      if (!deck) {
        return res.status(404).json({ message: "Deck not found" });
      }

      // Verify user owns this deck through project
      const project = await storage.getProject(deck.projectId);
      if (!project || project.userId !== req.user.id) {
        return res.status(404).json({ message: "Deck not found" });
      }

      res.json(deck);
    } catch (error) {
      console.error("Error fetching deck:", error);
      res.status(500).json({ message: "Failed to fetch deck" });
    }
  });

  // Update brand kit route
  app.put('/api/projects/:id/brand-kits/:brandKitId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const project = await storage.getProject(req.params.id);
      
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const brandKit = await storage.getBrandKit(req.params.brandKitId);
      if (!brandKit || brandKit.projectId !== req.params.id) {
        return res.status(404).json({ message: "Brand kit not found" });
      }

      const updateData = {
        name: req.body.name,
        primaryColor: req.body.primaryColor,
        secondaryColor: req.body.secondaryColor,
        accentColor: req.body.accentColor,
        fontFamily: req.body.fontFamily,
        logoUrl: req.body.logoUrl,
        brandAssets: req.body.brandAssets
      };
      
      console.log('Updating brand kit with data:', updateData);
      console.log('brandAssets being sent:', req.body.brandAssets);

      const updatedBrandKit = await storage.updateBrandKit(req.params.brandKitId, updateData);
      
      console.log('Brand kit updated successfully');
      console.log('Updated brand kit data:', updatedBrandKit);
      console.log('brandAssets after update:', updatedBrandKit.brandAssets);

      // Log activity
      await storage.logActivity({
        userId,
        projectId: project.id,
        action: 'brand_kit_updated',
        description: `Brand kit updated for ${project.name}`,
        metadata: { brandKitId: updatedBrandKit.id }
      });

      res.json(updatedBrandKit);
    } catch (error) {
      console.error("Error updating brand kit:", error);
      res.status(500).json({ message: "Failed to update brand kit" });
    }
  });

  // CRM routes
  app.get('/api/crm/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contacts = await storage.getUserContacts(userId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post('/api/crm/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contactData = insertCrmContactSchema.parse({
        ...req.body,
        userId
      });

      const contact = await storage.createContact(contactData);
      res.json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(400).json({ message: "Failed to create contact" });
    }
  });

  app.post('/api/crm/contacts/import', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { csvData, contacts } = req.body;
      
      let contactsToImport = [];
      
      if (csvData) {
        // Parse CSV data
        const lines = csvData.trim().split('\n');
        if (lines.length < 2) {
          return res.status(400).json({ message: "CSV data must have at least a header row and one data row" });
        }
        
        const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
        const requiredHeaders = ['firstname', 'lastname', 'email'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        
        if (missingHeaders.length > 0) {
          return res.status(400).json({ 
            message: `Missing required headers: ${missingHeaders.join(', ')}` 
          });
        }
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v: string) => v.trim().replace(/^"|"$/g, ''));
          const contact: any = { userId };
          
          headers.forEach((header: string, index: number) => {
            const value = values[index] || '';
            switch (header) {
              case 'firstname':
                contact.firstName = value;
                break;
              case 'lastname':
                contact.lastName = value;
                break;
              case 'email':
                contact.email = value;
                break;
              case 'company':
                contact.company = value;
                break;
              case 'title':
                contact.title = value;
                break;
              case 'phone':
                contact.phone = value;
                break;
              case 'notes':
                contact.notes = value;
                break;
              case 'tags':
                contact.tags = value ? value.split(';').map((t: string) => t.trim()).filter((t: string) => t) : [];
                break;
            }
          });
          
          if (contact.firstName && contact.lastName && contact.email) {
            contactsToImport.push(contact);
          }
        }
      } else if (contacts) {
        contactsToImport = contacts.map((contact: any) => ({ ...contact, userId }));
      } else {
        return res.status(400).json({ message: "Either csvData or contacts array is required" });
      }
      
      let imported = 0;
      const errors = [];
      
      for (const contactData of contactsToImport) {
        try {
          const validatedData = insertCrmContactSchema.parse(contactData);
          await storage.createContact(validatedData);
          imported++;
        } catch (error) {
          console.error("Error importing contact:", error);
          errors.push(`${contactData.firstName} ${contactData.lastName}: ${(error as Error).message}`);
        }
      }
      
      // Log activity
      await storage.logActivity({
        userId,
        action: "contacts_imported",
        description: `Imported ${imported} contacts`,
        metadata: { imported, errors: errors.length }
      });
      
      res.json({ 
        imported, 
        errors: errors.length, 
        errorDetails: errors.slice(0, 10) // Limit error details
      });
    } catch (error) {
      console.error("Error importing contacts:", error);
      res.status(500).json({ message: "Failed to import contacts" });
    }
  });

  app.put('/api/crm/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contact = await storage.getContact(req.params.id);
      if (!contact || contact.userId !== req.user.id) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const updatedContact = await storage.updateContact(req.params.id, req.body);
      res.json(updatedContact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete('/api/crm/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contact = await storage.getContact(req.params.id);
      if (!contact || contact.userId !== req.user.id) {
        return res.status(404).json({ message: "Contact not found" });
      }

      await storage.deleteContact(req.params.id);
      res.json({ message: "Contact deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Object storage routes for file uploads
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = (req.user as any)?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/project-files", isAuthenticated, async (req, res) => {
    if (!req.body.fileURL || !req.body.projectId) {
      return res.status(400).json({ error: "fileURL and projectId are required" });
    }

    const userId = (req.user as any)?.claims?.sub;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.fileURL,
        {
          owner: userId,
          visibility: "private", // Project files are private
        },
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting project file:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // CRM Contact routes
  app.get('/api/crm/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contacts = await storage.getUserContacts(userId);
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get('/api/crm/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const contact = await storage.getContact(id);
      if (!contact || contact.userId !== userId) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });

  app.post('/api/crm/contacts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contactData = insertCrmContactSchema.parse({
        ...req.body,
        userId,
      });
      const contact = await storage.createContact(contactData);
      
      // Log activity
      await storage.logActivity({
        userId,
        action: "contact_created",
        description: `Added new contact: ${contact.firstName} ${contact.lastName}`,
        metadata: { contactId: contact.id }
      });
      
      res.json(contact);
    } catch (error) {
      console.error("Error creating contact:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.put('/api/crm/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Verify contact belongs to user
      const contact = await storage.getContact(id);
      if (!contact || contact.userId !== userId) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      const updatedContact = await storage.updateContact(id, req.body);
      res.json(updatedContact);
    } catch (error) {
      console.error("Error updating contact:", error);
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete('/api/crm/contacts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Verify contact belongs to user
      const contact = await storage.getContact(id);
      if (!contact || contact.userId !== userId) {
        return res.status(404).json({ message: "Contact not found" });
      }
      
      await storage.deleteContact(id);
      
      // Log activity
      await storage.logActivity({
        userId,
        action: "contact_deleted",
        description: `Deleted contact: ${contact.firstName} ${contact.lastName}`,
        metadata: { contactId: contact.id }
      });
      
      res.json({ message: "Contact deleted successfully" });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Audience routes
  app.get('/api/crm/audiences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const audiences = await storage.getUserAudiences(userId);
      res.json(audiences);
    } catch (error) {
      console.error("Error fetching audiences:", error);
      res.status(500).json({ message: "Failed to fetch audiences" });
    }
  });

  app.get('/api/crm/audiences/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const audience = await storage.getAudience(id);
      if (!audience || audience.userId !== userId) {
        return res.status(404).json({ message: "Audience not found" });
      }
      
      res.json(audience);
    } catch (error) {
      console.error("Error fetching audience:", error);
      res.status(500).json({ message: "Failed to fetch audience" });
    }
  });

  app.post('/api/crm/audiences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      let contactIds: string[] = [];
      
      // If specific contact IDs are provided (selected contacts), use those
      if (req.body.filterCriteria?.contactIds && Array.isArray(req.body.filterCriteria.contactIds)) {
        contactIds = req.body.filterCriteria.contactIds;
      } else {
        // Otherwise, get contacts based on filter criteria
        const filteredContacts = await storage.getContactsByFilter(userId, req.body.filterCriteria);
        contactIds = filteredContacts.map(contact => contact.id);
      }
      
      const audienceData = insertAudienceSchema.parse({
        ...req.body,
        userId,
        contactIds,
      });
      
      const audience = await storage.createAudience(audienceData);
      
      // Log activity
      await storage.logActivity({
        userId,
        action: "audience_created",
        description: `Created audience: ${audience.name} with ${contactIds.length} contacts`,
        metadata: { audienceId: audience.id, contactCount: contactIds.length }
      });
      
      res.json(audience);
    } catch (error) {
      console.error("Error creating audience:", error);
      res.status(500).json({ message: "Failed to create audience" });
    }
  });

  app.put('/api/crm/audiences/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Verify audience belongs to user
      const audience = await storage.getAudience(id);
      if (!audience || audience.userId !== userId) {
        return res.status(404).json({ message: "Audience not found" });
      }
      
      let contactIds: string[] = [];
      
      // Frontend sends selected contact IDs directly as filterCriteria array
      if (req.body.filterCriteria && Array.isArray(req.body.filterCriteria)) {
        // This is the case when editing audience - frontend sends selected contact IDs as array
        contactIds = req.body.filterCriteria;
      } else if (req.body.filterCriteria?.contactIds && Array.isArray(req.body.filterCriteria.contactIds)) {
        // This is for compatibility with other potential filter structures
        contactIds = req.body.filterCriteria.contactIds;
      } else if (req.body.filterCriteria && typeof req.body.filterCriteria === 'object') {
        // Handle filter criteria based on tags, company, etc.
        const filteredContacts = await storage.getContactsByFilter(userId, req.body.filterCriteria);
        contactIds = filteredContacts.map(contact => contact.id);
      }
      
      const updateData = {
        ...req.body,
        contactIds,
        filterCriteria: req.body.filterCriteria
      };
      
      const updatedAudience = await storage.updateAudience(id, updateData);
      
      // Log activity
      await storage.logActivity({
        userId,
        action: "audience_updated",
        description: `Updated audience: ${updatedAudience.name} with ${updateData.contactIds?.length || 0} contacts`,
        metadata: { audienceId: updatedAudience.id, contactCount: updateData.contactIds?.length || 0 }
      });
      
      res.json(updatedAudience);
    } catch (error) {
      console.error("Error updating audience:", error);
      res.status(500).json({ message: "Failed to update audience" });
    }
  });

  app.delete('/api/crm/audiences/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Verify audience belongs to user
      const audience = await storage.getAudience(id);
      if (!audience || audience.userId !== userId) {
        return res.status(404).json({ message: "Audience not found" });
      }
      
      await storage.deleteAudience(id);
      
      // Log activity
      await storage.logActivity({
        userId,
        action: "audience_deleted",
        description: `Deleted audience: ${audience.name}`,
        metadata: { audienceId: audience.id }
      });
      
      res.json({ message: "Audience deleted successfully" });
    } catch (error) {
      console.error("Error deleting audience:", error);
      res.status(500).json({ message: "Failed to delete audience" });
    }
  });

  // Contact filtering for audience creation
  app.post('/api/crm/contacts/filter', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const filteredContacts = await storage.getContactsByFilter(userId, req.body);
      res.json(filteredContacts);
    } catch (error) {
      console.error("Error filtering contacts:", error);
      res.status(500).json({ message: "Failed to filter contacts" });
    }
  });

  // Campaign routes
  app.get('/api/projects/:projectId/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      
      // Verify project belongs to user
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const campaigns = await storage.getProjectCampaigns(projectId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.get('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Verify user owns the project this campaign belongs to
      const project = await storage.getProject(campaign.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this campaign" });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error("Error fetching campaign:", error);
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  app.post('/api/projects/:projectId/campaigns', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      const { audienceId, ...campaignBody } = req.body;
      
      // Verify project belongs to user
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get the project's deck
      const decks = await storage.getProjectDecks(projectId);
      if (decks.length === 0) {
        return res.status(400).json({ message: "Project must have a deck before creating campaigns" });
      }
      
      // Verify audience belongs to user (if provided)
      let contactIds: string[] = [];
      if (audienceId) {
        const audience = await storage.getAudience(audienceId);
        if (!audience || audience.userId !== userId) {
          return res.status(404).json({ message: "Audience not found" });
        }
        contactIds = audience.contactIds || [];
      }
      
      const campaignData = insertCampaignSchema.parse({
        ...campaignBody,
        projectId,
        deckId: decks[0].id, // Use the latest deck
      });
      
      const campaign = await storage.createCampaign(campaignData);
      
      // Add campaign recipients if audience is selected
      if (contactIds.length > 0) {
        await storage.addCampaignRecipients(campaign.id, contactIds);
      }
      
      // Log activity
      await storage.logActivity({
        userId,
        projectId,
        action: "campaign_created",
        description: `Created campaign: ${campaign.name}${audienceId ? ` with ${contactIds.length} recipients` : ''}`,
        metadata: { 
          campaignId: campaign.id,
          audienceId,
          recipientCount: contactIds.length
        }
      });
      
      res.json({ ...campaign, recipientCount: contactIds.length });
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.put('/api/campaigns/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Verify user owns the project this campaign belongs to
      const project = await storage.getProject(campaign.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this campaign" });
      }
      
      const updatedCampaign = await storage.updateCampaign(id, req.body);
      
      // Log activity
      await storage.logActivity({
        userId,
        projectId: campaign.projectId,
        action: "campaign_updated",
        description: `Updated campaign: ${updatedCampaign.name}`,
        metadata: { campaignId: campaign.id }
      });
      
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.get('/api/campaigns/:id/stats', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Verify user owns the project this campaign belongs to
      const project = await storage.getProject(campaign.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this campaign" });
      }
      
      // Return campaign statistics
      res.json({
        sentCount: campaign.sentCount || 0,
        openCount: campaign.openCount || 0,
        clickCount: campaign.clickCount || 0,
        responseRate: (campaign.sentCount || 0) > 0 ? Math.round((campaign.clickCount || 0) / (campaign.sentCount || 1) * 100) : 0
      });
    } catch (error) {
      console.error("Error fetching campaign stats:", error);
      res.status(500).json({ message: "Failed to fetch campaign stats" });
    }
  });

  app.get('/api/projects/:projectId/analytics', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      
      // Verify project belongs to user
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const analytics = await storage.getProjectAnalytics(projectId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching project analytics:", error);
      res.status(500).json({ message: "Failed to fetch project analytics" });
    }
  });

  app.post('/api/projects/:projectId/ai-improve-text', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const { text, context } = req.body;
      const userId = req.user.id;
      
      console.log('=== AI IMPROVE TEXT REQUEST ===');
      console.log('Project ID:', projectId);
      console.log('Text:', text);
      console.log('Context:', context);
      console.log('User ID:', userId);
      
      // Verify project belongs to user
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        console.log('Project not found or unauthorized');
        return res.status(404).json({ message: "Project not found" });
      }
      
      console.log('Project found:', project.id);
      console.log('Business profile exists:', !!project.businessProfile);
      
      const { improveSlideText } = await import('./services/openai');
      const result = await improveSlideText({
        text,
        context,
        businessProfile: project.businessProfile
      });
      
      console.log('AI improvement result:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', Object.keys(result));
      
      // Ensure we return the result in the expected format
      res.json({ improvedText: result.improvedText });
    } catch (error) {
      console.error("Error improving text with AI:", error);
      res.status(500).json({ message: "Failed to improve text" });
    }
  });

  app.get('/api/campaigns/:id/recipients', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Verify user owns the project this campaign belongs to
      const project = await storage.getProject(campaign.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this campaign" });
      }
      
      const recipients = await storage.getCampaignRecipients(id);
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching campaign recipients:", error);
      res.status(500).json({ message: "Failed to fetch campaign recipients" });
    }
  });

  app.post('/api/campaigns/:id/send', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const campaign = await storage.getCampaign(id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Verify user owns the project this campaign belongs to
      const project = await storage.getProject(campaign.projectId);
      if (!project || project.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to send this campaign" });
      }
      
      // Get campaign recipients
      const recipients = await storage.getCampaignRecipients(id);
      
      if (recipients.length === 0) {
        return res.status(400).json({ message: "Campaign has no recipients. Please select an audience first." });
      }
      
      // Update campaign status and sent count
      await storage.updateCampaign(id, {
        status: 'sent',
        sentCount: recipients.length
      });
      
      // Update all recipients status to 'sent'
      for (const recipient of recipients) {
        await storage.updateRecipientStatus(id, recipient.contactId, 'sent');
      }
      
      // Log activity
      await storage.logActivity({
        userId,
        projectId: campaign.projectId,
        action: "campaign_sent",
        description: `Sent campaign: ${campaign.name} to ${recipients.length} recipients`,
        metadata: { campaignId: campaign.id, recipientCount: recipients.length }
      });
      
      res.json({ 
        success: true, 
        message: `Campaign sent to ${recipients.length} recipients`,
        sentCount: recipients.length
      });
    } catch (error) {
      console.error("Error sending campaign:", error);
      res.status(500).json({ message: "Failed to send campaign" });
    }
  });

  // Add new slide to deck
  app.post(`/api/decks/:deckId/slides`, isAuthenticated, async (req, res) => {
    try {
      const deckId = req.params.deckId;
      const slideData = req.body || {};
      
      const deck = await storage.getDeck(deckId);
      if (!deck) {
        return res.status(404).json({ error: 'Deck not found' });
      }

      const existingSlides = Array.isArray((deck as any).slides) ? [...(deck as any).slides] : [];
      const nextOrder = existingSlides.length > 0
        ? Math.max(...existingSlides.map((s: any) => s.order || 0)) + 1
        : 1;

      const newSlide = {
        id: slideData.id || `slide-${Date.now()}`,
        type: slideData.type || 'content',
        title: slideData.title || 'New Slide',
        content: slideData.content || { titles: ['New Slide'], descriptions: [''], bullets: [], logos: [] },
        order: slideData.order || nextOrder,
        backgroundColor: slideData.backgroundColor || (deck as any).slides?.[0]?.backgroundColor || '#FFFFFF',
        textColor: slideData.textColor || (deck as any).slides?.[0]?.textColor || '#333333',
        styling: slideData.styling || (deck as any).slides?.[0]?.styling || {
          fontFamily: 'Inter',
          fontSize: 'medium',
          titleFontSize: '3xl',
          descriptionFontSize: 'lg',
          bulletFontSize: 'base',
        },
        positionedElements: slideData.positionedElements || {},
        layout: slideData.layout || 'standard',
        visualElements: slideData.visualElements || [],
      };

      const updatedSlides = [...existingSlides, newSlide];

      await storage.updateDeck(deckId, { slides: updatedSlides });
      
      res.json(newSlide);
    } catch (error) {
      console.error('Error creating slide:', error);
      res.status(500).json({ error: 'Failed to create slide' });
    }
  });

  // Delete slide from deck
  app.delete(`/api/decks/:deckId/slides/:slideId`, isAuthenticated, async (req, res) => {
    try {
      const { deckId, slideId } = req.params;
      
      const deck = await storage.getDeck(deckId);
      if (!deck) {
        return res.status(404).json({ error: 'Deck not found' });
      }

      // Get the current slides array
      const currentSlides = Array.isArray(deck.slides) ? deck.slides : [];
      
      // Find and remove the slide with the specified ID
      const updatedSlides = currentSlides.filter((slide: any) => slide.id !== slideId);
      
      // Check if the slide was actually found and removed
      if (updatedSlides.length === currentSlides.length) {
        return res.status(404).json({ error: 'Slide not found' });
      }
      
      // Update the deck with the new slides array
      await storage.updateDeck(deckId, { slides: updatedSlides });
      
      console.log(`Slide ${slideId} deleted from deck ${deckId}. Slides: ${currentSlides.length} -> ${updatedSlides.length}`);
      
      res.json({ success: true, message: 'Slide deleted successfully' });
    } catch (error) {
      console.error('Error deleting slide:', error);
      res.status(500).json({ error: 'Failed to delete slide' });
    }
  });

  // ============================================================================
  // TEMPLATE ROUTES
  // ============================================================================

  // Get all templates for current user (with access control)
  app.get('/api/templates', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { category, tags, search } = req.query;
      
      const templates = await templateManager.getTemplatesForUser(userId, {
        category: category as string,
        tags: tags ? (tags as string).split(',') : undefined,
        searchTerm: search as string,
      });
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // Get single template by ID
  app.get('/api/templates/:templateId', isAuthenticated, async (req: any, res) => {
    try {
      const template = await templateManager.getTemplate(req.params.templateId);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      // Check access control
      const userTier = await subscriptionService.getUserTier(req.user.id);
      const isLocked = templateManager.isTemplateLocked(template, userTier);
      
      res.json({
        ...template,
        isLocked,
        requiresUpgrade: template.accessTier === 'premium' && userTier === 'free',
      });
    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({ error: 'Failed to fetch template' });
    }
  });

  // Get default template
  app.get('/api/templates/default/get', isAuthenticated, async (req: any, res) => {
    try {
      const template = await templateManager.getDefaultTemplate();
      res.json(template);
    } catch (error) {
      console.error('Error fetching default template:', error);
      res.status(500).json({ error: 'Failed to fetch default template' });
    }
  });

  // Apply template to create a new slide
  app.post('/api/decks/:deckId/slides/from-template', isAuthenticated, async (req: any, res) => {
    try {
      const { templateId, content, overrides } = req.body;
      const deckId = req.params.deckId;
      const userId = req.user.id;
      
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' });
      }
      
      const deck = await storage.getDeck(deckId);
      if (!deck) {
        return res.status(404).json({ error: 'Deck not found' });
      }
      
      // Get project for business profile
      const project = await storage.getProject(deck.projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get brand kit
      const brandKit = deck.brandKitId ? await storage.getBrandKit(deck.brandKitId) : null;
      
      // Get template information
      const template = await templateManager.getTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      // Helper to check if content is meaningful
      const hasContent = (obj: any): boolean => {
        if (!obj || typeof obj !== 'object') return false;
        return Object.values(obj).some(val => {
          if (Array.isArray(val)) return val.length > 0 && val.some(v => v && String(v).trim());
          return val !== null && val !== undefined && String(val).trim() !== '';
        });
      };
      
      // Check if template uses new layout.elements format (from design studio)
      const isVisualTemplate = template.layout?.elements && Array.isArray(template.layout.elements);
      
      // Generate AI content if no meaningful content provided AND not a visual template
      let slideContent = content;
      if (!hasContent(content) && !isVisualTemplate) {
        console.log('No meaningful content provided, generating AI content for new slide...');
        try {
          const aiContent = await openai.generateSlideContentForTemplate({
            templateCategory: template.category,
            templateName: template.name,
            businessProfile: project.businessProfile,
            existingContent: null
          });
          
          console.log('AI generated content for new slide:', aiContent);
          slideContent = aiContent;
        } catch (aiError) {
          console.error('Error generating AI content:', aiError);
          // Use template name as fallback
          slideContent = { title: template.name };
        }
      } else if (isVisualTemplate && !hasContent(content)) {
        // For visual templates, use placeholder content from template schema
        console.log('Visual template detected - using placeholder content from schema');
        slideContent = { title: template.name };
      }
      
      // Pass businessProfile via content for AI generation
      const contentWithProfile = {
        ...slideContent,
        _businessProfile: project.businessProfile // Hidden field for context
      };
      
      // Apply template
      const newSlide = await templateManager.applyTemplate(
        templateId,
        userId,
        contentWithProfile,
        brandKit,
        overrides
      );
      
      // Add to deck
      const existingSlides = Array.isArray(deck.slides) ? [...deck.slides] : [];
      const nextOrder = existingSlides.length > 0
        ? Math.max(...existingSlides.map((s: any) => s.order || 0)) + 1
        : 1;
      
      newSlide.order = nextOrder;
      const updatedSlides = [...existingSlides, newSlide];
      
      await storage.updateDeck(deckId, { slides: updatedSlides });
      
      res.json(newSlide);
    } catch (error: any) {
      console.error('Error applying template:', error);
      
      if (error.message.includes('premium subscription')) {
        return res.status(403).json({ 
          error: error.message,
          upgradeRequired: true 
        });
      }
      
      res.status(500).json({ error: 'Failed to apply template' });
    }
  });

  // Apply template to an existing slide
  app.put('/api/decks/:deckId/slides/:slideId/apply-template', isAuthenticated, async (req: any, res) => {
    try {
      const { templateId, content, overrides } = req.body;
      const { deckId, slideId } = req.params;
      const userId = req.user.id;
      
      console.log('=== APPLY TEMPLATE TO SLIDE ===');
      console.log('Template ID:', templateId);
      console.log('Deck ID:', deckId);
      console.log('Slide ID:', slideId);
      console.log('User ID:', userId);
      
      if (!templateId) {
        console.error('Missing template ID');
        return res.status(400).json({ error: 'Template ID is required' });
      }
      
      const deck = await storage.getDeck(deckId);
      if (!deck) {
        console.error('Deck not found:', deckId);
        return res.status(404).json({ error: 'Deck not found' });
      }
      
      // Verify ownership
      const project = await storage.getProject(deck.projectId);
      if (!project || project.userId !== userId) {
        console.error('Not authorized. Project userId:', project?.userId, 'Request userId:', userId);
        return res.status(403).json({ error: 'Not authorized to edit this deck' });
      }
      
      // Find the slide
      const existingSlides = Array.isArray(deck.slides) ? [...deck.slides] : [];
      console.log('Total slides in deck:', existingSlides.length);
      console.log('Looking for slide ID:', slideId);
      console.log('Available slide IDs:', existingSlides.map((s: any) => s.id));
      
      const slideIndex = existingSlides.findIndex((s: any) => s.id === slideId);
      
      if (slideIndex === -1) {
        console.error('Slide not found. Available IDs:', existingSlides.map((s: any) => s.id));
        return res.status(404).json({ error: 'Slide not found' });
      }
      
      const existingSlide = existingSlides[slideIndex];
      console.log('Found slide at index:', slideIndex);
      
      // Get brand kit
      const brandKit = deck.brandKitId ? await storage.getBrandKit(deck.brandKitId) : null;
      console.log('Brand kit ID:', deck.brandKitId);
      
      // Get template information
      const template = await templateManager.getTemplate(templateId);
      if (!template) {
        console.error('Template not found:', templateId);
        return res.status(404).json({ error: 'Template not found' });
      }
      
      console.log('Template info:', { 
        name: template.name, 
        category: template.category 
      });
      console.log('Content received from frontend:', JSON.stringify(content, null, 2));
      console.log('Project has businessProfile:', !!project.businessProfile);
      if (project.businessProfile) {
        console.log('Business profile keys:', Object.keys(project.businessProfile));
        console.log('Company name:', project.businessProfile.companyName || project.businessProfile.businessName);
      }
      
      // Helper to check if content is meaningful
      const hasContent = (obj: any): boolean => {
        if (!obj || typeof obj !== 'object') return false;
        return Object.values(obj).some(val => {
          if (Array.isArray(val)) return val.length > 0 && val.some(v => v && String(v).trim());
          return val !== null && val !== undefined && String(val).trim() !== '';
        });
      };
      
      // Check if template uses new layout.elements format (from design studio)
      const isVisualTemplate = template.layout?.elements && Array.isArray(template.layout.elements);
      
      // Generate AI content if no meaningful content provided AND not a visual template
      let slideContent = content;
      if (!hasContent(content) && !isVisualTemplate) {
        console.log('No meaningful content provided, generating with AI...');
        try {
          const aiContent = await openai.generateSlideContentForTemplate({
            templateCategory: template.category,
            templateName: template.name,
            businessProfile: project.businessProfile,
            existingContent: existingSlide.content
          });
          
          console.log('AI generated content:', aiContent);
          slideContent = aiContent;
        } catch (aiError) {
          console.error('Error generating AI content:', aiError);
          // Use existing content as fallback
          slideContent = existingSlide.content || { title: template.name };
        }
      } else if (isVisualTemplate && !hasContent(content)) {
        // For visual templates, use placeholder content from template schema
        console.log('Visual template detected - using placeholder content from schema');
        slideContent = { title: template.name };
      }
      
      console.log('Applying template with content:', JSON.stringify(slideContent, null, 2));
      
      // Pass businessProfile via content for AI generation
      const contentWithProfile = {
        ...slideContent,
        _businessProfile: project.businessProfile // Hidden field for context
      };
      
      const updatedSlide = await templateManager.applyTemplate(
        templateId,
        userId,
        contentWithProfile,
        brandKit,
        overrides
      );
      
      console.log('Template applied successfully');
      console.log('Updated slide preview:', JSON.stringify({
        id: updatedSlide.id,
        type: updatedSlide.type,
        title: updatedSlide.title,
        hasStyling: !!updatedSlide.styling,
        stylingKeys: updatedSlide.styling ? Object.keys(updatedSlide.styling) : [],
        hasContent: !!updatedSlide.content,
        contentKeys: updatedSlide.content ? Object.keys(updatedSlide.content) : [],
        hasPositionedElements: !!updatedSlide.positionedElements,
        positionedElementsKeys: updatedSlide.positionedElements ? Object.keys(updatedSlide.positionedElements) : []
      }, null, 2));
      
      // Preserve slide ID and order
      updatedSlide.id = slideId;
      updatedSlide.order = existingSlide.order;
      
      // Replace the slide
      existingSlides[slideIndex] = updatedSlide;
      
      console.log('Updating deck with modified slides...');
      await storage.updateDeck(deckId, { slides: existingSlides });
      
      console.log('✓ Template applied to slide successfully');
      console.log('=== FINAL SLIDE DATA BEING RETURNED TO CLIENT ===');
      console.log('Slide ID:', updatedSlide.id);
      console.log('Content:', JSON.stringify(updatedSlide.content, null, 2));
      console.log('Positioned elements:', JSON.stringify(updatedSlide.positionedElements, null, 2));
      console.log('Styling keys:', Object.keys(updatedSlide.styling || {}));
      
      res.json(updatedSlide);
    } catch (error: any) {
      console.error('=== ERROR APPLYING TEMPLATE TO SLIDE ===');
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      if (error.message && error.message.includes('premium subscription')) {
        return res.status(403).json({ 
          error: error.message,
          upgradeRequired: true 
        });
      }
      
      res.status(500).json({ 
        error: error.message || 'Failed to apply template to slide',
        details: error.toString()
      });
    }
  });

  // Create custom template from existing slide
  app.post('/api/templates/from-slide', isAuthenticated, async (req: any, res) => {
    try {
      const { slideId, deckId, name, description } = req.body;
      const userId = req.user.id;
      
      if (!slideId || !deckId || !name) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      const deck = await storage.getDeck(deckId);
      if (!deck) {
        return res.status(404).json({ error: 'Deck not found' });
      }
      
      const slide = Array.isArray(deck.slides) 
        ? deck.slides.find((s: any) => s.id === slideId)
        : null;
      
      if (!slide) {
        return res.status(404).json({ error: 'Slide not found' });
      }
      
      const template = await templateManager.createCustomTemplate(
        userId,
        slide,
        name,
        description
      );
      
      res.json(template);
    } catch (error) {
      console.error('Error creating template from slide:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  });

  // Get user's subscription status
  app.get('/api/user/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tier = await subscriptionService.getUserTier(userId);
      const subscription = await subscriptionService.getActiveSubscription(userId);
      
      res.json({
        tier,
        subscription,
        isPremium: tier !== 'free',
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  });

  // ============================================================================
  // ADMIN TEMPLATE ROUTES (require admin role)
  // ============================================================================

  // Helper to check if user is admin (you may want to implement proper role checking)
  const isAdmin = (req: any, res: any, next: any) => {
    // TODO: Implement proper admin role checking
    // For now, just pass through
    next();
  };

  // Get all templates (admin view, no access control filtering)
  app.get('/api/admin/templates', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { category, tags, search, isEnabled } = req.query;
      
      const templates = await templateManager.getAllTemplates({
        category: category as string,
        tags: tags ? (tags as string).split(',') : undefined,
        searchTerm: search as string,
        isEnabled: isEnabled !== undefined ? isEnabled === 'true' : undefined,
      });
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching all templates:', error);
      res.status(500).json({ error: 'Failed to fetch templates' });
    }
  });

  // Get single template by ID (admin view with full details)
  app.get('/api/admin/templates/:templateId', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const template = await templateManager.getTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({ error: 'Failed to fetch template' });
    }
  });

  // Create new template from scratch (admin only)
  app.post('/api/admin/templates', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const templateData = req.body;
      
      // Validate required fields
      if (!templateData.name || !templateData.category) {
        return res.status(400).json({ 
          error: 'Missing required fields: name and category are required' 
        });
      }
      
      const newTemplate = await templateManager.createCustomTemplate(userId, templateData);
      
      res.json(newTemplate);
    } catch (error: any) {
      console.error('Error creating template:', error);
      res.status(500).json({ error: error.message || 'Failed to create template' });
    }
  });

  // Update template settings
  // Full template edit endpoint - allows editing all template properties
  app.put('/api/admin/templates/:templateId', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const updates = req.body;
      
      // Validate template ID
      if (!templateId) {
        return res.status(400).json({ error: 'Template ID is required' });
      }
      
      // Update template with all provided fields
      await templateManager.updateTemplate(templateId, updates);
      
      res.json({ success: true, message: 'Template updated successfully' });
    } catch (error: any) {
      console.error('Error updating template:', error);
      res.status(error.message === 'Template not found' ? 404 : 500).json({ 
        error: error.message || 'Failed to update template' 
      });
    }
  });

  // Set template as default
  app.post('/api/admin/templates/:templateId/set-default', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { templateId } = req.params;
      await templateManager.setDefaultTemplate(templateId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error setting default template:', error);
      res.status(500).json({ error: 'Failed to set default template' });
    }
  });

  // Update template access tier
  app.put('/api/admin/templates/:templateId/access', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { templateId } = req.params;
      const { accessTier, isEnabled } = req.body;
      
      if (!accessTier || isEnabled === undefined) {
        return res.status(400).json({ error: 'accessTier and isEnabled are required' });
      }
      
      await templateManager.updateTemplateAccess(templateId, accessTier, isEnabled);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating template access:', error);
      res.status(500).json({ error: 'Failed to update template access' });
    }
  });

  // Reload templates from filesystem
  app.post('/api/admin/templates/reload', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      await templateManager.initialize();
      res.json({ success: true, message: 'Templates reloaded successfully' });
    } catch (error) {
      console.error('Error reloading templates:', error);
      res.status(500).json({ error: 'Failed to reload templates' });
    }
  });

  // Delete custom template
  app.delete('/api/admin/templates/:templateId', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { templateId } = req.params;
      await templateManager.deleteTemplate(templateId, req.user.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      res.status(error.message.includes('Cannot delete') ? 403 : 500).json({ 
        error: error.message || 'Failed to delete template' 
      });
    }
  });

  // Generate AI content for template preview
  app.post('/api/generate-template-content', isAuthenticated, async (req: any, res) => {
    try {
      const { templateCategory, templateName, businessProfile, projectId, templateSchema, layoutElements } = req.body;
      
      if (!businessProfile) {
        return res.status(400).json({ error: 'Business profile is required' });
      }
      
      if (!templateCategory || !templateName) {
        return res.status(400).json({ error: 'Template category and name are required' });
      }
      
      console.log(`Generating AI content for template: ${templateName} (${templateCategory})`);
      console.log(`Layout elements provided: ${layoutElements?.length || 0}`);
      
      // Count how many image fields are in the template (use layout elements if available, fallback to schema)
      let imageFieldCount = 0;
      if (layoutElements && Array.isArray(layoutElements)) {
        // Use layout elements - count image/logo elements with labels
        imageFieldCount = layoutElements.filter((el: any) => {
          if (el.type !== 'image' && el.type !== 'logo') return false;
          // Only count elements with labels (same filtering as the form)
          const label = el.config?.label || '';
          return label && label.trim() !== '';
        }).length;
      } else if (templateSchema?.fields) {
        // Fallback to schema
        imageFieldCount = templateSchema.fields.filter((f: any) => {
          if (!f.label || f.label.trim() === '') return false;
          return f.type === 'image' || f.type === 'logo';
        }).length;
      }
      console.log(`Template has ${imageFieldCount} image fields`);
      
      // Fetch available media from the project's media library (if projectId provided)
      let availableMedia: Array<{ url: string; name: string; type: string }> = [];
      if (projectId) {
        try {
          const mediaResult = await storage.getProjectMedia(projectId, req.user.id);
          availableMedia = mediaResult.media.map((m: any) => ({
            url: m.url,
            name: m.name || 'Untitled',
            type: m.contentType || 'image',
          }));
          console.log(`Found ${availableMedia.length} media assets for AI selection`);
        } catch (error) {
          console.warn('Could not fetch media library:', error);
          // Continue without media - not a fatal error
        }
      }
      
      // Call OpenAI to generate content with image selection
      const generatedContent = await openai.generateSlideContentForTemplate({
        templateCategory,
        templateName,
        businessProfile,
        existingContent: null,
        availableMedia, // Pass available images for AI selection
        requiredImageCount: imageFieldCount, // Tell AI how many images to select
        templateSchema, // Pass schema for backward compatibility
        layoutElements, // Pass layout elements with element-specific prompts (NEW)
      });
      
      console.log('Generated content:', generatedContent);
      
      res.json(generatedContent);
    } catch (error: any) {
      console.error('Error generating template content:', error);
      res.status(500).json({ error: error.message || 'Failed to generate content' });
    }
  });

  // Initialize template system on server start
  templateManager.initialize().catch(error => {
    console.error('Failed to initialize template system:', error);
  });

  // ==================== Media Management Endpoints ====================
  
  /**
   * Get all media assets for a project
   */
  app.get('/api/projects/:projectId/media', isAuthenticated, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      
      // Verify user has access to project
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const { mediaManager } = await import('./services/mediaManager');
      const assets = await mediaManager.getProjectMedia(projectId);
      
      // Get storage quota info
      const quotaInfo = await mediaManager.checkStorageQuota(projectId, 0);
      
      res.json({
        assets,
        quota: quotaInfo
      });
    } catch (error: any) {
      console.error('Error fetching project media:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch media assets' });
    }
  });
  
  /**
   * Upload media to project (with rate limiting and security validation)
   */
  app.post('/api/projects/:projectId/media/upload', isAuthenticated, rateLimiters.upload, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      const { file, filename, fileType, tags, description, altText } = req.body;
      
      if (!file || !filename || !fileType) {
        return res.status(400).json({ error: 'Missing required fields: file, filename, fileType' });
      }
      
      // Verify user has access to project
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Convert base64 to buffer
      const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      const { mediaManager } = await import('./services/mediaManager');
      
      // First, upload the image to get a public URL
      console.log(`📤 Uploading image: ${filename}`);
      let asset = await mediaManager.uploadMedia({
        projectId,
        userId,
        file: buffer,
        filename,
        fileType,
        source: 'upload',
        tags: tags || ['uploaded'], // Temporary tag
        description,
        altText
      });
      
      // Analyze with AI to get proper tags and description
      console.log(`🤖 Analyzing uploaded image with AI: ${asset.storageUrl}`);
      try {
        const { analyzeImageWithAI } = await import('./services/openai');
        const aiTags = await analyzeImageWithAI(asset.storageUrl);
        
        // Generate AI description if not provided
        let aiDescription = description;
        if (!aiDescription && aiTags.length > 0) {
          // Create a simple description from tags
          aiDescription = `Image containing: ${aiTags.join(', ')}`;
        }
        
        // Combine user tags with AI tags (remove duplicates)
        const combinedTags = [...new Set([...(tags || []), ...aiTags])];
        
        console.log(`✅ AI analysis complete. Tags: ${combinedTags.join(', ')}`);
        
        // Update the asset with AI-generated tags and description
        asset = await mediaManager.updateMediaMetadata(
          projectId,
          asset.id,
          {
            tags: combinedTags,
            description: aiDescription || asset.description
          }
        );
      } catch (aiError: any) {
        console.warn(`AI analysis failed for uploaded image, continuing with manual tags:`, aiError.message);
        // Continue without AI tags if analysis fails
      }
      
      res.json(asset);
    } catch (error: any) {
      console.error('Error uploading media:', error);
      res.status(500).json({ error: error.message || 'Failed to upload media' });
    }
  });
  
  /**
   * Extract images from website (with rate limiting)
   */
  app.post('/api/projects/:projectId/media/extract', isAuthenticated, rateLimiters.extract, async (req: any, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;
      const { websiteUrl, maxImages = 20 } = req.body;
      
      if (!websiteUrl) {
        return res.status(400).json({ error: 'Website URL is required' });
      }
      
      // Verify user has access to project
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== userId) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      const { mediaManager } = await import('./services/mediaManager');
      
      // Extract images
      console.log(`🔍 Extracting images from ${websiteUrl} for project ${projectId}`);
      const extractedImages = await mediaManager.extractImagesFromWebsite(websiteUrl);
      
      // Save extracted images
      console.log(`💾 Saving ${Math.min(extractedImages.length, maxImages)} images to project`);
      const result = await mediaManager.saveExtractedImages(
        projectId,
        userId,
        extractedImages,
        maxImages
      );
      
      res.json({
        message: `Successfully extracted ${result.saved.length} images`,
        saved: result.saved,
        errors: result.errors,
        totalFound: extractedImages.length
      });
    } catch (error: any) {
      console.error('Error extracting images:', error);
      res.status(500).json({ error: error.message || 'Failed to extract images' });
    }
  });
  
  /**
   * Update media asset metadata
   */
  app.patch('/api/projects/:projectId/media/:assetId', isAuthenticated, async (req: any, res) => {
    try {
      const { assetId } = req.params;
      const userId = req.user.id;
      const { tags, description, altText } = req.body;
      
      const { mediaManager } = await import('./services/mediaManager');
      const updated = await mediaManager.updateMediaMetadata(assetId, userId, {
        tags,
        description,
        altText
      });
      
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating media metadata:', error);
      res.status(500).json({ error: error.message || 'Failed to update media' });
    }
  });
  
  /**
   * Delete media asset
   */
  app.delete('/api/projects/:projectId/media/:assetId', isAuthenticated, async (req: any, res) => {
    try {
      const { assetId } = req.params;
      const userId = req.user.id;
      
      const { mediaManager } = await import('./services/mediaManager');
      await mediaManager.deleteMedia(assetId, userId);
      
      res.json({ success: true, message: 'Media deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting media:', error);
      res.status(500).json({ error: error.message || 'Failed to delete media' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Enhanced project analysis function with comprehensive research
async function analyzeProjectWithEnhancedResearch(project: any) {
  try {
    const websiteCrawler = new WebsiteCrawler();
    const businessResearcher = new BusinessResearcher();
    const financialAnalyzer = new FinancialAnalyzer();
    
    let websiteData = null;
    let marketAnalysis = null;
    let competitorAnalysis = null;
    let businessResearch = null;
    let businessInsights = null;
    let financialAnalysis = null;
    
    // Crawl website if URL provided
    if (project.websiteUrl) {
      try {
        console.log(`Crawling website: ${project.websiteUrl}`);
        websiteData = await websiteCrawler.crawlWebsite(project.websiteUrl);
      } catch (error) {
        console.error("Website crawling failed:", error);
        // Continue without website data
      }
    }

    // Conduct comprehensive business research
    const companyName = project.name;
    const industry = project.industry || 'Technology';
    const description = project.description || 'Innovative company';

    try {
      console.log("Conducting market analysis...");
      marketAnalysis = await businessResearcher.conductMarketAnalysis(
        companyName, industry, description, websiteData
      );
    } catch (error) {
      console.error("Market analysis failed:", error);
    }

    try {
      console.log("Analyzing competitors...");
      competitorAnalysis = await businessResearcher.analyzeCompetitors(
        companyName, industry, description, websiteData
      );
    } catch (error) {
      console.error("Competitor analysis failed:", error);
    }

    try {
      console.log("Conducting business research...");
      businessResearch = await businessResearcher.conductBusinessResearch(
        companyName, industry, description, websiteData
      );
    } catch (error) {
      console.error("Business research failed:", error);
    }

    try {
      console.log("Generating business insights...");
      businessInsights = await businessResearcher.generateBusinessInsights(
        companyName, description, websiteData, marketAnalysis || undefined, competitorAnalysis || undefined, businessResearch || undefined
      );
    } catch (error) {
      console.error("Business insights generation failed:", error);
    }

    // Generate comprehensive financial analysis
    try {
      console.log("Generating financial analysis and revenue projections...");
      const businessModel = businessResearch?.businessModel?.revenueStreams?.[0] || 'SaaS/Subscription';
      const targetMarket = marketAnalysis?.targetCustomers?.primarySegment || 'Technology companies';
      const marketSize = marketAnalysis?.marketSize?.totalAddressableMarket || 'Large addressable market';
      
      financialAnalysis = await financialAnalyzer.generateRevenueProjections(
        businessModel,
        targetMarket,
        marketSize,
        industry,
        websiteData
      );
    } catch (error) {
      console.error("Financial analysis failed:", error);
    }

    // Create comprehensive business profile
    const businessProfile = {
      companyName: project.name,
      industry: project.industry || industry,
      description: project.description || description,
      website: project.websiteUrl,
      
      // Enhanced research data
      websiteData,
      marketAnalysis,
      competitorAnalysis,
      businessResearch,
      businessInsights,
      financialAnalysis,
      
      // Core business information (derived from research)
      businessDescription: businessInsights?.businessDescription || websiteData?.keyData?.companyInfo || description || 'Innovative technology company',
      problemStatement: businessInsights?.problemStatement || 'Solving key market challenges through innovative technology',
      businessModel: businessInsights?.businessModel?.revenueStreams?.[0] || businessResearch?.businessModel?.revenueStreams?.[0] || 'SaaS/Subscription',
      targetMarket: extractStringValueUtil(businessInsights?.goToMarketStrategy?.customerSegments?.[0] || marketAnalysis?.targetCustomers?.primarySegment) || 'Technology companies',
      valueProposition: businessInsights?.valueProposition || 'Innovative solution for market needs',
      keyFeatures: websiteData?.keyData?.products?.slice(0, 5) || ['Innovative features', 'User-friendly interface'],
      teamSize: 'Startup (5-20 employees)',
      stage: 'Growth Stage',
      fundingGoal: '$1M - $5M Series A',
      
      // Additional insights
      marketOpportunity: extractStringValueUtil(marketAnalysis?.marketSize?.totalAddressableMarket) || 'Large addressable market',
      competitiveAdvantage: businessInsights?.competitiveAdvantages || competitorAnalysis?.competitiveAdvantages || ['Unique technology', 'Strong team'],
      revenueModel: businessResearch?.businessModel?.revenueStreams || ['Subscription', 'Usage-based'],
      customerSegments: marketAnalysis?.targetCustomers?.secondarySegments || ['SMBs', 'Enterprise'],
      keyMetrics: ['Revenue growth', 'Customer acquisition', 'User engagement'],
      riskFactors: businessResearch?.riskAnalysis?.marketRisks || ['Market competition', 'Technology risks'],
      growthStrategy: businessInsights?.goToMarketStrategy || ['Product development', 'Market expansion'],
      
      // Financial projections and analysis
      revenueProjections: financialAnalysis?.revenueProjections || null,
      fundingRequirements: financialAnalysis?.fundingRequirements || null,
      keyFinancialMetrics: financialAnalysis?.keyMetrics || null,
      businessValuation: {
        stage: financialAnalysis?.fundingRequirements?.fundingStage || 'Pre-seed to Seed',
        projectedRevenue: {
          year1: financialAnalysis?.revenueProjections?.year1?.revenue || 'Not available',
          year2: financialAnalysis?.revenueProjections?.year2?.revenue || 'Not available',
          year3: financialAnalysis?.revenueProjections?.year3?.revenue || 'Not available'
        },
        fundingNeeds: financialAnalysis?.fundingRequirements?.initialCapital || 'To be determined'
      },
      
      // Research metadata
      researchDate: new Date().toISOString(),
      researchSources: [
        websiteData ? 'Website crawling' : null,
        marketAnalysis ? 'Market analysis' : null,
        competitorAnalysis ? 'Competitor research' : null,
        businessResearch ? 'Business research' : null,
        businessInsights ? 'AI insights' : null,
        financialAnalysis ? 'Financial analysis' : null
      ].filter(Boolean)
    };
    
    // Sanitize the entire business profile to convert nested objects to strings
    const sanitizedProfile = sanitizeBusinessProfile(businessProfile);
    
    return sanitizedProfile;
  } catch (error) {
    console.error("Enhanced analysis error:", error);
    throw new Error("Failed to conduct enhanced business analysis");
  }
}
