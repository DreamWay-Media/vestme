import { eq, and } from 'drizzle-orm';
import { db } from '../db';
import { userSubscriptions } from '../../shared/schema';

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired';

export class SubscriptionService {
  
  /**
   * Get user's current subscription tier
   */
  async getUserTier(userId: string): Promise<SubscriptionTier> {
    try {
      const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.userId, userId),
            eq(userSubscriptions.status, 'active')
          )
        )
        .orderBy(userSubscriptions.createdAt)
        .limit(1);
      
      if (!subscription) {
        return 'free';
      }
      
      // Check if subscription is still valid
      const now = new Date();
      if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < now) {
        // Subscription expired
        await this.updateSubscriptionStatus(subscription.id, 'expired');
        return 'free';
      }
      
      return subscription.tier as SubscriptionTier;
    } catch (error) {
      console.error('Error getting user tier:', error);
      return 'free'; // Default to free on error
    }
  }
  
  /**
   * Get user's active subscription
   */
  async getActiveSubscription(userId: string) {
    try {
      const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.userId, userId),
            eq(userSubscriptions.status, 'active')
          )
        )
        .limit(1);
      
      return subscription || null;
    } catch (error) {
      console.error('Error getting active subscription:', error);
      return null;
    }
  }
  
  /**
   * Create or update subscription
   */
  async upsertSubscription(data: {
    userId: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
  }) {
    try {
      // Check if subscription exists
      const existing = await this.getActiveSubscription(data.userId);
      
      if (existing) {
        // Update existing subscription
        const [updated] = await db
          .update(userSubscriptions)
          .set({
            tier: data.tier,
            status: data.status,
            stripeCustomerId: data.stripeCustomerId,
            stripeSubscriptionId: data.stripeSubscriptionId,
            currentPeriodStart: data.currentPeriodStart,
            currentPeriodEnd: data.currentPeriodEnd,
            updatedAt: new Date(),
          })
          .where(eq(userSubscriptions.id, existing.id))
          .returning();
        
        return updated;
      } else {
        // Create new subscription
        const [created] = await db
          .insert(userSubscriptions)
          .values({
            userId: data.userId,
            tier: data.tier,
            status: data.status,
            stripeCustomerId: data.stripeCustomerId,
            stripeSubscriptionId: data.stripeSubscriptionId,
            currentPeriodStart: data.currentPeriodStart,
            currentPeriodEnd: data.currentPeriodEnd,
          })
          .returning();
        
        return created;
      }
    } catch (error) {
      console.error('Error upserting subscription:', error);
      throw error;
    }
  }
  
  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(subscriptionId: string, status: SubscriptionStatus) {
    try {
      const [updated] = await db
        .update(userSubscriptions)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.id, subscriptionId))
        .returning();
      
      return updated;
    } catch (error) {
      console.error('Error updating subscription status:', error);
      throw error;
    }
  }
  
  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string) {
    try {
      const subscription = await this.getActiveSubscription(userId);
      
      if (!subscription) {
        throw new Error('No active subscription found');
      }
      
      return await this.updateSubscriptionStatus(subscription.id, 'cancelled');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  }
  
  /**
   * Check if user has access to a specific tier
   */
  async hasAccessToTier(userId: string, requiredTier: SubscriptionTier): Promise<boolean> {
    const userTier = await this.getUserTier(userId);
    
    const tierHierarchy: Record<SubscriptionTier, number> = {
      free: 0,
      pro: 1,
      enterprise: 2,
    };
    
    return tierHierarchy[userTier] >= tierHierarchy[requiredTier];
  }
  
  /**
   * Get subscription by Stripe subscription ID
   */
  async getByStripeSubscriptionId(stripeSubscriptionId: string) {
    try {
      const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId))
        .limit(1);
      
      return subscription || null;
    } catch (error) {
      console.error('Error getting subscription by Stripe ID:', error);
      return null;
    }
  }
  
  /**
   * Get subscription by Stripe customer ID
   */
  async getByStripeCustomerId(stripeCustomerId: string) {
    try {
      const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.stripeCustomerId, stripeCustomerId))
        .limit(1);
      
      return subscription || null;
    } catch (error) {
      console.error('Error getting subscription by Stripe customer ID:', error);
      return null;
    }
  }
}

// Singleton instance
export const subscriptionService = new SubscriptionService();

