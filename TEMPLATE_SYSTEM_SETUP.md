# Template System Setup Guide

## Overview

The VestMe Template Management System has been successfully implemented! This document guides you through setup and usage.

## What's Been Built

### ✅ Phase 1: Foundation
- Database schema with 3 new tables: `slide_templates`, `user_subscriptions`, `project_template_overrides`
- TypeScript interfaces and types
- Directory structure for templates
- Template validator

### ✅ Phase 2: Template Manager Service  
- `TemplateManager` class for all template operations
- `SubscriptionService` for user tier management
- Brand color mapping and template application logic
- Access control system

### ✅ Phase 3: API Endpoints
- 11 new API endpoints (5 user-facing, 6 admin)
- Template browsing with access control
- Template application to create slides
- Subscription status checking
- Admin template management

### ✅ Phase 4: Initial Templates
- 8 professional templates created:
  - **Title**: Hero Title (free, default), Minimal Title (premium)
  - **Content**: Two Column (premium), Bullet List (free), Feature Grid (premium), Problem/Solution (premium)
  - **Data**: Stats Showcase (premium)
  - **Closing**: Call to Action (free)

## Setup Instructions

### 1. Apply Database Migrations

```bash
# Apply the new migration
npm run db:migrate

# Or if using Drizzle Studio
npx drizzle-kit push
```

The migration file is located at: `migrations/0001_fresh_thunderbolt.sql`

### 2. Verify Database Tables

Check that these tables were created:
- `slide_templates`
- `user_subscriptions`
- `project_template_overrides`

### 3. Start the Server

```bash
npm run dev
```

The template system will automatically initialize on server start, loading all templates from the filesystem into the database.

### 4. Check Template Loading

Look for these console logs on server start:

```
Initializing template system...
Found 8 system templates
✓ Inserted template: Hero Title
✓ Inserted template: Minimal Title
...
Template system initialized successfully with 8 templates
```

## API Endpoints

### User Endpoints

#### Get Templates (with access control)
```bash
GET /api/templates
GET /api/templates?category=title
GET /api/templates?search=hero
```

Response includes `isLocked` and `requiresUpgrade` flags for each template.

#### Get Single Template
```bash
GET /api/templates/:templateId
```

#### Get Default Template
```bash
GET /api/templates/default/get
```

#### Apply Template to Create Slide
```bash
POST /api/decks/:deckId/slides/from-template
Content-Type: application/json

{
  "templateId": "hero-title-v1",
  "content": {
    "title": "My Company",
    "tagline": "Building the future"
  },
  "overrides": {}
}
```

#### Get User Subscription Status
```bash
GET /api/user/subscription
```

Returns:
```json
{
  "tier": "free",
  "subscription": null,
  "isPremium": false
}
```

### Admin Endpoints

#### Get All Templates (no filtering)
```bash
GET /api/admin/templates
GET /api/admin/templates?isEnabled=true
```

#### Set Template as Default
```bash
POST /api/admin/templates/:templateId/set-default
```

#### Update Template Access
```bash
PUT /api/admin/templates/:templateId/access
Content-Type: application/json

{
  "accessTier": "premium",
  "isEnabled": true
}
```

#### Reload Templates from Filesystem
```bash
POST /api/admin/templates/reload
```

#### Delete Custom Template
```bash
DELETE /api/admin/templates/:templateId
```

## Testing the System

### 1. Test Template Loading

```bash
# Check if templates are loaded
curl http://localhost:5000/api/templates \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected: Array of 8 templates with access control info

### 2. Test Template Application

```bash
# Get a deck ID from your system
DECK_ID="your-deck-id"

# Apply the default template
curl -X POST "http://localhost:5000/api/decks/${DECK_ID}/slides/from-template" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "hero-title-v1",
    "content": {
      "title": "Test Company",
      "tagline": "Testing the template system"
    }
  }'
```

Expected: New slide object with template styling applied

### 3. Test Access Control

```bash
# Try to apply a premium template as a free user
curl -X POST "http://localhost:5000/api/decks/${DECK_ID}/slides/from-template" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "two-column-v1",
    "content": {
      "title": "Premium Test"
    }
  }'
```

Expected: 403 error with `upgradeRequired: true`

### 4. Test Admin Functions

```bash
# Set a different template as default
curl -X POST "http://localhost:5000/api/admin/templates/minimal-title-v1/set-default" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Reload templates
curl -X POST "http://localhost:5000/api/admin/templates/reload" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Adding New Templates

