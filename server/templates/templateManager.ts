import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { slideTemplates } from '../../shared/schema';
import { templateValidator } from './templateValidator';
import { subscriptionService } from '../services/subscriptionService';
import type {
  TemplateDefinition,
  BrandKitColors,
  AppliedTemplate
} from './types';
import type { BrandKit } from '../../shared/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TemplateManager {
  private templateCache: Map<string, any> = new Map();
  private templatesPath = path.join(__dirname, 'definitions');
  private initialized = false;

  /**
   * Generate an SVG placeholder thumbnail as data URI
   */
  private generateThumbnailDataUri(templateName: string, category: string): string {
    const categoryColors: Record<string, { bg: string; accent: string }> = {
      title: { bg: '#dbeafe', accent: '#3b82f6' },
      content: { bg: '#dcfce7', accent: '#22c55e' },
      data: { bg: '#fce7f3', accent: '#ec4899' },
      closing: { bg: '#fef3c7', accent: '#f59e0b' },
    };

    const colors = categoryColors[category] || { bg: '#f3f4f6', accent: '#6b7280' };

    const svg = `<svg width="400" height="225" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="225" fill="${colors.bg}"/>
      <rect x="20" y="20" width="360" height="185" fill="white" rx="8" stroke="${colors.accent}" stroke-width="2"/>
      <rect x="40" y="50" width="120" height="12" fill="${colors.accent}" opacity="0.3" rx="6"/>
      <rect x="40" y="75" width="200" height="8" fill="${colors.accent}" opacity="0.2" rx="4"/>
      <rect x="40" y="95" width="180" height="8" fill="${colors.accent}" opacity="0.2" rx="4"/>
      <rect x="40" y="115" width="160" height="8" fill="${colors.accent}" opacity="0.2" rx="4"/>
      <circle cx="340" cy="60" r="20" fill="${colors.accent}" opacity="0.2"/>
      <text x="200" y="185" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="${colors.accent}" text-anchor="middle">${templateName}</text>
      <text x="200" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="${colors.accent}" opacity="0.6" text-anchor="middle">${category.toUpperCase()}</text>
    </svg>`;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  /**
   * Initialize template system - Load all templates from filesystem
   */
  async initialize() {
    if (this.initialized) {
      console.log('Template system already initialized');
      return;
    }

    console.log('Initializing template system...');

    try {
      // Load all JSON templates from filesystem
      const systemTemplates = await this.loadSystemTemplates();
      console.log(`Found ${systemTemplates.length} system templates`);

      // Sync to database (insert if not exists, update if version changed)
      for (const template of systemTemplates) {
        await this.syncTemplateToDatabase(template);
      }

      // Build cache
      await this.rebuildCache();

      this.initialized = true;
      console.log(`Template system initialized successfully with ${this.templateCache.size} templates`);
    } catch (error) {
      console.error('Error initializing template system:', error);
      throw error;
    }
  }

  /**
   * Load all templates from filesystem
   */
  private async loadSystemTemplates(): Promise<TemplateDefinition[]> {
    const templates: TemplateDefinition[] = [];
    const categories = ['title', 'content', 'data', 'closing'];

    for (const category of categories) {
      const categoryPath = path.join(this.templatesPath, category);

      if (!fs.existsSync(categoryPath)) {
        console.warn(`Category path not found: ${categoryPath}`);
        continue;
      }

      const files = fs.readdirSync(categoryPath).filter(f => f.endsWith('.json'));

      for (const file of files) {
        try {
          const filePath = path.join(categoryPath, file);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const templateData = JSON.parse(fileContent);

          // Validate template structure
          const validation = templateValidator.validate(templateData);
          if (!validation.valid) {
            console.error(`Invalid template ${file}:`, validation.errors);
            continue;
          }

          templates.push(templateData);
        } catch (error) {
          console.error(`Error loading template ${file}:`, error);
        }
      }
    }

    return templates;
  }

  /**
   * Sync template to database
   */
  private async syncTemplateToDatabase(template: TemplateDefinition) {
    try {
      // Check if template exists by slug (not UUID)
      const [existing] = await db
        .select()
        .from(slideTemplates)
        .where(eq(slideTemplates.slug, template.id))
        .limit(1);

      // Generate SVG thumbnail as data URI
      const thumbnail = this.generateThumbnailDataUri(template.name, template.category);

      const templateData = {
        slug: template.id, // Store the string ID as slug
        name: template.name,
        category: template.category,
        description: template.description || null,
        thumbnail, // Use generated SVG data URI
        layout: template.layout,
        defaultStyling: template.styling,
        contentSchema: template.contentSchema,
        positioningRules: this.extractPositioningRules(template.layout),
        accessTier: template.accessTier || 'premium',
        isDefault: template.isDefault || false,
        isEnabled: template.isEnabled !== undefined ? template.isEnabled : true,
        displayOrder: template.displayOrder || 0,
        isSystem: true,
        userId: null,
        tags: template.tags || [],
        version: template.version,
        usageCount: 0,
      };

      if (!existing) {
        // Insert new template (UUID will be auto-generated)
        await db.insert(slideTemplates).values(templateData);
        console.log(`✓ Inserted template: ${template.name}`);
      } else {
        // Skip update if template has been customized by admin
        if (existing.customizedByAdmin) {
          console.log(`⊘ Skipped template: ${template.name} (customized by admin at ${existing.customizedByAdmin.toISOString()})`);
          return;
        }

        // Update template from JSON file (preserving usage stats and customization timestamp)
        await db
          .update(slideTemplates)
          .set({
            ...templateData,
            updatedAt: new Date(),
            // Preserve usage stats and customization status
            usageCount: existing.usageCount,
            lastUsedAt: existing.lastUsedAt,
            customizedByAdmin: existing.customizedByAdmin, // Keep null if not customized
          })
          .where(eq(slideTemplates.id, existing.id)); // Use the UUID from existing record

        if (existing.version !== template.version) {
          console.log(`↻ Updated template: ${template.name} (${existing.version} → ${template.version})`);
        }
      }
    } catch (error) {
      console.error(`Error syncing template ${template.id}:`, error);
    }
  }

  /**
   * Extract positioning rules from layout
   */
  private extractPositioningRules(layout: any): any {
    const rules: any = {};

    if (layout.elements && Array.isArray(layout.elements)) {
      for (const element of layout.elements) {
        if (element.zone) {
          rules[element.id] = {
            x: element.zone.x,
            y: element.zone.y,
            width: element.zone.width,
            height: element.zone.height,
            alignment: element.zone.alignment,
          };
        }
      }
    }

    return rules;
  }

  /**
   * Rebuild template cache
   */
  async rebuildCache() {
    try {
      const allTemplates = await db
        .select()
        .from(slideTemplates)
        .where(eq(slideTemplates.isEnabled, true));

      this.templateCache.clear();
      for (const template of allTemplates) {
        this.templateCache.set(template.id, template);
      }

      console.log(`Cache rebuilt with ${this.templateCache.size} templates`);
    } catch (error) {
      console.error('Error rebuilding cache:', error);
    }
  }

  /**
   * Get template by ID (from cache or database)
   */
  async getTemplate(templateId: string) {
    // Check cache first
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId);
    }

    // Fallback to database
    try {
      const [template] = await db
        .select()
        .from(slideTemplates)
        .where(eq(slideTemplates.id, templateId))
        .limit(1);

      if (template) {
        this.templateCache.set(templateId, template);
        return template;
      }

      return null;
    } catch (error) {
      console.error('Error getting template:', error);
      return null;
    }
  }

  /**
   * Get all templates with filters (admin view - no access control)
   */
  async getAllTemplates(filters?: {
    category?: string;
    tags?: string[];
    searchTerm?: string;
    isEnabled?: boolean;
  }) {
    try {
      let query = db.select().from(slideTemplates);

      // Apply filters if provided
      // Note: Complex filtering would require query builder, keeping simple for now

      const templates = await query;

      // Apply client-side filtering
      let filtered = templates;

      if (filters?.category) {
        filtered = filtered.filter(t => t.category === filters.category);
      }

      if (filters?.tags && filters.tags.length > 0) {
        filtered = filtered.filter(t =>
          t.tags?.some(tag => filters.tags!.includes(tag))
        );
      }

      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        filtered = filtered.filter(t =>
          t.name.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term)
        );
      }

      if (filters?.isEnabled !== undefined) {
        filtered = filtered.filter(t => t.isEnabled === filters.isEnabled);
      }

      // Sort by displayOrder
      return filtered.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    } catch (error) {
      console.error('Error getting all templates:', error);
      return [];
    }
  }

  /**
   * Get templates for user (with access control)
   */
  async getTemplatesForUser(userId: string, filters?: {
    category?: string;
    tags?: string[];
    searchTerm?: string;
  }) {
    try {
      // Get user's subscription tier
      const userTier = await subscriptionService.getUserTier(userId);

      // Get all enabled templates
      const allTemplates = await this.getAllTemplates({
        ...filters,
        isEnabled: true,
      });

      // Add access control information
      return allTemplates.map(template => ({
        ...template,
        isLocked: this.isTemplateLocked(template, userTier),
        requiresUpgrade: template.accessTier === 'premium' && userTier === 'free',
      }));
    } catch (error) {
      console.error('Error getting templates for user:', error);
      return [];
    }
  }

  /**
   * Check if template is locked for user
   */
  isTemplateLocked(template: any, userTier: string): boolean {
    // Free templates available to everyone
    if (template.accessTier === 'free') return false;

    // Premium templates only for paid users
    if (template.accessTier === 'premium' && userTier === 'free') return true;

    return false;
  }

  /**
   * Get default template
   */
  async getDefaultTemplate() {
    try {
      const [defaultTemplate] = await db
        .select()
        .from(slideTemplates)
        .where(
          and(
            eq(slideTemplates.isDefault, true),
            eq(slideTemplates.isEnabled, true)
          )
        )
        .limit(1);

      if (!defaultTemplate) {
        throw new Error('No default template configured');
      }

      return defaultTemplate;
    } catch (error) {
      console.error('Error getting default template:', error);
      throw error;
    }
  }

  /**
   * Set template as default (only one can be default)
   */
  async setDefaultTemplate(templateId: string) {
    try {
      // First, remove default flag from all templates
      await db
        .update(slideTemplates)
        .set({ isDefault: false })
        .where(eq(slideTemplates.isDefault, true));

      // Set the new default
      await db
        .update(slideTemplates)
        .set({ isDefault: true, updatedAt: new Date(), customizedByAdmin: new Date() })
        .where(eq(slideTemplates.id, templateId));

      // Invalidate cache
      await this.rebuildCache();

      console.log(`Set default template: ${templateId}`);
    } catch (error) {
      console.error('Error setting default template:', error);
      throw error;
    }
  }

  /**
   * Update template access tier and status
   */
  /**
   * Update template with full editing capabilities
   */
  async updateTemplate(templateId: string, updates: {
    name?: string;
    description?: string;
    category?: 'title' | 'content' | 'data' | 'closing';
    thumbnail?: string;
    layout?: any;
    defaultStyling?: any;
    contentSchema?: any;
    positioningRules?: any;
    accessTier?: 'free' | 'premium';
    isDefault?: boolean;
    isEnabled?: boolean;
    displayOrder?: number;
    tags?: string[];
  }) {
    try {
      // Get existing template
      const [existing] = await db
        .select()
        .from(slideTemplates)
        .where(eq(slideTemplates.id, templateId))
        .limit(1);

      if (!existing) {
        throw new Error('Template not found');
      }

      // Build update object with only provided fields
      const updateData: any = {
        updatedAt: new Date(),
        customizedByAdmin: new Date() // Mark as admin-customized to prevent JSON sync overwrite
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.thumbnail !== undefined) updateData.thumbnail = updates.thumbnail;
      if (updates.layout !== undefined) updateData.layout = updates.layout;
      if (updates.defaultStyling !== undefined) updateData.defaultStyling = updates.defaultStyling;
      if (updates.contentSchema !== undefined) updateData.contentSchema = updates.contentSchema;
      if (updates.positioningRules !== undefined) updateData.positioningRules = updates.positioningRules;
      if (updates.accessTier !== undefined) updateData.accessTier = updates.accessTier;
      if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;
      if (updates.isEnabled !== undefined) updateData.isEnabled = updates.isEnabled;
      if (updates.displayOrder !== undefined) updateData.displayOrder = updates.displayOrder;
      if (updates.tags !== undefined) updateData.tags = updates.tags;

      // If setting as default, unset other defaults
      if (updates.isDefault === true) {
        await db
          .update(slideTemplates)
          .set({ isDefault: false })
          .where(eq(slideTemplates.isDefault, true));
      }

      // Update template
      await db
        .update(slideTemplates)
        .set(updateData)
        .where(eq(slideTemplates.id, templateId));

      // Invalidate cache
      this.templateCache.delete(templateId);
      await this.rebuildCache();

      console.log(`✓ Updated template: ${existing.name}`);

      return { success: true };
    } catch (error) {
      console.error('Error updating template:', error);
      throw error;
    }
  }

  async updateTemplateAccess(
    templateId: string,
    accessTier: 'free' | 'premium',
    isEnabled: boolean
  ) {
    try {
      await db
        .update(slideTemplates)
        .set({
          accessTier,
          isEnabled,
          updatedAt: new Date(),
          customizedByAdmin: new Date()
        })
        .where(eq(slideTemplates.id, templateId));

      // Invalidate cache
      this.templateCache.delete(templateId);

      console.log(`Updated template access: ${templateId}`);
    } catch (error) {
      console.error('Error updating template access:', error);
      throw error;
    }
  }

  /**
   * Apply template to create a new slide
   */
  async applyTemplate(
    templateId: string,
    userId: string,
    content: any,
    brandKit: BrandKit | null,
    overrides?: any
  ): Promise<AppliedTemplate> {
    try {
      const template = await this.getTemplate(templateId);

      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }

      // Check access control
      const userTier = await subscriptionService.getUserTier(userId);

      if (this.isTemplateLocked(template, userTier)) {
        throw new Error('This template requires a premium subscription');
      }

      // Increment usage count
      await db
        .update(slideTemplates)
        .set({
          usageCount: sql`${slideTemplates.usageCount} + 1`,
          lastUsedAt: new Date()
        })
        .where(eq(slideTemplates.id, templateId));

      // Build slide from template
      const slide = await this.buildSlideFromTemplate(
        template,
        content,
        brandKit,
        overrides
      );

      return slide;
    } catch (error) {
      console.error('Error applying template:', error);
      throw error;
    }
  }

  /**
   * Build slide from template definition
   */
  private async buildSlideFromTemplate(
    template: any,
    content: any,
    brandKit: BrandKit | null,
    overrides?: any
  ): Promise<AppliedTemplate> {
    // Extract brand colors
    const brandColors: BrandKitColors = {
      primary: brandKit?.primaryColor || '#3B82F6',
      secondary: brandKit?.secondaryColor || '#64748B',
      accent: brandKit?.accentColor || '#10B981',
      contrast: this.getContrastColor(brandKit?.primaryColor || '#3B82F6'),
    };

    // Check if template uses new layout.elements format (from design studio)
    const hasLayoutElements = template.layout?.elements && Array.isArray(template.layout.elements);

    if (hasLayoutElements) {
      // NEW FORMAT: Convert layout.elements to slide format
      // Note: We need to pass businessProfile but don't have it in this context
      // It will be passed from the route handler
      return await this.buildSlideFromLayoutElements(template, content, brandKit, brandColors, overrides, (content as any)?._businessProfile);
    }

    // OLD FORMAT: Use legacy positioning rules
    // Apply brand colors to styling
    const styling = this.applyBrandStyling(
      template.defaultStyling,
      brandColors,
      brandKit
    );

    // Apply positioning rules
    const positionedElements = {
      ...template.positioningRules,
      ...overrides?.positioning
    };

    // Map content to template schema
    const mappedContent = this.mapContent(content, template.contentSchema, brandKit);

    // Build the slide
    const slide: AppliedTemplate = {
      id: `slide-${Date.now()}`,
      type: template.category,
      title: content.title || template.name,
      content: mappedContent,
      styling: {
        ...styling,
        fontFamily: brandKit?.fontFamily || 'Inter',
        brandColors,
        ...overrides?.styling
      },
      positionedElements,
      layout: template.layout.type,
      templateId: template.id,
      templateVersion: template.version,
      order: content.order || 1,
      backgroundColor: styling.backgroundColor,
      textColor: styling.textColor,
    };

    return slide;
  }

  /**
   * Build slide from new layout.elements format (from design studio)
   */
  private async buildSlideFromLayoutElements(
    template: any,
    content: any,
    brandKit: BrandKit | null,
    brandColors: BrandKitColors,
    overrides?: any,
    businessProfile?: any
  ): Promise<AppliedTemplate> {
    console.log('=== BUILD SLIDE FROM LAYOUT ELEMENTS - START ===');
    console.log('Template ID:', template.id);
    console.log('Template name:', template.name);
    console.log('Content received:', JSON.stringify(content, null, 2));
    console.log('Business profile available:', !!businessProfile);
    console.log('Brand kit available:', !!brandKit);

    const layoutElements = template.layout.elements || [];
    console.log('Layout elements count:', layoutElements.length);

    // Show human-readable summary of elements
    console.log('\n📋 TEMPLATE ELEMENTS SUMMARY:');
    layoutElements.forEach((el: any, index: number) => {
      console.log(`  ${index + 1}. ${el.type.toUpperCase()} - ID: ${el.id}`);
      console.log(`     Label: ${el.config?.label || 'N/A'}`);
      console.log(`     Has zone: ${!!el.zone}`);
      if (el.zone) {
        console.log(`     Position: x=${el.zone.x}, y=${el.zone.y}, width=${el.zone.width}, height=${el.zone.height}`);
      }
      if (el.type === 'image') {
        console.log(`     Media type: ${el.config?.mediaType || 'N/A'}`);
      }
      console.log(`     Has AI prompt: ${!!el.aiPrompt?.enabled}`);
      if (el.aiPrompt?.enabled) {
        console.log(`     AI Prompt: "${el.aiPrompt.prompt}"`);
      }
      console.log('');
    });

    console.log('Full layout elements JSON:', JSON.stringify(layoutElements, null, 2));

    const positionedElements: any = {};
    const slideContent: any = {
      titles: [],
      descriptions: [],
      bullets: [],
      logos: [],
      // NEW: Add content mapped by element ID for ElementRenderer
      _elementContent: {},
    };

    // Helper to parse pixel values
    const parsePixelValue = (val: string | number): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // Track content array indices for positioning mapping
    let titleIndex = 0;
    let descriptionIndex = 0;
    let bulletIndex = 0;
    let logoIndex = 0;

    // Process each layout element
    console.log('=== PROCESSING LAYOUT ELEMENTS ===');
    for (const el of layoutElements) {
      console.log(`\n--- Processing element: ${el.id} (${el.type}) ---`);
      console.log('Element config:', el.config);
      console.log('Element zone:', el.zone);
      console.log('Element styling:', el.styling);
      console.log('Element aiPrompt:', el.aiPrompt);
      const fieldId = el.id;

      // Determine the semantic key for positioning based on element type and label
      let positionKey = fieldId;
      const label = el.config?.label?.toLowerCase() || fieldId.toLowerCase();

      if (el.type === 'text') {
        if (label.includes('title') || label.includes('headline')) {
          positionKey = titleIndex === 0 ? 'title' : `title-${titleIndex}`;
        } else if (label.includes('bullet') || label.includes('point')) {
          positionKey = bulletIndex === 0 ? 'bullets' : `bullet-${bulletIndex}`;
        } else {
          positionKey = descriptionIndex === 0 ? 'description' : `description-${descriptionIndex}`;
        }
      } else if (el.type === 'image') {
        const mediaType = el.config?.mediaType || '';
        if (mediaType === 'logo' || fieldId.includes('logo')) {
          positionKey = logoIndex === 0 ? 'logo' : `logo-${logoIndex}`;
        } else {
          positionKey = `image-${fieldId}`;
        }
      }

      // Convert zone to positioned element format
      if (el.zone) {
        positionedElements[positionKey] = {
          x: parsePixelValue(el.zone.x || 0),
          y: parsePixelValue(el.zone.y || 0),
          width: parsePixelValue(el.zone.width || 100),
          height: parsePixelValue(el.zone.height || 100),
        };

        console.log(`Mapped element ${fieldId} (${el.type}) to position key: ${positionKey}`, positionedElements[positionKey]);
      }

      // Map content based on element type
      if (el.type === 'text') {
        console.log(`TEXT ELEMENT: ${fieldId}`);
        // Check if content was provided for this field
        let fieldContent = content?.[fieldId];
        console.log(`  - Content from request: "${fieldContent}"`);
        console.log(`  - AI prompt enabled: ${el.aiPrompt?.enabled}`);
        console.log(`  - AI prompt: "${el.aiPrompt?.prompt}"`);

        // If no content provided and element has AI prompt, generate it
        if (!fieldContent && el.aiPrompt?.enabled && el.aiPrompt?.prompt) {
          try {
            console.log(`  ✨ Generating AI content for field ${fieldId} with prompt: "${el.aiPrompt.prompt}"`);
            fieldContent = await this.generateFieldContent(
              el.aiPrompt,
              businessProfile,
              brandKit,
              template.category
            );
            console.log(`  ✅ Generated content for ${fieldId}:`, fieldContent);
          } catch (error) {
            console.error(`  ❌ Error generating AI content for field ${fieldId}:`, error);
            // Fall back to placeholder or default
            fieldContent = el.config?.placeholder || el.config?.defaultValue || '';
            console.log(`  ⚠️ Using fallback: "${fieldContent}"`);
          }
        } else if (!fieldContent) {
          // Use placeholder or default if no AI prompt
          fieldContent = el.config?.placeholder || el.config?.defaultValue || '';
          console.log(`  ⚠️ No content or AI prompt, using placeholder: "${fieldContent}"`);
        } else {
          console.log(`  ✅ Using provided content: "${fieldContent}"`);
        }

        // Store content by element ID for ElementRenderer
        slideContent._elementContent[fieldId] = fieldContent;

        // Determine if this is a title, description, or bullet based on field naming/config
        const label = el.config?.label?.toLowerCase() || fieldId.toLowerCase();
        if (label.includes('title') || label.includes('headline')) {
          slideContent.titles.push(fieldContent);
          titleIndex++;
        } else if (label.includes('bullet') || label.includes('point')) {
          if (!Array.isArray(slideContent.bullets)) {
            slideContent.bullets = [];
          }
          slideContent.bullets.push(fieldContent);
          bulletIndex++;
        } else if (label.includes('description') || label.includes('subtitle')) {
          slideContent.descriptions.push(fieldContent);
          descriptionIndex++;
        } else if (el.config?.multiline) {
          slideContent.descriptions.push(fieldContent);
          descriptionIndex++;
        } else {
          // Default to description for other text fields
          slideContent.descriptions.push(fieldContent);
          descriptionIndex++;
        }
      } else if (el.type === 'image') {
        console.log(`IMAGE ELEMENT: ${fieldId}`);
        // Check if this is a logo or regular image
        const mediaType = el.config?.mediaType || 'graphic';
        console.log(`  - Media type: ${mediaType}`);
        console.log(`  - Is logo: ${mediaType === 'logo'}`);
        console.log(`  - Brand kit has logo: ${!!brandKit?.logoUrl}`);

        if (mediaType === 'logo') {
          // Check for AI prompt for image description/alt text
          if (el.aiPrompt?.enabled && el.aiPrompt?.prompt) {
            try {
              console.log(`  ℹ️ AI prompt for image field ${fieldId}: "${el.aiPrompt.prompt}" (Note: Using for context, actual image from brand kit)`);
            } catch (error) {
              console.error(`  ❌ Error processing AI prompt for image field ${fieldId}:`, error);
            }
          }

          // Add brand kit logo if available
          if (brandKit?.logoUrl) {
            console.log(`  ✅ Adding logo to content: ${brandKit.logoUrl}`);
            slideContent.logos.push(brandKit.logoUrl);
            // Store by element ID for ElementRenderer
            slideContent._elementContent[fieldId] = brandKit.logoUrl;
            logoIndex++;
            console.log(`  📍 Logo position key: ${positionKey}`);
          } else {
            console.log(`  ⚠️ No brand kit logo available`);
            // Optional: Use a placeholder or fallback URL if configured
            if (el.config?.fallbackUrl) {
              slideContent._elementContent[fieldId] = el.config.fallbackUrl;
            }
          }
        } else {
          // For other image types (graphic, photo, icon), store content if provided
          const imageContent = content?.[fieldId];
          if (imageContent) {
            slideContent._elementContent[fieldId] = imageContent;
          } else if (el.config?.fallbackUrl) {
            // Use fallback if no content provided
            slideContent._elementContent[fieldId] = el.config.fallbackUrl;
          }

          // For other image types, AI prompt could describe what image is needed
          if (el.aiPrompt?.enabled && el.aiPrompt?.prompt) {
            console.log(`  ℹ️ AI prompt for image field ${fieldId}: "${el.aiPrompt.prompt}" (Note: Image selection/generation not yet implemented)`);
            // TODO: Could be used to search media library or generate image descriptions
          }
        }
      } else if (el.type === 'data') {
        let dataContent = content?.[fieldId];

        // Check if data field has AI prompt for formatting or context
        if (!dataContent && el.aiPrompt?.enabled && el.aiPrompt?.prompt) {
          try {
            console.log(`Generating data content for field ${fieldId} with AI prompt`);
            dataContent = await this.generateFieldContent(
              el.aiPrompt,
              businessProfile,
              brandKit,
              template.category
            );
          } catch (error) {
            console.error(`Error generating AI content for data field ${fieldId}:`, error);
          }
        }

        // Use default value if no content
        if (!dataContent) {
          // Improved fallback: Use null/undefined to let renderer handle it (showing '--')
          // instead of hardcoded '123'
          dataContent = el.config?.defaultValue || null;
        }

        // Store by element ID for ElementRenderer
        slideContent._elementContent[fieldId] = dataContent;

        // Add to appropriate content array based on label (for legacy rendering)
        const label = el.config?.label?.toLowerCase() || fieldId.toLowerCase();
        if (label.includes('title')) {
          slideContent.titles.push(dataContent);
        } else {
          slideContent.descriptions.push(dataContent);
        }
      } else if (el.type === 'shape') {
        // Shapes don't have content, but we need to track them exist
        slideContent._elementContent[fieldId] = true;
      }
    }

    // Get background color from template canvas (for visual templates, this is authoritative)
    const backgroundColor = template.canvas?.backgroundColor || '#ffffff';

    console.log(`📐 Using background color from template canvas: ${backgroundColor}`);
    console.log(`   Template canvas config:`, template.canvas);

    // Merge styling from template with brand kit
    const styling = {
      backgroundColor: backgroundColor,  // Use canvas color directly
      textColor: '#333333',
      primaryColor: brandColors.primary,
      secondaryColor: brandColors.secondary,
      accentColor: brandColors.accent,
      fontFamily: brandKit?.fontFamily || 'Inter',
      fontSize: 'medium',
      titleFontSize: '2xl',
      descriptionFontSize: 'base',
      bulletFontSize: 'base',
      brandColors,
      ...overrides?.styling
    };

    // Build the slide
    const slide: AppliedTemplate = {
      id: `slide-${Date.now()}`,
      type: template.category,
      title: slideContent.titles[0] || content?.title || template.name,
      content: slideContent,
      styling,
      positionedElements: {
        ...positionedElements,
        ...overrides?.positioning
      },
      layout: template.layout.type || 'absolute',
      templateId: template.id,
      templateVersion: template.version,
      order: content?.order || 1,
      backgroundColor: styling.backgroundColor,
      textColor: styling.textColor,
      // NEW: Include full layoutElements for element-by-element rendering
      layoutElements: layoutElements.length > 0 ? layoutElements : undefined,
    };

    // Debug logging
    console.log('=== SLIDE BUILT FROM LAYOUT ELEMENTS ===');
    console.log('Template:', template.name);
    console.log('Layout elements processed:', layoutElements.length);
    console.log('Content generated:', {
      titles: slideContent.titles.length,
      descriptions: slideContent.descriptions.length,
      bullets: slideContent.bullets?.length || 0,
      logos: slideContent.logos.length
    });
    console.log('Positioned elements:', Object.keys(positionedElements));
    console.log('Full slide content:', JSON.stringify(slideContent, null, 2));
    console.log('Full positioned elements:', JSON.stringify(positionedElements, null, 2));

    return slide;
  }

  /**
   * Generate content for a single field using its AI prompt
   */
  private async generateFieldContent(
    aiPrompt: any,
    businessProfile: any,
    brandKit: any,
    templateCategory: string
  ): Promise<string> {
    const OpenAI = await import('openai');
    const openai = new OpenAI.default({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build context for the prompt
    let contextInfo = '';

    if (aiPrompt.context?.includes('businessProfile') && businessProfile) {
      contextInfo += `\n\nBusiness Context:\n`;
      contextInfo += `Company: ${businessProfile.companyName || businessProfile.businessName || 'Unknown'}\n`;
      if (businessProfile.industry) contextInfo += `Industry: ${businessProfile.industry}\n`;
      if (businessProfile.description) contextInfo += `Description: ${businessProfile.description}\n`;
      if (businessProfile.targetAudience) contextInfo += `Target Audience: ${businessProfile.targetAudience}\n`;
      if (businessProfile.valueProposition) contextInfo += `Value Proposition: ${businessProfile.valueProposition}\n`;
    }

    if (aiPrompt.context?.includes('brandKit') && brandKit) {
      contextInfo += `\n\nBrand Context:\n`;
      if (brandKit.brandName) contextInfo += `Brand: ${brandKit.brandName}\n`;
      if (brandKit.tagline) contextInfo += `Tagline: ${brandKit.tagline}\n`;
    }

    // Build the full prompt
    const fullPrompt = `${aiPrompt.prompt}${contextInfo}\n\nProvide a concise, professional response (max ${aiPrompt.maxTokens || 100} words). Return only the text content, no formatting.`;

    try {
      // Add retry logic for robustness
      let retries = 2;
      let lastError;

      while (retries >= 0) {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a professional pitch deck content writer. Generate clear, concise, and compelling content based on the user's prompt."
              },
              {
                role: "user",
                content: fullPrompt
              }
            ],
            temperature: 0.7,
            max_tokens: aiPrompt.maxTokens || 200,
          });

          return response.choices[0]?.message?.content?.trim() || aiPrompt.fallback || '';
        } catch (err) {
          lastError = err;
          retries--;
          if (retries >= 0) {
            console.log(`  ⚠️ OpenAI call failed, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          }
        }
      }

      throw lastError;
    } catch (error) {
      console.error('Error generating field content after retries:', error);
      // Return fallback or empty string
      return aiPrompt.fallback || '';
    }
  }

  /**
   * Apply brand colors to template styling
   */
  private applyBrandStyling(
    templateStyling: any,
    brandColors: BrandKitColors,
    brandKit: BrandKit | null
  ) {
    const styling = JSON.parse(JSON.stringify(templateStyling)); // Deep clone

    // Helper to resolve color references
    const resolveColor = (colorDef: any): string => {
      if (!colorDef) return '#000000';

      if (typeof colorDef === 'string') {
        return colorDef;
      }

      if (colorDef.usesBrandColor && brandColors[colorDef.usesBrandColor as keyof BrandKitColors]) {
        let color = brandColors[colorDef.usesBrandColor as keyof BrandKitColors] || '#000000';

        // Apply opacity if specified
        if (colorDef.opacity !== undefined && colorDef.opacity < 1) {
          color = this.applyOpacity(color, colorDef.opacity);
        }

        return color;
      }

      return colorDef.fallback || '#000000';
    };

    // Resolve background color - always use solid colors
    let backgroundColor = '#FFFFFF';

    if (styling.background) {
      if (styling.background.type === 'solid') {
        // For solid backgrounds, use the color definition or fallback
        if (styling.background.usesBrandColor) {
          backgroundColor = resolveColor({ usesBrandColor: styling.background.usesBrandColor });
        } else if (styling.background.fallback) {
          backgroundColor = styling.background.fallback;
        } else {
          backgroundColor = resolveColor(styling.background);
        }
      } else if (styling.background.type === 'gradient') {
        // For gradients, just use the solid brand color instead
        backgroundColor = resolveColor({ usesBrandColor: styling.background.usesBrandColor });
      }
    }

    // Resolve text colors
    const textColor = resolveColor(styling.colorScheme?.titleColor);
    const descriptionColor = resolveColor(styling.colorScheme?.descriptionColor);
    const accentColor = resolveColor(styling.colorScheme?.accentColor);

    return {
      ...styling,
      backgroundColor,
      textColor,
      primaryColor: brandColors.primary,
      secondaryColor: brandColors.secondary,
      accentColor,
      titleFontSize: styling.typography?.title?.fontSize || '3xl',
      descriptionFontSize: styling.typography?.description?.fontSize || 'lg',
      bulletFontSize: styling.typography?.bullets?.fontSize || 'base',
      fontFamily: brandKit?.fontFamily,
    };
  }

  /**
   * Calculate contrast color for text
   */
  private getContrastColor(hexColor: string): string {
    // Remove # if present
    const hex = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return white or black based on luminance
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  }

  /**
   * Apply opacity to hex color
   */
  private applyOpacity(hexColor: string, opacity: number): string {
    return this.hexToRgba(hexColor, opacity);
  }

  /**
   * Convert hex color to rgba with opacity
   */
  private hexToRgba(hexColor: string, opacity: number): string {
    // Remove # if present
    const hex = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  /**
   * Map content to template schema
   */
  private mapContent(content: any, schema: any, brandKit: BrandKit | null) {
    const mapped: any = {
      titles: [],
      descriptions: [],
      bullets: [],
      logos: [],
    };

    // Handle missing or invalid schema
    if (!schema || !schema.fields || !Array.isArray(schema.fields)) {
      console.log('Warning: Invalid or missing schema.fields, using default content mapping');
      // Try to map content directly if it exists
      if (content) {
        if (content.title) mapped.titles = [content.title];
        if (content.description) mapped.descriptions = [content.description];
        if (content.bullets) mapped.bullets = Array.isArray(content.bullets) ? content.bullets : [content.bullets];
        if (content.logo || content.logos) {
          mapped.logos = Array.isArray(content.logos) ? content.logos : [content.logo || content.logos];
        }
      }
      return mapped;
    }

    for (const field of schema.fields) {
      const value = content && content[field.id] !== undefined ? content[field.id] : field.defaultValue;

      // Map to the target location
      const target = field.mapTo || field.id;

      if (target && target.includes('[')) {
        // Array notation like "titles[0]"
        const match = target.match(/^(\w+)\[(\d+)\]$/);
        if (match) {
          const [, arrayName, index] = match;
          if (!mapped[arrayName]) {
            mapped[arrayName] = [];
          }
          mapped[arrayName][parseInt(index)] = value;
        }
      } else {
        // Direct mapping
        mapped[target] = value;
      }
    }

    // Check if template schema defines logo fields
    const templateHasLogoField = schema && schema.fields &&
      Array.isArray(schema.fields) &&
      schema.fields.some((field: any) => field.type === 'logo');

    // Only add brand kit logos if template explicitly defines logo fields
    if (templateHasLogoField && brandKit) {
      console.log('✅ Template defines logo field, adding brand kit logos');
      console.log('🎨 Brand kit data:', {
        hasLogoUrl: !!brandKit.logoUrl,
        logoUrl: brandKit.logoUrl,
        hasBrandAssets: !!brandKit.brandAssets,
        brandAssetsType: typeof brandKit.brandAssets,
        brandAssetsLength: Array.isArray(brandKit.brandAssets) ? brandKit.brandAssets.length : 'not array'
      });

      // Add primary logo if available
      if (brandKit.logoUrl && !mapped.logos.includes(brandKit.logoUrl)) {
        mapped.logos.push(brandKit.logoUrl);
      }

      // Add additional logos from brand assets
      if (brandKit.brandAssets) {
        const assets = brandKit.brandAssets as any;
        if (Array.isArray(assets)) {
          const logoAssets = assets
            .filter((asset: any) => asset.type === 'logo')
            .map((asset: any) => asset.url);
          console.log('📸 Found brand asset logos:', logoAssets);
          logoAssets.forEach((url: string) => {
            if (url && !mapped.logos.includes(url)) {
              mapped.logos.push(url);
            }
          });
        }
      }

      console.log('✅ Final mapped logos:', mapped.logos);
    } else {
      console.log('⊘ Template does not define logo field, skipping brand kit logos');
    }

    // Clean up empty arrays - with proper null checks
    if (Array.isArray(mapped.titles) && mapped.titles.length === 0) delete mapped.titles;
    if (Array.isArray(mapped.descriptions) && mapped.descriptions.length === 0) delete mapped.descriptions;
    if (Array.isArray(mapped.bullets) && mapped.bullets.length === 0) delete mapped.bullets;
    if (Array.isArray(mapped.logos) && mapped.logos.length === 0) delete mapped.logos;

    return mapped;
  }

  /**
   * Create custom template from existing slide
   */
  async createCustomTemplate(
    userId: string,
    slide: any,
    templateName: string,
    description?: string
  ) {
    try {
      const templateData = {
        slug: `custom-${Date.now()}`, // Generate a unique slug for custom templates
        name: templateName,
        category: slide.type || 'content',
        description: description || `Custom template based on ${slide.title}`,
        thumbnail: null,
        layout: { type: slide.layout || 'freeform', elements: [] },
        defaultStyling: slide.styling || {},
        contentSchema: this.inferContentSchema(slide),
        positioningRules: slide.positionedElements || {},
        accessTier: 'free' as const, // User custom templates are free for them
        isDefault: false,
        isEnabled: true,
        displayOrder: 999, // Show at end
        isSystem: false,
        userId,
        tags: ['custom', 'user-created'],
        version: '1.0',
      };

      const [newTemplate] = await db
        .insert(slideTemplates)
        .values(templateData)
        .returning();

      // Update cache
      this.templateCache.set(newTemplate.id, newTemplate);

      console.log(`Created custom template: ${templateName}`);
      return newTemplate;
    } catch (error) {
      console.error('Error creating custom template:', error);
      throw error;
    }
  }

  /**
   * Infer content schema from slide content
   */
  private inferContentSchema(slide: any) {
    const fields = [];
    const content = slide.content || {};

    if (content.titles || slide.title) {
      fields.push({
        id: 'title',
        type: 'text',
        label: 'Title',
        required: true,
        mapTo: 'titles[0]',
      });
    }

    if (content.descriptions) {
      fields.push({
        id: 'description',
        type: 'richText',
        label: 'Description',
        required: false,
        mapTo: 'descriptions[0]',
      });
    }

    if (content.bullets) {
      fields.push({
        id: 'bullets',
        type: 'bullets',
        label: 'Bullet Points',
        required: false,
        mapTo: 'bullets',
      });
    }

    return { fields };
  }

  /**
   * Delete custom template
   */
  async deleteTemplate(templateId: string, userId: string) {
    try {
      // Get template to check if it exists
      const template = await this.getTemplate(templateId);

      if (!template) {
        throw new Error('Template not found');
      }

      // Allow admins to delete system templates
      // Custom templates can only be deleted by their owner
      if (!template.isSystem && template.userId && template.userId !== userId) {
        throw new Error('You can only delete your own templates');
      }

      await db
        .delete(slideTemplates)
        .where(eq(slideTemplates.id, templateId));

      // Remove from cache
      this.templateCache.delete(templateId);

      console.log(`Deleted template: ${templateId}`);
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }
}

// Singleton instance
export const templateManager = new TemplateManager();

