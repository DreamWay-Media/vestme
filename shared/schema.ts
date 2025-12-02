import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  industry: varchar("industry"),
  websiteUrl: varchar("website_url"),
  status: varchar("status").notNull().default("draft"), // draft, discovery, brand_kit, deck_ready, campaign_active
  businessProfile: jsonb("business_profile"), // Structured JSON from AI analysis including enhanced research data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Brand Kits table
export const brandKits = pgTable("brand_kits", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  name: varchar("name").notNull(),
  logoUrl: varchar("logo_url"),
  primaryColor: varchar("primary_color"),
  secondaryColor: varchar("secondary_color"),
  accentColor: varchar("accent_color"),
  fontFamily: varchar("font_family"),
  brandAssets: jsonb("brand_assets"), // Array of asset URLs and metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Media Assets table - stores images and other media for projects
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: varchar("filename").notNull(),
  originalFilename: varchar("original_filename"),
  fileType: varchar("file_type").notNull(), // image/jpeg, image/png, etc.
  fileSize: integer("file_size").notNull(), // in bytes
  storageUrl: varchar("storage_url").notNull(), // Supabase storage URL
  thumbnailUrl: varchar("thumbnail_url"), // Optional thumbnail for preview
  width: integer("width"), // Image width in pixels
  height: integer("height"), // Image height in pixels
  source: varchar("source").notNull(), // 'upload', 'website_extraction', 'ai_generated'
  sourceUrl: varchar("source_url"), // Original URL if extracted from website
  tags: jsonb("tags"), // Array of tags for AI context
  description: text("description"), // User-provided description
  altText: text("alt_text"), // Accessibility text
  metadata: jsonb("metadata"), // Additional metadata (dominant colors, AI analysis, etc.)
  usageCount: integer("usage_count").default(0), // Track how many times used in slides
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Pitch Decks table
export const decks = pgTable("decks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  brandKitId: uuid("brand_kit_id").references(() => brandKits.id),
  title: varchar("title").notNull(),
  slides: jsonb("slides").notNull(), // Array of slide objects with content and layout
  pdfUrl: varchar("pdf_url"), // Generated PDF URL
  googleSlidesId: varchar("google_slides_id"), // Google Slides integration
  googleSlidesUrl: varchar("google_slides_url"), // Google Slides URL
  status: varchar("status").notNull().default("draft"), // draft, generated, published
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CRM Contacts table
export const crmContacts = pgTable("crm_contacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email").notNull(),
  company: varchar("company"),
  title: varchar("title"),
  phone: varchar("phone"),
  notes: text("notes"),
  tags: text("tags").array().default(sql`'{}'::text[]`), // Array of tag strings for filtering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  deckId: uuid("deck_id").notNull().references(() => decks.id),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  message: text("message").notNull(),
  status: varchar("status").notNull().default("draft"), // draft, sent, active, completed
  sentCount: integer("sent_count").default(0),
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Campaign Recipients table
export const campaignRecipients = pgTable("campaign_recipients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid("campaign_id").notNull().references(() => campaigns.id),
  contactId: uuid("contact_id").notNull().references(() => crmContacts.id),
  status: varchar("status").notNull().default("pending"), // pending, sent, opened, clicked
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity Log table
export const activityLog = pgTable("activity_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  projectId: uuid("project_id").references(() => projects.id),
  action: varchar("action").notNull(), // project_created, deck_generated, campaign_sent, etc.
  description: text("description").notNull(),
  metadata: jsonb("metadata"), // Additional context data
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  crmContacts: many(crmContacts),
  audiences: many(audiences),
  activities: many(activityLog),
  subscriptions: many(userSubscriptions),
  customTemplates: many(slideTemplates),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  brandKits: many(brandKits),
  mediaAssets: many(mediaAssets),
  decks: many(decks),
  campaigns: many(campaigns),
  activities: many(activityLog),
}));

export const brandKitsRelations = relations(brandKits, ({ one, many }) => ({
  project: one(projects, {
    fields: [brandKits.projectId],
    references: [projects.id],
  }),
  decks: many(decks),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  project: one(projects, {
    fields: [mediaAssets.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [mediaAssets.userId],
    references: [users.id],
  }),
}));

export const decksRelations = relations(decks, ({ one, many }) => ({
  project: one(projects, {
    fields: [decks.projectId],
    references: [projects.id],
  }),
  brandKit: one(brandKits, {
    fields: [decks.brandKitId],
    references: [brandKits.id],
  }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  project: one(projects, {
    fields: [campaigns.projectId],
    references: [projects.id],
  }),
  deck: one(decks, {
    fields: [campaigns.deckId],
    references: [decks.id],
  }),
  recipients: many(campaignRecipients),
}));

export const crmContactsRelations = relations(crmContacts, ({ one, many }) => ({
  user: one(users, {
    fields: [crmContacts.userId],
    references: [users.id],
  }),
  campaignRecipients: many(campaignRecipients),
}));



// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  industry: z.string().optional(),
  websiteUrl: z.string().optional().refine((url) => {
    if (!url || url.trim() === '') return true; // Allow empty/optional
    const trimmedUrl = url.trim();
    // Check if URL starts with http:// or https://
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return false;
    }
    // Validate URL format
    try {
      new URL(trimmedUrl);
      return true;
    } catch {
      return false;
    }
  }, {
    message: "Website URL must start with http:// or https:// and be a valid URL format"
  })
});

