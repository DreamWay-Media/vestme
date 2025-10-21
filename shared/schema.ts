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

// Pitch Decks table
export const decks = pgTable("decks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  brandKitId: uuid("brand_kit_id").references(() => brandKits.id),
  title: varchar("title").notNull(),
  slides: jsonb("slides").notNull(), // Array of slide objects with content and layout
  pdfUrl: varchar("pdf_url"), // Generated PDF URL
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
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  brandKits: many(brandKits),
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


export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertBrandKit = z.infer<typeof insertBrandKitSchema>;
export type BrandKit = typeof brandKits.$inferSelect;
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
