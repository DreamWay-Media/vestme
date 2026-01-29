# Pitch Perfect (vestme.ai)

## Overview
This is an AI-powered pitch deck generator that helps startups turn their ideas into investor-ready pitch decks. The application features business analysis, brand customization, and investor outreach tools.

## Project Structure
- `client/` - React frontend with Vite
- `server/` - Express.js backend with TypeScript
- `shared/` - Shared TypeScript schemas and types
- `migrations/` - Drizzle ORM database migrations

## Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS, Radix UI components
- **Backend**: Express.js, TypeScript, tsx
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Supabase Auth
- **AI Features**: OpenAI GPT-4
- **File Storage**: Supabase Storage

## Environment Variables Required
The app can run in a limited mode without these, but full functionality requires:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY` - Supabase API key
- `VITE_SUPABASE_URL` - Frontend Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Frontend Supabase anon key
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `SESSION_SECRET` - Session encryption secret

## Development
The application runs on port 5000 in development mode using:
```
PORT=5000 npm run dev
```

## Build & Production
```
npm run build
npm run start
```

## Database
Uses PostgreSQL with Drizzle ORM. Push schema changes with:
```
npm run db:push
```

## Authentication
The app supports two login methods in development:
- **"Get Started Free"** - Real Google authentication via Supabase
- **"Demo Login (Dev Mode)"** - Quick test login with fixed demo user (only in development)

In production, only real Supabase authentication is available.

### Dev Login Security
- Dev login only available when NODE_ENV !== 'production'
- Uses fixed user ID 'dev-demo-user' server-side (no arbitrary account creation)
- Both real auth and dev auth work in development mode

## Admin Access Control
- Users table has an `isAdmin` column (boolean) for role-based access control
- Admin routes (`/admin/*`) are protected by:
  - Server-side: `isAdmin` middleware verifies database role before allowing access
  - Frontend: `AdminRoute` component redirects non-admins to `/dashboard`
- Current admin: whybrandsai@gmail.com (Vrej Sanati)
- To make a user admin: `UPDATE users SET is_admin = true WHERE email = 'user@example.com';`

## Template System
- Templates are stored in the database (8 system templates)
- Regular users see only enabled templates (`isEnabled = true`)
- Admin users can manage templates at `/admin/templates`
- Themes are also database-stored with enable/disable controls

## Recent Changes
- Enabled free navigation between all project steps - users can now move freely between Discovery, Media Library, Brand Kit, and Deck Generator without completing previous steps
- Removed bottom navigation buttons and progress indicators from step pages (Media Library, Brand Kit) to reduce clutter
- Simplified sidebar navigation - removed progress footer and disabled state logic
- Fixed double scrollbar issue on project layout by removing h-screen and adding proper overflow controls
- Redesigned Discovery Results with card-based layout, featured Investment Thesis, 3-column info grid, and cleaner visual hierarchy
- Redesigned Discovery page with cleaner, more compact UI: inline project info header, 2-column grid layout for results, streamlined document upload section
- Added preloader/loading state to Discovery step that shows "Loading Your Results" after AI analysis completes while data is being fetched
- Completely removed website color extraction - users now pick their own brand colors with neutral defaults (#000000, #F8FAFC, #64748B)
- Redesigned brand kit creation page with cleaner, user-driven flow: centered layout, "Start Customizing" button, visual preview of color roles
- Added helpful descriptions for each color (Primary = headlines/buttons, Secondary = backgrounds, Accent = highlights/CTAs)
- Added real-time Color Preview section showing how selected colors look together
- Expanded font options to 100+ Google Fonts organized into 7 categories (Popular Sans-Serif, Modern Sans-Serif, Display & Headlines, Elegant Serif, Script & Handwritten, Monospace & Technical, System Fonts)
- Enhanced brand kit logo selection with priority-based approach: (1) user-selected from media library, (2) auto-detected logos in media library via `findProjectLogos()`, (3) extracted from website URL
- Added `findProjectLogos()` method to media manager that searches by tags, filenames, SVG format, and dimensions
- Added admin role-based access control with database-backed verification
- Added `isAdmin` column to users table with schema and API support
- Created AdminRoute component for frontend route protection
- Fixed TypeScript errors in routes.ts (undefined variables in error handling)
- Added secure dev-login flow for Replit preview testing (fixed user ID, production check)
- Fixed media library integration to use correct mediaManager.getProjectMedia() method
- Fixed brand color extraction with case-insensitive matching and generic color filtering
- Added graceful handling for missing Supabase credentials
- Added graceful handling for missing OpenAI API key
- Configured CSP headers to allow Google Fonts
- Configured for Replit environment with proper iframe support
