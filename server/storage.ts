import {
  users,
  projects,
  brandKits,
  decks,
  crmContacts,
  campaigns,
  campaignRecipients,
  activityLog,
  audiences,
  type User,
  type UpsertUser,
  type InsertProject,
  type Project,
  type InsertBrandKit,
  type BrandKit,
  type InsertDeck,
  type Deck,
  type InsertCrmContact,
  type CrmContact,
  type InsertCampaign,
  type Campaign,
  type InsertActivityLog,
  type ActivityLog,
  type InsertAudience,
  type Audience,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;

  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getUserProjects(userId: string): Promise<Project[]>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Brand Kit operations
  createBrandKit(brandKit: InsertBrandKit): Promise<BrandKit>;
  getBrandKit(id: string): Promise<BrandKit | undefined>;
  getProjectBrandKits(projectId: string): Promise<BrandKit[]>;
  updateBrandKit(id: string, updates: Partial<BrandKit>): Promise<BrandKit>;

  // Deck operations
  createDeck(deck: InsertDeck): Promise<Deck>;
  getDeck(id: string): Promise<Deck | undefined>;
  getProjectDecks(projectId: string): Promise<Deck[]>;
  updateDeck(id: string, updates: Partial<Deck>): Promise<Deck>;

  // Slide operations (handled within deck slides JSON field)
  createSlide(slideData: any): Promise<any>;
  updateSlide(id: string, updates: any): Promise<any | undefined>;
  deleteSlide(id: string): Promise<void>;

  // CRM operations
  createContact(contact: InsertCrmContact): Promise<CrmContact>;
  getContact(id: string): Promise<CrmContact | undefined>;
  getUserContacts(userId: string): Promise<CrmContact[]>;
  updateContact(id: string, updates: Partial<CrmContact>): Promise<CrmContact>;
  deleteContact(id: string): Promise<void>;

  // Campaign operations
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  getProjectCampaigns(projectId: string): Promise<Campaign[]>;
  updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign>;
  
  // Campaign Recipients operations
  addCampaignRecipients(campaignId: string, contactIds: string[]): Promise<void>;
  getCampaignRecipients(campaignId: string): Promise<any[]>;
  updateRecipientStatus(campaignId: string, contactId: string, status: string): Promise<void>;

  // Audience operations
  createAudience(audience: InsertAudience): Promise<Audience>;
  getAudience(id: string): Promise<Audience | undefined>;
  getUserAudiences(userId: string): Promise<Audience[]>;
  updateAudience(id: string, updates: Partial<Audience>): Promise<Audience>;
  deleteAudience(id: string): Promise<void>;
  getContactsByFilter(userId: string, filterCriteria: any): Promise<CrmContact[]>;

  // Activity log operations
  logActivity(activity: InsertActivityLog): Promise<ActivityLog>;
  getUserActivities(userId: string, limit?: number): Promise<ActivityLog[]>;

  // Dashboard stats
  getDashboardStats(userId: string): Promise<{
    totalProjects: number;
    generatedDecks: number;
    campaignsSent: number;
    totalViews: number;
  }>;
  
  // Project Analytics
  getProjectAnalytics(projectId: string): Promise<{
    totalViews: number;
    totalDownloads: number;
    campaignsSent: number;
    campaignsOpened: number;
    campaignsClicked: number;
    avgEngagementRate: number;
    recentActivities: any[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.updatedAt));
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    // Delete related records first to avoid foreign key constraints
    // Order is important: delete child records before parent records
    
    // 1. Get all campaigns for this project
    const projectCampaigns = await db.select().from(campaigns).where(eq(campaigns.projectId, id));
    const campaignIds = projectCampaigns.map(c => c.id);
    
    // 2. Delete campaign recipients first (they reference campaigns)
    if (campaignIds.length > 0) {
      for (const campaignId of campaignIds) {
        await db.delete(campaignRecipients).where(eq(campaignRecipients.campaignId, campaignId));
      }
    }
    
    // 3. Delete campaigns (they reference projects and decks)
    await db.delete(campaigns).where(eq(campaigns.projectId, id));
    
    // 4. Delete activity logs (they reference projects)
    await db.delete(activityLog).where(eq(activityLog.projectId, id));
    
    // 5. Delete decks (they reference projects and brand kits)
    await db.delete(decks).where(eq(decks.projectId, id));
    
    // 6. Delete brand kits (they reference projects)
    await db.delete(brandKits).where(eq(brandKits.projectId, id));
    
    // 7. Finally, delete the project itself
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Brand Kit operations
  async createBrandKit(brandKit: InsertBrandKit): Promise<BrandKit> {
    const [newBrandKit] = await db.insert(brandKits).values(brandKit).returning();
    return newBrandKit;
  }

  async getBrandKit(id: string): Promise<BrandKit | undefined> {
    const [brandKit] = await db.select().from(brandKits).where(eq(brandKits.id, id));
    return brandKit;
  }

  async getProjectBrandKits(projectId: string): Promise<BrandKit[]> {
    return await db
      .select()
      .from(brandKits)
      .where(eq(brandKits.projectId, projectId))
      .orderBy(desc(brandKits.createdAt));
  }

  async updateBrandKit(id: string, updates: Partial<BrandKit>): Promise<BrandKit> {
    console.log('Storage: Updating brand kit with ID:', id);
    console.log('Storage: Updates being applied:', updates);
    console.log('Storage: brandAssets in updates:', updates.brandAssets);
    
    const [updatedBrandKit] = await db
      .update(brandKits)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(brandKits.id, id))
      .returning();
      
    console.log('Storage: Brand kit updated successfully');
    console.log('Storage: Updated brand kit data:', updatedBrandKit);
    console.log('Storage: brandAssets after update:', updatedBrandKit.brandAssets);
    
    return updatedBrandKit;
  }

  // Deck operations
  async createDeck(deck: InsertDeck): Promise<Deck> {
    const [newDeck] = await db.insert(decks).values(deck).returning();
    return newDeck;
  }

  async getDeck(id: string): Promise<Deck | undefined> {
    const [deck] = await db.select().from(decks).where(eq(decks.id, id));
    return deck;
  }

  async getProjectDecks(projectId: string): Promise<Deck[]> {
    return await db
      .select()
      .from(decks)
      .where(eq(decks.projectId, projectId))
      .orderBy(desc(decks.createdAt));
  }

  async updateDeck(id: string, updates: Partial<Deck>): Promise<Deck> {
    const [updatedDeck] = await db
      .update(decks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(decks.id, id))
      .returning();
    return updatedDeck;
  }

  // CRM operations
  async createContact(contact: InsertCrmContact): Promise<CrmContact> {
    const [newContact] = await db.insert(crmContacts).values(contact).returning();
    return newContact;
  }

  async getContact(id: string): Promise<CrmContact | undefined> {
    const [contact] = await db.select().from(crmContacts).where(eq(crmContacts.id, id));
    return contact;
  }

  async getUserContacts(userId: string): Promise<CrmContact[]> {
    return await db
      .select()
      .from(crmContacts)
      .where(eq(crmContacts.userId, userId))
      .orderBy(desc(crmContacts.createdAt));
  }

  async updateContact(id: string, updates: Partial<CrmContact>): Promise<CrmContact> {
    const [updatedContact] = await db
      .update(crmContacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(crmContacts.id, id))
      .returning();
    return updatedContact;
  }

  async deleteContact(id: string): Promise<void> {
    await db.delete(crmContacts).where(eq(crmContacts.id, id));
  }

  // Campaign operations
  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async getProjectCampaigns(projectId: string): Promise<Campaign[]> {
    return await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.projectId, projectId))
      .orderBy(desc(campaigns.createdAt));
  }

  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const [updatedCampaign] = await db
      .update(campaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return updatedCampaign;
  }

  // Campaign Recipients operations
  async addCampaignRecipients(campaignId: string, contactIds: string[]): Promise<void> {
    if (contactIds.length === 0) return;
    
    const recipients = contactIds.map(contactId => ({
      campaignId,
      contactId,
      status: 'pending'
    }));
    
    await db.insert(campaignRecipients).values(recipients);
  }

  async getCampaignRecipients(campaignId: string): Promise<any[]> {
    return await db
      .select({
        id: campaignRecipients.id,
        contactId: campaignRecipients.contactId,
        status: campaignRecipients.status,
        sentAt: campaignRecipients.sentAt,
        openedAt: campaignRecipients.openedAt,
        clickedAt: campaignRecipients.clickedAt,
        contact: {
          id: crmContacts.id,
          firstName: crmContacts.firstName,
          lastName: crmContacts.lastName,
          email: crmContacts.email,
          company: crmContacts.company,
          title: crmContacts.title
        }
      })
      .from(campaignRecipients)
      .leftJoin(crmContacts, eq(campaignRecipients.contactId, crmContacts.id))
      .where(eq(campaignRecipients.campaignId, campaignId))
      .orderBy(desc(campaignRecipients.createdAt));
  }

  async updateRecipientStatus(campaignId: string, contactId: string, status: string): Promise<void> {
    const updateData: any = { status };
    
    if (status === 'sent') {
      updateData.sentAt = new Date();
    } else if (status === 'opened') {
      updateData.openedAt = new Date();
    } else if (status === 'clicked') {
      updateData.clickedAt = new Date();
    }
    
    await db
      .update(campaignRecipients)
      .set(updateData)
      .where(
        and(
          eq(campaignRecipients.campaignId, campaignId),
          eq(campaignRecipients.contactId, contactId)
        )
      );
  }

  // Audience operations
  async createAudience(audience: InsertAudience): Promise<Audience> {
    const [newAudience] = await db.insert(audiences).values(audience).returning();
    return newAudience;
  }

  async getAudience(id: string): Promise<Audience | undefined> {
    const [audience] = await db.select().from(audiences).where(eq(audiences.id, id));
    return audience;
  }

  async getUserAudiences(userId: string): Promise<Audience[]> {
    return await db
      .select()
      .from(audiences)
      .where(eq(audiences.userId, userId))
      .orderBy(desc(audiences.createdAt));
  }

  async updateAudience(id: string, updates: Partial<Audience>): Promise<Audience> {
    const [updatedAudience] = await db
      .update(audiences)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(audiences.id, id))
      .returning();
    return updatedAudience;
  }

  async deleteAudience(id: string): Promise<void> {
    await db.delete(audiences).where(eq(audiences.id, id));
  }

  async getContactsByFilter(userId: string, filterCriteria: any): Promise<CrmContact[]> {
    let conditions = [eq(crmContacts.userId, userId)];
    
    // Apply filters based on criteria
    if (filterCriteria.tags && filterCriteria.tags.length > 0) {
      // Filter by tags - contacts that have any of the specified tags
      conditions.push(
        sql`${crmContacts.tags} && ${filterCriteria.tags}::text[]`
      );
    }
    
    if (filterCriteria.company) {
      conditions.push(eq(crmContacts.company, filterCriteria.company));
    }
    
    return await db
      .select()
      .from(crmContacts)
      .where(and(...conditions))
      .orderBy(desc(crmContacts.createdAt));
  }

  // Activity log operations
  async logActivity(activity: InsertActivityLog): Promise<ActivityLog> {
    const [newActivity] = await db.insert(activityLog).values(activity).returning();
    return newActivity;
  }

  async getUserActivities(userId: string, limit: number = 10): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.userId, userId))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
  }

  // Dashboard stats
  async getDashboardStats(userId: string): Promise<{
    totalProjects: number;
    generatedDecks: number;
    campaignsSent: number;
    totalViews: number;
  }> {
    const [projectsCount] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.userId, userId));

    const [decksCount] = await db
      .select({ count: count() })
      .from(decks)
      .innerJoin(projects, eq(decks.projectId, projects.id))
      .where(eq(projects.userId, userId));

    const [campaignsCount] = await db
      .select({ count: count() })
      .from(campaigns)
      .innerJoin(projects, eq(campaigns.projectId, projects.id))
      .where(and(eq(projects.userId, userId), eq(campaigns.status, "sent")));

    // For now, total views will be based on campaign open count
    const [viewsResult] = await db
      .select({ totalViews: count(campaignRecipients.openedAt) })
      .from(campaignRecipients)
      .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
      .innerJoin(projects, eq(campaigns.projectId, projects.id))
      .where(eq(projects.userId, userId));

    return {
      totalProjects: projectsCount?.count || 0,
      generatedDecks: decksCount?.count || 0,
      campaignsSent: campaignsCount?.count || 0,
      totalViews: viewsResult?.totalViews || 0,
    };
  }

  // Project Analytics
  async getProjectAnalytics(projectId: string): Promise<{
    totalViews: number;
    totalDownloads: number;
    campaignsSent: number;
    campaignsOpened: number;
    campaignsClicked: number;
    avgEngagementRate: number;
    recentActivities: any[];
  }> {
    // Get campaign statistics for this project
    const projectCampaigns = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.projectId, projectId));
    
    let totalSent = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    
    for (const campaign of projectCampaigns) {
      totalSent += campaign.sentCount || 0;
      totalOpened += campaign.openCount || 0;
      totalClicked += campaign.clickCount || 0;
    }
    
    // Get campaign recipient interactions
    const [recipientsStats] = await db
      .select({
        totalRecipients: count(),
        openedCount: count(campaignRecipients.openedAt),
        clickedCount: count(campaignRecipients.clickedAt)
      })
      .from(campaignRecipients)
      .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
      .where(eq(campaigns.projectId, projectId));
    
    // Get recent activities for this project
    const recentActivities = await db
      .select()
      .from(activityLog)
      .where(eq(activityLog.projectId, projectId))
      .orderBy(desc(activityLog.createdAt))
      .limit(10);
    
    const avgEngagementRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0;
    
    return {
      totalViews: recipientsStats?.openedCount || 0,
      totalDownloads: Math.floor((recipientsStats?.clickedCount || 0) * 0.4), // Estimate downloads as 40% of clicks
      campaignsSent: projectCampaigns.length,
      campaignsOpened: totalOpened,
      campaignsClicked: totalClicked,
      avgEngagementRate,
      recentActivities: recentActivities || []
    };
  }

  // Slide operations (temporarily using deck updates)
  async createSlide(slideData: any): Promise<any> {
    // For now, we'll manage slides within the deck's slides JSONB field
    return slideData;
  }

  async updateSlide(id: string, updates: any): Promise<any | undefined> {
    // Slide updates are handled through deck updates for now
    return updates;
  }

  async deleteSlide(id: string): Promise<void> {
    // Slide deletion is handled through deck updates for now
    return;
  }
}

export const storage = new DatabaseStorage();
