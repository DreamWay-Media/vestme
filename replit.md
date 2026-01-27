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

## Development Login (Dev Mode)
When running without Supabase configured (development mode):
- A "Get Started Free" button triggers dev login with a fixed demo user
- Dev login is only available when:
  1. NODE_ENV !== 'production'
  2. Supabase credentials are NOT configured
- Uses fixed user ID 'dev-demo-user' for security (no arbitrary account creation)

## Recent Changes
- Added secure dev-login flow for Replit preview testing (fixed user ID, production check)
- Fixed media library integration to use correct mediaManager.getProjectMedia() method
- Fixed brand color extraction with case-insensitive matching and generic color filtering
- Added graceful handling for missing Supabase credentials
- Added graceful handling for missing OpenAI API key
- Configured CSP headers to allow Google Fonts
- Configured for Replit environment with proper iframe support