export const insertBrandKitSchema = createInsertSchema(brandKits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMediaAssetSchema = createInsertSchema(mediaAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDeckSchema = createInsertSchema(decks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCrmContactSchema = createInsertSchema(crmContacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});



// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Add saved audiences for CRM functionality
export const audiences = pgTable("audiences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  description: text("description"),
  filterCriteria: jsonb("filter_criteria").notNull(), // stores tag filters, company filters, etc.
  contactIds: text("contact_ids").array().default(sql`'{}'::text[]`), // cached contact IDs for performance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const audiencesRelations = relations(audiences, ({ one }) => ({
  user: one(users, {
    fields: [audiences.userId],
    references: [users.id],
  }),
}));

export const insertAudienceSchema = createInsertSchema(audiences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Slide Templates table
export const slideTemplates = pgTable("slide_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").notNull().unique(), // String identifier for system templates (e.g., 'hero-title-v1')
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // 'title', 'content', 'data', 'closing'
  description: text("description"),
  thumbnail: varchar("thumbnail"),
  
  // Template configuration
  layout: jsonb("layout").notNull(),
  defaultStyling: jsonb("default_styling").notNull(),
  contentSchema: jsonb("content_schema").notNull(),
  positioningRules: jsonb("positioning_rules"),
  
  // Access control
  accessTier: varchar("access_tier").notNull().default("premium"), // 'free' or 'premium'
  isDefault: boolean("is_default").default(false),
  isEnabled: boolean("is_enabled").default(true),
  displayOrder: integer("display_order").default(0),
  
  // Metadata
  isSystem: boolean("is_system").default(true),
  userId: varchar("user_id").references(() => users.id),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  version: varchar("version").default("1.0"),
  customizedByAdmin: timestamp("customized_by_admin"), // Set when admin edits, prevents JSON sync overwrite
  
  // Analytics
  usageCount: integer("usage_count").default(0),
  lastUsedAt: timestamp("last_used_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tier: varchar("tier").notNull().default("free"), // 'free', 'pro', 'enterprise'
  status: varchar("status").notNull().default("active"), // 'active', 'cancelled', 'expired'
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project Template Overrides table
export const projectTemplateOverrides = pgTable("project_template_overrides", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  templateId: uuid("template_id").notNull().references(() => slideTemplates.id),
  stylingOverrides: jsonb("styling_overrides"),
  layoutOverrides: jsonb("layout_overrides"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for new tables
export const slideTemplatesRelations = relations(slideTemplates, ({ one, many }) => ({
  user: one(users, {
    fields: [slideTemplates.userId],
    references: [users.id],
  }),
  projectOverrides: many(projectTemplateOverrides),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
}));

export const projectTemplateOverridesRelations = relations(projectTemplateOverrides, ({ one }) => ({
  project: one(projects, {
    fields: [projectTemplateOverrides.projectId],
    references: [projects.id],
  }),
  template: one(slideTemplates, {
    fields: [projectTemplateOverrides.templateId],
    references: [slideTemplates.id],
  }),
}));

// Insert schemas for new tables
export const insertSlideTemplateSchema = createInsertSchema(slideTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectTemplateOverrideSchema = createInsertSchema(projectTemplateOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertBrandKit = z.infer<typeof insertBrandKitSchema>;
export type BrandKit = typeof brandKits.$inferSelect;
export type InsertMediaAsset = z.infer<typeof insertMediaAssetSchema>;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type InsertDeck = z.infer<typeof insertDeckSchema>;
export type Deck = typeof decks.$inferSelect;
export type InsertCrmContact = z.infer<typeof insertCrmContactSchema>;
export type CrmContact = typeof crmContacts.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertAudience = z.infer<typeof insertAudienceSchema>;
export type Audience = typeof audiences.$inferSelect;
export type InsertSlideTemplate = z.infer<typeof insertSlideTemplateSchema>;
export type SlideTemplate = typeof slideTemplates.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertProjectTemplateOverride = z.infer<typeof insertProjectTemplateOverrideSchema>;
export type ProjectTemplateOverride = typeof projectTemplateOverrides.$inferSelect;