### 1. Create Template JSON

Create a new file in the appropriate category folder:

```bash
server/templates/definitions/content/my-template.json
```

### 2. Follow Template Schema

See `server/templates/README.md` for complete documentation and examples.

### 3. Add Thumbnail

Create a 16:9 PNG image:

```bash
server/templates/thumbnails/my-template.png
```

### 4. Reload Templates

Either:
- Restart the server, OR
- Call `POST /api/admin/templates/reload`

## Template Structure

All templates follow this structure:

```json
{
  "id": "unique-id-v1",
  "version": "1.0",
  "name": "Display Name",
  "description": "Brief description",
  "category": "title|content|data|closing",
  "tags": ["tag1", "tag2"],
  "thumbnail": "/templates/thumbnails/id.png",
  
  "accessTier": "free|premium",
  "isDefault": false,
  "isEnabled": true,
  "displayOrder": 10,
  
  "layout": { /* layout definition */ },
  "styling": { /* styling with brand color references */ },
  "contentSchema": { /* content fields */ },
  "metadata": { /* author, dates, difficulty */ }
}
```

## Access Control

### User Tiers

- **free**: Access to free templates only (default tier for all users)
- **pro**: Access to all templates
- **enterprise**: Access to all templates + future features

### Template Access Tiers

- **free**: Available to all users
- **premium**: Requires paid subscription

### Setting User Subscriptions

Currently, all users default to "free" tier. To upgrade a user:

```sql
INSERT INTO user_subscriptions (user_id, tier, status)
VALUES ('user-id-here', 'pro', 'active')
ON CONFLICT (user_id) DO UPDATE
SET tier = 'pro', status = 'active';
```

Or use the subscription service:

```typescript
import { subscriptionService } from './server/services/subscriptionService';

await subscriptionService.upsertSubscription({
  userId: 'user-id',
  tier: 'pro',
  status: 'active'
});
```

## Template Categories

| Category | Purpose | Count |
|----------|---------|-------|
| `title` | Opening/title slides | 2 |
| `content` | Main content slides | 4 |
| `data` | Statistics/metrics | 1 |
| `closing` | Closing/CTA slides | 1 |

## Free vs Premium

| Template | Access Tier | Default |
|----------|-------------|---------|
| Hero Title | Free | ✓ |
| Minimal Title | Premium | |
| Two Column | Premium | |
| Bullet List | Free | |
| Feature Grid | Premium | |
| Problem/Solution | Premium | |
| Stats Showcase | Premium | |
| Call to Action | Free | |

**Free tier includes**: 3 templates (Hero Title, Bullet List, Call to Action)
**Premium tier includes**: All 8 templates

## Troubleshooting

### Templates Not Loading

1. Check server logs for initialization errors
2. Verify JSON files are valid (run validator)
3. Check file permissions on template directories

### Access Control Not Working

1. Verify user's subscription status: `GET /api/user/subscription`
2. Check template's `accessTier` in database
3. Ensure `isEnabled: true` for the template

### Templates Not Applying Brand Colors

1. Verify brand kit exists and has colors defined
2. Check `usesBrandColor` references in template styling
3. Ensure fallback colors are provided

## Next Steps

### Frontend Implementation (Phases 5-7)

The backend is ready! Next steps:

1. **Phase 5**: Build Template Gallery UI
   - Display templates in grid
   - Show locked state for premium templates
   - Preview modal with brand kit applied

2. **Phase 6**: Add Upgrade Flow
   - Upsell modal for premium templates
   - Stripe integration
   - Subscription management

3. **Phase 7**: Admin Dashboard
   - Template management UI
   - Set default template
   - Toggle access tiers
   - View usage analytics

### Testing (Phase 8)

1. Unit tests for TemplateManager
2. API integration tests
3. E2E tests for template application
4. Access control tests
5. Brand kit integration tests

## Support

For issues or questions:
1. Check server logs
2. Review `server/templates/README.md`
3. Inspect database tables
4. Test API endpoints with curl/Postman

## Migration Notes

**Important**: Before deploying to production:

1. Apply database migrations
2. Verify template thumbnails are real images (currently placeholders)
3. Test with actual brand kits
4. Set up Stripe for subscriptions
5. Implement proper admin role checking (currently TODO in routes.ts)

---

**Status**: Backend Complete ✅
**Ready for**: Frontend Development
**Database Migration**: Required before use

