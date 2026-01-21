import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { eq, and, sql, inArray, ne } from 'drizzle-orm';
import { db } from '../db';
import { slideTemplates, themes } from '../../shared/schema';
import { templateValidator } from './templateValidator';
import { subscriptionService } from '../services/subscriptionService';
import type {
  TemplateDefinition,
  BrandKitColors,
  AppliedTemplate,
  ThemeDefinition,
  Theme
} from './types';
import type { BrandKit } from '../../shared/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TemplateManager {
  private templateCache: Map<string, any> = new Map();
  private themeCache: Map<string, any> = new Map();
  private templatesPath = path.join(__dirname, 'definitions');
  private themesPath = path.join(__dirname, 'themes');
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
      // BUG FIX 1: Load and sync themes FIRST, before templates
      // Templates reference themes by slug, so themes must exist in database first
      const systemThemes = await this.loadSystemThemes();
      console.log(`Found ${systemThemes.length} system themes`);

      for (const theme of systemThemes) {
        await this.syncThemeToDatabase(theme);
      }

      // Build theme cache
      await this.rebuildThemeCache();

      // Now load and sync templates (which reference themes)
      const systemTemplates = await this.loadSystemTemplates();
      console.log(`Found ${systemTemplates.length} system templates`);

      // Sync to database (insert if not exists, update if version changed)
      for (const template of systemTemplates) {
        await this.syncTemplateToDatabase(template);
      }

      // Build cache
      await this.rebuildCache();

      this.initialized = true;
      console.log(`Template system initialized successfully with ${this.templateCache.size} templates and ${this.themeCache.size} themes`);
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

      // Get theme ID from theme slug/ID, or fall back to default theme
      let themeId: string | null = null;
      
      if (template.themeId) {
        // Try to find theme by slug
        const [theme] = await db
          .select({ id: themes.id })
          .from(themes)
          .where(eq(themes.slug, template.themeId))
          .limit(1);

        if (theme?.id) {
          themeId = theme.id;
        } else {
          console.warn(`Theme not found for template ${template.id} with themeId: ${template.themeId}, falling back to default theme`);
        }
      }

      // If no theme found, get default theme
      if (!themeId) {
        const [defaultTheme] = await db
          .select({ id: themes.id })
          .from(themes)
          .where(and(
            eq(themes.isDefault, true),
            eq(themes.isEnabled, true)
          ))
          .limit(1);

        if (defaultTheme?.id) {
          themeId = defaultTheme.id;
          console.log(`Using default theme for template ${template.id}: ${defaultTheme.id}`);
        } else {
          // Get any enabled theme as last resort
          const [anyTheme] = await db
            .select({ id: themes.id })
            .from(themes)
            .where(eq(themes.isEnabled, true))
            .limit(1);

          if (anyTheme?.id) {
            themeId = anyTheme.id;
            console.log(`Using first available theme for template ${template.id}: ${anyTheme.id}`);
          } else {
            console.error(`No themes available in database. Cannot sync template ${template.id}. Please create a theme first.`);
            return;
          }
        }
      }

      // Generate SVG thumbnail as data URI
      const thumbnail = this.generateThumbnailDataUri(template.name, template.category);

      // Ensure themeId is never undefined
      if (!themeId) {
        console.error(`Cannot sync template ${template.id}: No theme available`);
        return;
      }

      // Validate required fields
      if (!template.layout) {
        console.error(`Cannot sync template ${template.id}: layout is required`);
        return;
      }
      if (!template.styling) {
        console.error(`Cannot sync template ${template.id}: styling is required`);
        return;
      }
      if (!template.contentSchema) {
        console.error(`Cannot sync template ${template.id}: contentSchema is required`);
        return;
      }

      const templateData = {
        slug: template.id, // Store the string ID as slug
        name: template.name,
        category: template.category,
        description: template.description || null,
        thumbnail, // Use generated SVG data URI
        themeId: themeId, // Required theme relationship (guaranteed to be set)
        layout: template.layout, // Required - validated above
        defaultStyling: template.styling, // Required - validated above
        contentSchema: template.contentSchema, // Required - validated above
        positioningRules: this.extractPositioningRules(template.layout),
        // accessTier removed - templates inherit from theme
        isDefault: template.isDefault || false,
        isEnabled: template.isEnabled !== undefined ? template.isEnabled : true,
        displayOrder: template.displayOrder || 0,
        isSystem: true,
        userId: null,
        tags: template.tags || [],
        version: template.version || '1.0.0', // Ensure version is never undefined
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
   * Get templates for user (with access control based on theme)
   */
  async getTemplatesForUser(userId: string, filters?: {
    category?: string;
    tags?: string[];
    searchTerm?: string;
  }) {
    try {
      // Get user's subscription tier
      const userTier = await subscriptionService.getUserTier(userId);

      // Get all enabled templates with their themes
      const allTemplates = await db
        .select({
          template: slideTemplates,
          theme: themes,
        })
        .from(slideTemplates)
        .innerJoin(themes, eq(slideTemplates.themeId, themes.id))
        .where(eq(slideTemplates.isEnabled, true));

      // BUG FIX 2: Apply filters - after spreading, properties are flattened
      // Map to flattened structure with template properties directly accessible
      let filtered = allTemplates.map(({ template, theme }) => ({
        ...template,
        themeAccessTier: theme.accessTier, // Include theme access tier for access control
      }));

      // After spreading, access properties directly (not through t.template.*)
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
          (t.description && t.description.toLowerCase().includes(term))
        );
      }

      // Add access control information based on theme
      // After spreading, themeAccessTier is a direct property, not nested
      return filtered.map((t) => {
        const isLocked = this.isTemplateLockedByTheme(t.themeAccessTier, userTier);
        return {
          ...t,
          isLocked,
          requiresUpgrade: t.themeAccessTier === 'premium' && userTier === 'free',
        };
      });
    } catch (error) {
      console.error('Error getting templates for user:', error);
      return [];
    }
  }

  /**
   * Check if template is locked for user based on theme access tier
   */
  isTemplateLockedByTheme(themeAccessTier: string, userTier: string): boolean {
    // Free themes available to everyone
    if (themeAccessTier === 'free') return false;

    // Premium themes only for paid users
    if (themeAccessTier === 'premium' && userTier === 'free') return true;

    return false;
  }

  /**
   * Check if template is locked for user (legacy method - now uses theme)
   */
  isTemplateLocked(template: any, userTier: string): boolean {
    // If template has themeAccessTier (from joined query), use it
    if (template.themeAccessTier) {
      return this.isTemplateLockedByTheme(template.themeAccessTier, userTier);
    }

    // Fallback: try to get theme access tier
    // This should not happen in normal flow, but provides backward compatibility
    return false; // Default to unlocked if we can't determine
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
    themeId?: string; // Allow moving templates between themes
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

      // Handle themeId update - validate theme exists
      if (updates.themeId !== undefined) {
        const [theme] = await db
          .select()
          .from(themes)
          .where(eq(themes.id, updates.themeId))
          .limit(1);

        if (!theme) {
          throw new Error(`Theme not found: ${updates.themeId}`);
        }

        updateData.themeId = updates.themeId;
        console.log(`Moving template ${templateId} to theme: ${theme.name}`);
      }

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

  /**
   * Update template enabled status only (without changing theme access tier)
   * BUG FIX 3: Separate method for toggling enabled status
   */
  async updateTemplateEnabled(templateId: string, isEnabled: boolean) {
    try {
      // Update template enabled status only
      await db
        .update(slideTemplates)
        .set({
          isEnabled,
          updatedAt: new Date(),
          customizedByAdmin: new Date()
        })
        .where(eq(slideTemplates.id, templateId));

      // Invalidate cache
      this.templateCache.delete(templateId);

      console.log(`Updated template enabled status: ${templateId} -> ${isEnabled}`);
    } catch (error) {
      console.error('Error updating template enabled status:', error);
      throw error;
    }
  }

  async updateTemplateAccess(
    templateId: string,
    accessTier: 'free' | 'premium',
    isEnabled: boolean
  ) {
    try {
      // Get template to find its theme
      const [template] = await db
        .select()
        .from(slideTemplates)
        .where(eq(slideTemplates.id, templateId))
        .limit(1);

      if (!template) {
        throw new Error('Template not found');
      }

      // Update theme access tier (templates inherit from theme)
      await db
        .update(themes)
        .set({
          accessTier,
          updatedAt: new Date(),
        })
        .where(eq(themes.id, template.themeId));

      // Update template enabled status
      await db
        .update(slideTemplates)
        .set({
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

      // Check access control (based on theme)
      // Skip access control for system user (used during deck generation)
      if (userId !== 'system') {
        const userTier = await subscriptionService.getUserTier(userId);

        // Get theme for access control
        if (!template.themeId) {
          console.warn(`Template ${templateId} (${template.name}) has no themeId!`);
          // Allow it to proceed - might be an old template
        } else {
          const [theme] = await db
            .select()
            .from(themes)
            .where(eq(themes.id, template.themeId))
            .limit(1);

          if (!theme) {
            console.warn(`Theme not found for template ${templateId} (themeId: ${template.themeId})`);
            // Allow it to proceed - might be a migration issue
          } else if (this.isTemplateLockedByTheme(theme.accessTier, userTier)) {
            throw new Error('This template requires a premium subscription');
          }
        }
      } else {
        console.log(`Skipping access control check for system user (template: ${templateId})`);
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
        // Check _elementContent first (client sends this), then direct field
        let fieldContent = content?._elementContent?.[fieldId] || content?.[fieldId];
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
          // CRITICAL: If no content and no AI prompt, try to generate content using element label/type
          // This ensures we don't leave placeholders in generated slides
          if (businessProfile) {
            try {
              // Generate minimal content based on element label/type
              const label = el.config?.label?.toLowerCase() || '';
              if (label.includes('title') || label.includes('headline')) {
                fieldContent = businessProfile.companyName || businessProfile.businessName || 'Company Overview';
              } else if (label.includes('description') || label.includes('body')) {
                fieldContent = businessProfile.description || businessProfile.tagline || '';
              } else {
                fieldContent = el.config?.placeholder || el.config?.defaultValue || '';
              }
              console.log(`  ⚠️ No content or AI prompt, generated from business profile: "${fieldContent}"`);
            } catch (error) {
              fieldContent = el.config?.placeholder || el.config?.defaultValue || '';
              console.log(`  ⚠️ Fallback to placeholder: "${fieldContent}"`);
            }
          } else {
            fieldContent = el.config?.placeholder || el.config?.defaultValue || '';
            console.log(`  ⚠️ No content or AI prompt, using placeholder: "${fieldContent}"`);
          }
        } else {
          console.log(`  ✅ Using provided content: "${fieldContent}"`);
        }

        // CRITICAL: Always store content (even if empty) so element appears
        // But prefer actual content over placeholders when possible
        slideContent._elementContent[fieldId] = fieldContent || el.config?.label || '';

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
          // Check _elementContent first (for indexed keys from client), then direct field
          let imageContent = null;
          let foundWithIndexedKey = false;

          // Try to find content with layout index (client sends this for multi-image templates)
          const layoutIndex = layoutElements.indexOf(el);
          const indexedKey = `${fieldId}-layout-${layoutIndex}`;
          if (content?._elementContent?.[indexedKey]) {
            imageContent = content._elementContent[indexedKey];
            foundWithIndexedKey = true;
            console.log(`  ✅ Found image content with indexed key ${indexedKey}:`, imageContent);
          } else if (content?._elementContent?.[fieldId]) {
            imageContent = content._elementContent[fieldId];
            console.log(`  ✅ Found image content with field ID ${fieldId}:`, imageContent);
          } else if (content?.[fieldId]) {
            imageContent = content[fieldId];
            console.log(`  ✅ Found image content with direct key ${fieldId}:`, imageContent);
          } else if (content?.images && Array.isArray(content.images)) {
            // NEW: Map images array from AI to image elements by index
            // Find all image elements (non-logo) in order
            const allImageElements = layoutElements.filter((e: any) =>
              e.type === 'image' && e.config?.mediaType !== 'logo'
            );
            const imageElementIndex = allImageElements.indexOf(el);

            if (imageElementIndex >= 0 && imageElementIndex < content.images.length) {
              imageContent = content.images[imageElementIndex];
              console.log(`  ✅ Found image from AI images array at index ${imageElementIndex}:`, imageContent);
            } else {
              console.log(`  ⚠️ Image element index ${imageElementIndex} out of range (images array has ${content.images.length} items)`);
            }
          }

          if (imageContent) {
            // CRITICAL FIX: Preserve indexed key if that's how content was found
            // This ensures ElementRenderer can find it when looking for indexed keys
            if (foundWithIndexedKey) {
              slideContent._elementContent[indexedKey] = imageContent;
              console.log(`  📦 Stored image content with indexed key ${indexedKey}`);
            }
            // Also store under fieldId for backward compatibility
            slideContent._elementContent[fieldId] = imageContent;
          } else if (el.config?.fallbackUrl) {
            // Use fallback if no content provided
            slideContent._elementContent[fieldId] = el.config.fallbackUrl;
            console.log(`  ⚠️ Using fallback URL for ${fieldId}`);
          } else {
            console.log(`  ⚠️ No image content found for ${fieldId}`);
          }

          // For other image types, AI prompt could describe what image is needed
          if (el.aiPrompt?.enabled && el.aiPrompt?.prompt) {
            console.log(`  ℹ️ AI prompt for image field ${fieldId}: "${el.aiPrompt.prompt}"`);
          }
        }
      } else if (el.type === 'data') {
        // Check _elementContent first, then direct field
        let dataContent = content?._elementContent?.[fieldId] || content?.[fieldId];

        console.log(`DATA ELEMENT: ${fieldId}`);
        console.log(`  - Content from client:`, dataContent);

        // Check if data field has AI prompt for formatting or context
        if (!dataContent && el.aiPrompt?.enabled && el.aiPrompt?.prompt) {
          try {
            console.log(`  ✨ Generating data content for field ${fieldId} with AI prompt`);
            dataContent = await this.generateFieldContent(
              el.aiPrompt,
              businessProfile,
              brandKit,
              template.category
            );
            console.log(`  ✅ Generated data content:`, dataContent);
          } catch (error) {
            console.error(`  ❌ Error generating AI content for data field ${fieldId}:`, error);
          }
        }

        // Use default value if no content
        if (!dataContent) {
          // Improved fallback: Use null/undefined to let renderer handle it (showing '--')
          // instead of hardcoded '123'
          dataContent = el.config?.defaultValue || null;
          console.log(`  ⚠️ Using default value:`, dataContent);
        } else {
          console.log(`  ✅ Using provided data content:`, dataContent);
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
        console.log(`SHAPE ELEMENT: ${fieldId}`);
        // Shapes - check for color customizations from client
        // Client sends shape data as an object: { exists: true, fill: "#color", stroke: "#color" }
        const shapeData: any = { exists: true };

        // Check if shape config indicates it should use brand kit colors
        // Check both config.contextInclude and aiPrompt.context for brandKit
        const hasContextInclude = el.config?.contextInclude === true || el.config?.contextInclude === 'brandKit';
        const hasBrandKitInContext = el.aiPrompt?.context?.includes('brandKit') || false;
        // usesBrandColor can be a boolean or a string (color type)
        const usesBrandColorFlag = el.config?.usesBrandColor === true || (typeof el.config?.usesBrandColor === 'string' && el.config.usesBrandColor);
        const shouldUseBrandColor = usesBrandColorFlag || hasContextInclude || hasBrandKitInContext;
        // If usesBrandColor is a string, use it as the color type, otherwise use brandColorType or default to 'primary'
        const brandColorType = (typeof el.config?.usesBrandColor === 'string' ? el.config.usesBrandColor : null) || el.config?.brandColorType || 'primary'; // primary, secondary, accent

        console.log(`  🔍 Shape brand color check for ${fieldId}:`, {
          usesBrandColor: el.config?.usesBrandColor,
          contextInclude: el.config?.contextInclude,
          aiPromptContext: el.aiPrompt?.context,
          hasBrandKitInContext,
          shouldUseBrandColor,
          brandColorType
        });

        // Determine brand color to use
        let brandColor = null;
        if (shouldUseBrandColor && brandKit) {
          if (brandColorType === 'primary') {
            brandColor = brandKit.primaryColor || brandColors.primary;
          } else if (brandColorType === 'secondary') {
            brandColor = brandKit.secondaryColor || brandColors.secondary;
          } else if (brandColorType === 'accent') {
            brandColor = brandKit.accentColor || brandColors.accent;
          } else {
            brandColor = brandKit.primaryColor || brandColors.primary;
          }
          console.log(`  🎨 Shape uses brand color (${brandColorType}):`, brandColor);
        }

        // Check if client sent shape data as an object in _elementContent
        const clientShapeData = content?._elementContent?.[fieldId];
        if (clientShapeData && typeof clientShapeData === 'object') {
          console.log(`  ✅ Found shape data object for ${fieldId}:`, clientShapeData);
          // If brand color should be used, override client fill with brand color
          if (shouldUseBrandColor && brandColor) {
            shapeData.fill = brandColor;
            console.log(`  🎨 Overriding with brand color:`, brandColor);
          } else if (clientShapeData.fill) {
            shapeData.fill = clientShapeData.fill;
            console.log(`  ✅ Using custom fill color:`, shapeData.fill);
          } else if (el.config?.fill) {
            shapeData.fill = el.config.fill;
            console.log(`  ℹ️ Using default fill color:`, shapeData.fill);
          }

          if (clientShapeData.stroke) {
            shapeData.stroke = clientShapeData.stroke;
            console.log(`  ✅ Using custom stroke color:`, shapeData.stroke);
          } else if (el.config?.stroke) {
            shapeData.stroke = el.config.stroke;
          }
        } else {
          // Fallback: check old format (individual keys)
          const fillKey = `${fieldId}_fill`;
          const strokeKey = `${fieldId}_stroke`;

          // If brand color should be used, override with brand color
          if (shouldUseBrandColor && brandColor) {
            shapeData.fill = brandColor;
            console.log(`  🎨 Using brand color (${brandColorType}):`, brandColor);
          } else if (content?._elementContent?.[fillKey] || content?.[fillKey]) {
            shapeData.fill = content._elementContent?.[fillKey] || content[fillKey];
            console.log(`  ✅ Found shape fill color (old format) for ${fieldId}:`, shapeData.fill);
          } else if (el.config?.fill) {
            shapeData.fill = el.config.fill;
            console.log(`  ℹ️ Using default fill color for ${fieldId}:`, shapeData.fill);
          }

          if (content?._elementContent?.[strokeKey] || content?.[strokeKey]) {
            shapeData.stroke = content._elementContent?.[strokeKey] || content[strokeKey];
            console.log(`  ✅ Found shape stroke color (old format) for ${fieldId}:`, shapeData.stroke);
          } else if (el.config?.stroke) {
            shapeData.stroke = el.config.stroke;
          }
        }

        slideContent._elementContent[fieldId] = shapeData;
        console.log(`  📦 Stored shape data:`, slideContent._elementContent[fieldId]);
      }
    }

    // Get background color from template canvas (for visual templates, this is authoritative)
    const backgroundColor = template.canvas?.backgroundColor || '#ffffff';

    console.log(`📐 Using background color from template canvas: ${backgroundColor}`);
    console.log(`   Template canvas config:`, template.canvas);

    // Get theme metadata from brandKit if available (passed from generation)
    const themeMetadata = (brandKit as any)?.themeMetadata;

    // Merge styling from template with brand kit and theme metadata
    const styling = {
      backgroundColor: backgroundColor,  // Use canvas color directly
      textColor: themeMetadata?.colorScheme?.contrast || '#333333',
      primaryColor: themeMetadata?.colorScheme?.primary || brandColors.primary,
      secondaryColor: themeMetadata?.colorScheme?.secondary || brandColors.secondary,
      accentColor: themeMetadata?.colorScheme?.accent || brandColors.accent,
      fontFamily: themeMetadata?.typography?.fontFamily || brandKit?.fontFamily || 'Inter',
      fontSize: 'medium',
      titleFontSize: themeMetadata?.typography?.titleSize?.replace('text-', '') || '2xl',
      descriptionFontSize: themeMetadata?.typography?.bodySize?.replace('text-', '') || 'base',
      bulletFontSize: themeMetadata?.typography?.bodySize?.replace('text-', '') || 'base',
      brandColors: {
        primary: themeMetadata?.colorScheme?.primary || brandColors.primary,
        secondary: themeMetadata?.colorScheme?.secondary || brandColors.secondary,
        accent: themeMetadata?.colorScheme?.accent || brandColors.accent,
        contrast: themeMetadata?.colorScheme?.contrast || brandColors.contrast,
      },
      ...overrides?.styling
    };

    // Preserve any additional _elementContent from client that wasn't processed
    // This ensures client-sent content isn't lost (e.g., custom indexed keys)
    if (content?._elementContent) {
      Object.keys(content._elementContent).forEach((key) => {
        // Only preserve if we didn't already process this key
        if (!slideContent._elementContent.hasOwnProperty(key)) {
          slideContent._elementContent[key] = content._elementContent[key];
          console.log(`  📦 Preserved additional content key: ${key}`);
        }
      });
    }

    // CRITICAL: Include ALL layout elements from template exactly as defined
    // The template defines the exact structure - we should follow it precisely
    // Elements without content will show placeholders or be handled by the renderer
    console.log(`📊 Using ALL ${layoutElements.length} layout elements from template (exact match)`);

    // Apply theme styling to each element if theme metadata is available
    // (themeMetadata is already declared above)
    const styledLayoutElements = layoutElements.map((el: any, index: number) => {
      // CRITICAL: Deep copy to preserve zone values exactly as defined in template
      // Zone values must be preserved exactly (x, y, width, height) for proper positioning
      const styledElement = {
        ...el,
        // Preserve zone object exactly as it is (don't modify position/size)
        zone: el.zone ? {
          x: el.zone.x,
          y: el.zone.y,
          width: el.zone.width,
          height: el.zone.height,
        } : undefined,
      };
      
      // Debug: Log zone values to verify they're preserved correctly
      if (el.zone) {
        console.log(`  Element ${index + 1} (${el.id}): zone preserved - x=${el.zone.x}, y=${el.zone.y}, width=${el.zone.width}, height=${el.zone.height}`);
      }

      // Apply theme colors to element styling if available
      if (themeMetadata?.colorScheme && styledElement.styling) {
        // Apply theme colors to text elements
        if (el.type === 'text' && !styledElement.styling.color) {
          // Use appropriate theme color based on element role
          const label = el.config?.label?.toLowerCase() || '';
          if (label.includes('title') || label.includes('headline')) {
            styledElement.styling = {
              ...styledElement.styling,
              color: themeMetadata.colorScheme.primary || styledElement.styling.color,
            };
          } else {
            styledElement.styling = {
              ...styledElement.styling,
              color: themeMetadata.colorScheme.secondary || styledElement.styling.color,
            };
          }
        }

        // Apply theme colors to shapes
        if (el.type === 'shape' && !styledElement.config?.fill) {
          styledElement.config = {
            ...styledElement.config,
            fill: themeMetadata.colorScheme.accent || styledElement.config?.fill,
          };
        }
      }

      // Apply theme typography if available
      if (themeMetadata?.typography && el.type === 'text') {
        if (!styledElement.styling?.fontFamily) {
          styledElement.styling = {
            ...styledElement.styling,
            fontFamily: themeMetadata.typography.fontFamily,
          };
        }
        if (!styledElement.styling?.fontSize) {
          const label = el.config?.label?.toLowerCase() || '';
          if (label.includes('title') || label.includes('headline')) {
            styledElement.styling = {
              ...styledElement.styling,
              fontSize: themeMetadata.typography.titleSize?.replace('text-', '') || styledElement.styling?.fontSize,
            };
          } else {
            styledElement.styling = {
              ...styledElement.styling,
              fontSize: themeMetadata.typography.bodySize?.replace('text-', '') || styledElement.styling?.fontSize,
            };
          }
        }
      }

      return styledElement;
    });

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
      // CRITICAL: Include ALL layout elements exactly as defined in template
      layoutElements: styledLayoutElements.length > 0 ? styledLayoutElements : undefined,
    };

    // Debug logging
    console.log('=== SLIDE BUILT FROM LAYOUT ELEMENTS ===');
    console.log('Template:', template.name);
    console.log('Layout elements processed:', layoutElements.length);
    console.log('Styled layout elements count:', styledLayoutElements.length);

    // Verify zone values are preserved correctly
    console.log('\n📐 ZONE VALUES VERIFICATION:');
    styledLayoutElements.forEach((el: any, index: number) => {
      if (el.zone) {
        console.log(`  Element ${index + 1} (${el.id}): x=${el.zone.x}, y=${el.zone.y}, width=${el.zone.width}, height=${el.zone.height}`);
      } else {
        console.warn(`  ⚠️ Element ${index + 1} (${el.id}): MISSING ZONE!`);
      }
    });

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
   * Create custom template from existing slide or template data
   * Supports both old slide-based format and new template data format
   */
  async createCustomTemplate(
    userId: string,
    slideOrTemplateData: any,
    templateName?: string,
    description?: string
  ) {
    try {
      let templateData: any;
      let themeId: string | undefined;

      // Check if this is the new format (template data object with name, category, etc.)
      if (slideOrTemplateData && slideOrTemplateData.name && slideOrTemplateData.category) {
        // New format: full template data from design studio
        templateData = {
          slug: slideOrTemplateData.slug || `custom-${Date.now()}`,
          name: slideOrTemplateData.name,
          category: slideOrTemplateData.category,
          description: slideOrTemplateData.description || null,
          thumbnail: slideOrTemplateData.thumbnail || null,
          layout: slideOrTemplateData.layout || { zones: [] },
          defaultStyling: slideOrTemplateData.defaultStyling || slideOrTemplateData.styling || {},
          contentSchema: slideOrTemplateData.contentSchema || { fields: [] },
          positioningRules: slideOrTemplateData.positioningRules || null,
          isDefault: slideOrTemplateData.isDefault || false,
          isEnabled: slideOrTemplateData.isEnabled !== undefined ? slideOrTemplateData.isEnabled : true,
          displayOrder: slideOrTemplateData.displayOrder || 999,
          isSystem: false,
          userId,
          tags: slideOrTemplateData.tags || ['custom', 'user-created'],
          version: slideOrTemplateData.version || '1.0',
        };
        themeId = slideOrTemplateData.themeId;
      } else {
        // Old format: slide-based creation
        const slide = slideOrTemplateData;
        templateData = {
          slug: `custom-${Date.now()}`,
          name: templateName || slide.title || 'Untitled Template',
          category: slide.type || 'content',
          description: description || `Custom template based on ${slide.title}`,
          thumbnail: null,
          layout: { type: slide.layout || 'freeform', elements: [] },
          defaultStyling: slide.styling || {},
          contentSchema: this.inferContentSchema(slide),
          positioningRules: slide.positionedElements || {},
          isDefault: false,
          isEnabled: true,
          displayOrder: 999,
          isSystem: false,
          userId,
          tags: ['custom', 'user-created'],
          version: '1.0',
        };
      }

      // Handle themeId - validate it exists if provided
      if (themeId) {
        const [theme] = await db
          .select()
          .from(themes)
          .where(eq(themes.id, themeId))
          .limit(1);

        if (!theme) {
          throw new Error(`Theme not found: ${themeId}`);
        }

        templateData.themeId = themeId;
      } else {
        // Assign to default theme if no themeId provided
        const [defaultTheme] = await db
          .select()
          .from(themes)
          .where(eq(themes.isDefault, true))
          .limit(1);

        if (defaultTheme) {
          templateData.themeId = defaultTheme.id;
        } else {
          throw new Error('No default theme found. Please create a theme first.');
        }
      }

      const [newTemplate] = await db
        .insert(slideTemplates)
        .values(templateData)
        .returning();

      // Update cache
      this.templateCache.set(newTemplate.id, newTemplate);

      console.log(`Created custom template: ${templateData.name}${themeId ? ` (theme: ${themeId})` : ''}`);
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

  // ============================================================================
  // THEME MANAGEMENT METHODS
  // ============================================================================

  /**
   * Generate an SVG placeholder thumbnail for theme
   */
  private generateThemeThumbnailDataUri(themeName: string): string {
    const svg = `<svg width="400" height="225" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="225" fill="url(#grad)"/>
      <rect x="20" y="20" width="360" height="185" fill="white" rx="8" opacity="0.9"/>
      <rect x="40" y="50" width="120" height="12" fill="#667eea" opacity="0.3" rx="6"/>
      <rect x="40" y="75" width="200" height="8" fill="#667eea" opacity="0.2" rx="4"/>
      <rect x="40" y="95" width="180" height="8" fill="#667eea" opacity="0.2" rx="4"/>
      <rect x="40" y="115" width="160" height="8" fill="#667eea" opacity="0.2" rx="4"/>
      <circle cx="340" cy="60" r="20" fill="#667eea" opacity="0.2"/>
      <text x="200" y="185" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="#667eea" text-anchor="middle">${themeName}</text>
      <text x="200" y="200" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#667eea" opacity="0.6" text-anchor="middle">THEME</text>
    </svg>`;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }

  /**
   * Load all themes from filesystem
   */
  private async loadSystemThemes(): Promise<ThemeDefinition[]> {
    const themeDefinitions: ThemeDefinition[] = [];

    if (!fs.existsSync(this.themesPath)) {
      console.warn(`Themes path not found: ${this.themesPath}`);
      return themeDefinitions;
    }

    const files = fs.readdirSync(this.themesPath).filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const filePath = path.join(this.themesPath, file);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const themeData = JSON.parse(fileContent);

        // Basic validation
        if (!themeData.id || !themeData.name || !Array.isArray(themeData.templateIds)) {
          console.error(`Invalid theme ${file}: missing required fields`);
          continue;
        }

        themeDefinitions.push(themeData);
      } catch (error) {
        console.error(`Error loading theme ${file}:`, error);
      }
    }

    return themeDefinitions;
  }

  /**
   * Sync theme to database
   */
  private async syncThemeToDatabase(theme: ThemeDefinition) {
    try {
      // Check if theme exists by slug
      const [existing] = await db
        .select()
        .from(themes)
        .where(eq(themes.slug, theme.id))
        .limit(1);

      // Generate SVG thumbnail as data URI
      const thumbnail = this.generateThemeThumbnailDataUri(theme.name);

      let themeId: string;

      if (!existing) {
        // Insert new theme - use all values from JSON
        const themeData = {
          slug: theme.id,
          name: theme.name,
          description: theme.description || null,
          thumbnail,
          accessTier: theme.accessTier || 'premium',
          isDefault: theme.isDefault || false,
          isEnabled: theme.isEnabled !== undefined ? theme.isEnabled : true,
          displayOrder: theme.displayOrder || 0,
          tags: theme.tags || [],
          metadata: theme.metadata || {},
        };
        const [inserted] = await db.insert(themes).values(themeData).returning({ id: themes.id });
        themeId = inserted.id;
        console.log(`✓ Inserted theme: ${theme.name}`);
      } else {
        themeId = existing.id;
        // BUG FIX: Only update metadata and structural info from JSON file
        // PRESERVE user-editable fields from database: accessTier, isDefault, isEnabled, displayOrder
        const updateData = {
          name: theme.name,
          description: theme.description || null,
          thumbnail,
          // Only update tags and metadata from JSON - these are structural/design related
          tags: theme.tags || existing.tags || [],
          metadata: theme.metadata || existing.metadata || {},
          updatedAt: new Date(),
          // PRESERVE these from existing DB values (user-editable):
          // - accessTier (free/premium)
          // - isDefault
          // - isEnabled
          // - displayOrder
        };
        await db
          .update(themes)
          .set(updateData)
          .where(eq(themes.id, existing.id));
        console.log(`↻ Synced theme metadata: ${theme.name} (preserved user settings: accessTier=${existing.accessTier}, isEnabled=${existing.isEnabled})`);
      }

      // Sync theme-template associations
      await this.syncThemeTemplateAssociations(themeId, theme.templateIds);
    } catch (error) {
      console.error(`Error syncing theme ${theme.id}:`, error);
    }
  }

  /**
   * Sync theme-template associations (update template themeId directly)
   */
  private async syncThemeTemplateAssociations(themeId: string, templateSlugs: string[]) {
    try {
      // Get template IDs from slugs
      const templates = await db
        .select({ id: slideTemplates.id, slug: slideTemplates.slug })
        .from(slideTemplates)
        .where(inArray(slideTemplates.slug, templateSlugs));

      const templateIds = templates.map(t => t.id);
      const templateSlugMap = new Map(templates.map(t => [t.slug, t.id]));

      // Get templates currently in this theme
      const existingTemplates = await db
        .select({ id: slideTemplates.id })
        .from(slideTemplates)
        .where(eq(slideTemplates.themeId, themeId));

      const existingTemplateIds = new Set(existingTemplates.map(t => t.id));

      // Find templates to add to this theme (in theme definition but not assigned to theme)
      const templatesToAdd = templateIds.filter(id => !existingTemplateIds.has(id));

      // Find templates to remove from this theme (assigned to theme but not in definition)
      const templatesToRemove = existingTemplates
        .filter(t => !templateIds.includes(t.id))
        .map(t => t.id);

      // Add templates to theme (update themeId)
      if (templatesToAdd.length > 0) {
        await db
          .update(slideTemplates)
          .set({ themeId, updatedAt: new Date() })
          .where(inArray(slideTemplates.id, templatesToAdd));
        console.log(`  → Added ${templatesToAdd.length} templates to theme`);
      }

      // Remove templates from theme (assign to default theme)
      if (templatesToRemove.length > 0) {
        // Get default theme
        const [defaultTheme] = await db
          .select({ id: themes.id })
          .from(themes)
          .where(eq(themes.isDefault, true))
          .limit(1);

        if (defaultTheme) {
          await db
            .update(slideTemplates)
            .set({ themeId: defaultTheme.id, updatedAt: new Date() })
            .where(inArray(slideTemplates.id, templatesToRemove));
          console.log(`  → Removed ${templatesToRemove.length} templates from theme (assigned to default)`);
        } else {
          console.warn(`  ⚠ Cannot remove templates: no default theme found`);
        }
      }

      // Warn about missing templates
      const missingTemplates = templateSlugs.filter(slug => !templateSlugMap.has(slug));
      if (missingTemplates.length > 0) {
        console.warn(`  ⚠ Theme references missing templates: ${missingTemplates.join(', ')}`);
      }
    } catch (error) {
      console.error(`Error syncing theme-template associations:`, error);
    }
  }

  /**
   * Create a new theme
   */
  async createTheme(themeData: {
    name: string;
    slug: string;
    description?: string;
    accessTier?: 'free' | 'premium';
    isDefault?: boolean;
    tags?: string[];
    metadata?: any;
  }) {
    try {
      // If setting as default, unset all other default themes
      if (themeData.isDefault) {
        await db
          .update(themes)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(themes.isDefault, true));
      }

      // Generate thumbnail
      const thumbnail = this.generateThemeThumbnailDataUri(themeData.name);

      const newThemeData = {
        slug: themeData.slug,
        name: themeData.name,
        description: themeData.description || null,
        thumbnail,
        accessTier: themeData.accessTier || 'premium',
        isDefault: themeData.isDefault || false,
        isEnabled: true,
        displayOrder: 0,
        tags: themeData.tags || [],
        metadata: themeData.metadata || {},
      };

      const [newTheme] = await db
        .insert(themes)
        .values(newThemeData)
        .returning();

      this.themeCache.set(newTheme.id, newTheme);
      console.log(`Created theme: ${themeData.name}`);
      return newTheme;
    } catch (error) {
      console.error('Error creating theme:', error);
      throw error;
    }
  }

  /**
   * Update an existing theme
   */
  async updateTheme(themeId: string, updates: {
    name?: string;
    slug?: string;
    description?: string;
    accessTier?: 'free' | 'premium';
    isDefault?: boolean;
    isEnabled?: boolean;
    displayOrder?: number;
    tags?: string[];
    metadata?: any;
  }) {
    try {
      // Check if theme exists first
      const existingTheme = await this.getTheme(themeId);
      if (!existingTheme) {
        throw new Error('Theme not found');
      }

      // If slug is being updated, check if it conflicts with another theme
      if (updates.slug !== undefined && updates.slug !== existingTheme.slug) {
        const [conflictingTheme] = await db
          .select({ id: themes.id })
          .from(themes)
          .where(and(
            eq(themes.slug, updates.slug),
            ne(themes.id, themeId)
          ))
          .limit(1);

        if (conflictingTheme) {
          throw new Error(`A theme with slug "${updates.slug}" already exists`);
        }
      }

      // If setting as default, unset all other default themes first
      if (updates.isDefault === true) {
        await db
          .update(themes)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(
            eq(themes.isDefault, true),
            ne(themes.id, themeId)
          ));
      }

      const updateData: any = {
        updatedAt: new Date(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.slug !== undefined) updateData.slug = updates.slug;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.accessTier !== undefined) updateData.accessTier = updates.accessTier;
      if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;
      if (updates.isEnabled !== undefined) updateData.isEnabled = updates.isEnabled;
      if (updates.displayOrder !== undefined) updateData.displayOrder = updates.displayOrder;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

      // Regenerate thumbnail if name changed
      if (updates.name !== undefined) {
        updateData.thumbnail = this.generateThemeThumbnailDataUri(updates.name);
      }

      // Only update if there are fields to update (besides updatedAt)
      const fieldsToUpdate = Object.keys(updateData).filter(key => key !== 'updatedAt');
      if (fieldsToUpdate.length === 0) {
        // No fields to update, just return the existing theme
        return existingTheme;
      }

      console.log('Updating theme with data:', JSON.stringify(updateData, null, 2));

      const [updatedTheme] = await db
        .update(themes)
        .set(updateData)
        .where(eq(themes.id, themeId))
        .returning();
      // #endregion

      if (!updatedTheme) {
        throw new Error('Theme update returned no result');
      }

      this.themeCache.set(themeId, updatedTheme);
      console.log(`Updated theme: ${updatedTheme.name}`);

      return updatedTheme;
    } catch (error: any) {
      console.error('Error updating theme:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint,
        stack: error.stack
      });

      // Provide more specific error messages
      if (error.code === '23505') { // Unique violation
        throw new Error('A theme with this slug already exists');
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to update theme: ' + String(error));
      }
    }
  }

  /**
   * Rebuild theme cache
   */
  async rebuildThemeCache() {
    try {
      const allThemes = await db
        .select()
        .from(themes)
        .where(eq(themes.isEnabled, true));

      this.themeCache.clear();
      for (const theme of allThemes) {
        this.themeCache.set(theme.id, theme);
      }

      console.log(`Theme cache rebuilt with ${this.themeCache.size} themes`);
    } catch (error) {
      console.error('Error rebuilding theme cache:', error);
    }
  }

  /**
   * Get theme by ID
   */
  async getTheme(themeId: string): Promise<Theme | null> {
    // Check cache first
    if (this.themeCache.has(themeId)) {
      return this.themeCache.get(themeId);
    }

    // Fallback to database
    try {
      const [theme] = await db
        .select()
        .from(themes)
        .where(eq(themes.id, themeId))
        .limit(1);

      if (theme) {
        return {
          ...theme,
          accessTier: theme.accessTier as any,
          isDefault: theme.isDefault || false,
          isEnabled: theme.isEnabled || false,
          displayOrder: theme.displayOrder || 0,
          tags: theme.tags || [],
          metadata: theme.metadata as any,
          createdAt: theme.createdAt || new Date(),
          updatedAt: theme.updatedAt || new Date()
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting theme:', error);
      return null;
    }
  }

  /**
   * Get all themes with optional filters
   */
  async getThemes(filters?: {
    accessTier?: string;
    isEnabled?: boolean;
    searchTerm?: string;
    tags?: string[];
  }): Promise<Theme[]> {
    try {
      console.log('getThemes called with filters:', JSON.stringify(filters));

      // Direct database query
      let allThemes;
      try {
        allThemes = await db.select().from(themes);
        console.log(`getThemes: Database query successful, found ${allThemes.length} themes`);
      } catch (dbError) {
        console.error('getThemes: Database query failed:', dbError);
        if (dbError instanceof Error) {
          console.error('Database error message:', dbError.message);
          console.error('Database error stack:', dbError.stack);
        }
        throw dbError;
      }

      console.log(`getThemes: Found ${allThemes.length} themes in database`);
      if (allThemes.length > 0) {
        console.log('Sample theme:', JSON.stringify(allThemes[0], null, 2));
      } else {
        console.warn('getThemes: WARNING - No themes found in database!');
      }

      // Apply client-side filtering
      let filtered = allThemes;

      if (filters?.isEnabled !== undefined) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(t => t.isEnabled === filters.isEnabled);
        console.log(`After isEnabled filter (${filters.isEnabled}): ${beforeCount} -> ${filtered.length} themes`);
      }

      if (filters?.accessTier) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(t => t.accessTier === filters.accessTier);
        console.log(`After accessTier filter (${filters.accessTier}): ${beforeCount} -> ${filtered.length} themes`);
      }

      if (filters?.tags && filters.tags.length > 0) {
        const beforeCount = filtered.length;
        filtered = filtered.filter(t =>
          t.tags?.some(tag => filters.tags!.includes(tag))
        );
        console.log(`After tags filter: ${beforeCount} -> ${filtered.length} themes`);
      }

      if (filters?.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const beforeCount = filtered.length;
        filtered = filtered.filter(t =>
          t.name.toLowerCase().includes(term) ||
          (t.description && t.description.toLowerCase().includes(term))
        );
        console.log(`After searchTerm filter (${filters.searchTerm}): ${beforeCount} -> ${filtered.length} themes`);
      }

      // Sort by display order
      filtered.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

      console.log(`getThemes: Returning ${filtered.length} themes after filtering`);
      return filtered.map(t => ({
        ...t,
        accessTier: t.accessTier as any,
        isDefault: t.isDefault || false,
        isEnabled: t.isEnabled || false,
        displayOrder: t.displayOrder || 0,
        tags: t.tags || [],
        metadata: t.metadata as any,
        createdAt: t.createdAt || new Date(),
        updatedAt: t.updatedAt || new Date()
      }));
    } catch (error) {
      console.error('Error getting themes:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return [];
    }
  }

  /**
   * Get theme with all associated templates
   */
  async getThemeWithTemplates(themeId: string): Promise<Theme | null> {
    const theme = await this.getTheme(themeId);
    if (!theme) {
      return null;
    }

    // Get templates directly via themeId FK (no junction table needed)
    const templates = await db
      .select()
      .from(slideTemplates)
      .where(eq(slideTemplates.themeId, themeId));

    return {
      ...theme,
      accessTier: theme.accessTier as any,
      isDefault: theme.isDefault || false,
      isEnabled: theme.isEnabled || false,
      displayOrder: theme.displayOrder || 0,
      tags: theme.tags || [],
      metadata: theme.metadata as any,
      createdAt: theme.createdAt || new Date(),
      updatedAt: theme.updatedAt || new Date(),
      templates: templates.map(t => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        category: t.category as any,
        description: t.description || '', // Ensure string if interface requires it, or update interface. types.ts says description: string.
        thumbnail: t.thumbnail || '',
        themeId: t.themeId,
        isDefault: t.isDefault || false,
        isEnabled: t.isEnabled || true,
        displayOrder: t.displayOrder || 0,
        tags: t.tags || [],
        version: t.version || '1.0.0',
        layout: t.layout as any,
        styling: t.defaultStyling as any,
        contentSchema: t.contentSchema as any,
        metadata: {
          author: 'system', // Default values since DB might not have metadata column broken out this way
          createdAt: t.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: t.updatedAt?.toISOString() || new Date().toISOString(),
          difficulty: 'medium'
        }
      })),
    };
  }

  /**
   * Get all templates in a theme
   */
  async getTemplatesByTheme(themeId: string, userId?: string) {
    try {
      // Get templates directly via themeId FK
      const templates = await db
        .select()
        .from(slideTemplates)
        .where(and(
          eq(slideTemplates.themeId, themeId),
          eq(slideTemplates.isEnabled, true)
        ));

      // Get templates with access control if userId provided
      if (userId) {
        const allUserTemplates = await this.getTemplatesForUser(userId);
        const templateIds = templates.map(t => t.id);
        // Filter to only templates in this theme with access control
        return allUserTemplates.filter(t => templateIds.includes(t.id));
      }

      return templates;
    } catch (error) {
      console.error('Error getting templates by theme:', error);
      return [];
    }
  }

  /**
   * Get themes for user (with access control)
   */
  async getThemesForUser(userId: string, filters?: {
    searchTerm?: string;
    tags?: string[];
  }) {
    try {
      console.log(`getThemesForUser: Starting for userId=${userId}`);

      const userSubscription = await subscriptionService.getUserSubscription(userId);
      const isPremium = userSubscription?.tier !== 'free';

      console.log(`getThemesForUser: userId=${userId}, isPremium=${isPremium}, subscription:`, userSubscription);

      // Get all enabled themes first (without other filters to see what we have)
      const allEnabledThemes = await this.getThemes({
        isEnabled: true,
      });

      console.log(`getThemesForUser: Found ${allEnabledThemes.length} enabled themes (before search/tag filters)`);

      // Now apply search and tag filters
      const allThemes = await this.getThemes({
        isEnabled: true,
        ...filters,
      });

      console.log(`getThemesForUser: Got ${allThemes.length} themes from getThemes after filters`);

      // Add access control flags (but don't filter out premium themes - just mark them as locked)
      const themesWithAccess = allThemes.map(theme => ({
        ...theme,
        isLocked: theme.accessTier === 'premium' && !isPremium,
        requiresUpgrade: theme.accessTier === 'premium' && !isPremium,
      }));

      console.log(`getThemesForUser: Returning ${themesWithAccess.length} themes with access control`);
      console.log(`getThemesForUser: Locked themes: ${themesWithAccess.filter(t => t.isLocked).length}`);

      return themesWithAccess;
    } catch (error) {
      console.error('Error getting themes for user:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return [];
    }
  }
}

// Singleton instance
export const templateManager = new TemplateManager();

