# PitchPerfect - AI-Powered Pitch Deck Generator

PitchPerfect is an advanced AI-powered web application that enables entrepreneurs and startup founders to generate professional-grade pitch decks efficiently. The platform uses generative AI to analyze business information, crawl websites for additional context, and create comprehensive branded pitch decks with minimal manual input.

## Features

- **AI-Powered Business Analysis**: Comprehensive business intelligence gathering with GPT-4o
- **Advanced Brand Analysis**: Automatic brand element extraction from company websites
- **Professional Pitch Deck Generation**: AI-generated slides with custom branding
- **CRM Integration**: Complete contact management with audience creation and targeting
- **Email Campaign Management**: Automated investor outreach campaigns
- **Rich Text Editing**: WYSIWYG editors for individual slide components
- **File Upload System**: Google Cloud Storage integration for assets and documents
- **Real-time Dashboard**: Project analytics and activity tracking

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for development and bundling
- **Tailwind CSS** for styling
- **shadcn/ui** components built on Radix UI
- **TanStack Query** for state management
- **Wouter** for client-side routing
- **React Hook Form** with Zod validation
- **TipTap** for rich text editing

### Backend
- **Node.js** with Express.js
- **TypeScript** with ES modules
- **Drizzle ORM** with PostgreSQL
- **Supabase Auth** with Google OAuth
- **Google Cloud Storage** for file management

### Database & Storage
- **Supabase PostgreSQL** database
- **Google Cloud Storage** with custom ACL system
- **Express sessions** with PostgreSQL store

### AI & External Services
- **OpenAI GPT-4o** for business analysis and content generation
- **Website crawling** with JSDOM for business intelligence
- **SendGrid** for email campaigns (optional)

## Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **PostgreSQL** database (Supabase recommended)
- **OpenAI API key**
- **Google Cloud Storage** credentials (for file uploads)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pitchperfect
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory with the following variables:

   ```env
   # Database Configuration (Supabase)
   DATABASE_URL=postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here

   # Google Cloud Storage (Object Storage)
   DEFAULT_OBJECT_STORAGE_BUCKET_ID=your_bucket_id
   PUBLIC_OBJECT_SEARCH_PATHS=public/
   PRIVATE_OBJECT_DIR=.private/

   # Session Configuration
   SESSION_SECRET=your_session_secret_here

   # Supabase Configuration
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your_supabase_anon_key

   # Optional: SendGrid for Email Campaigns
   SENDGRID_API_KEY=your_sendgrid_api_key

   # Development
   NODE_ENV=development
   PORT=3000
   ```

## Database Setup

### Using Supabase (Recommended)

1. **Create a Supabase Project**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard/projects)
   - Create a new project
   - Note your project URL and database password

2. **Get Database URL**
   - In your Supabase project, click "Connect"
   - Copy the "Connection string" under "Transaction pooler"
   - Replace `[YOUR-PASSWORD]` with your database password
   - Add this as `DATABASE_URL` in your `.env` file

3. **Run Database Migrations**
   ```bash
   npm run db:push
   ```

   This will create all necessary tables:
   - users (authentication)
   - projects (pitch deck projects)
   - brand_kits (brand styling data)
   - decks (pitch deck content and slides)
   - crm_contacts (contact management)
   - audiences (contact groupings)
   - campaigns (email campaigns)
   - activity_log (user activity tracking)
   - sessions (authentication sessions)

## Google Cloud Storage Setup

1. **Create a Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Cloud Storage API**
   - Navigate to APIs & Services > Library
   - Search for "Cloud Storage API" and enable it

3. **Create a Storage Bucket**
   - Go to Cloud Storage > Buckets
   - Create a new bucket
   - Note the bucket name for your environment variables

4. **Set up Authentication**
   - The application uses Replit's sidecar authentication for Google Cloud
   - No additional service account setup required when running on Replit

## Development Workflow

### Starting the Development Server

```bash
npm run dev
```

This starts both the frontend (Vite) and backend (Express) servers on port 5000.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:generate` - Generate database migration files
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio for database management

### Project Structure

```
pitchperfect/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions and clients
│   │   └── main.tsx        # Application entry point
│   └── index.html          # HTML template
├── server/                 # Backend Express application
│   ├── services/           # Business logic services
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database abstraction layer
│   ├── db.ts               # Database connection
│   └── index.ts            # Server entry point
├── shared/                 # Shared code between client and server
│   └── schema.ts           # Database schema and types
├── migrations/             # Database migration files
└── package.json           # Dependencies and scripts
```

## API Documentation

### Authentication
- `GET /api/auth/user` - Get current user information
- `GET /api/login` - Initiate login flow
- `GET /api/logout` - Logout user

### Projects
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/analyze` - Analyze project with AI

### CRM
- `GET /api/crm/contacts` - List contacts
- `POST /api/crm/contacts` - Create contact
- `POST /api/crm/contacts/import` - Import contacts from CSV
- `GET /api/crm/audiences` - List audiences
- `POST /api/crm/audiences` - Create audience

### File Upload
- `POST /api/objects/upload` - Get upload URL for files

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify `DATABASE_URL` is correct
   - Ensure Supabase project is active
   - Check firewall/network settings

2. **OpenAI API Errors**
   - Verify `OPENAI_API_KEY` is valid
   - Check API quota and billing
   - Ensure API key has required permissions

3. **File Upload Issues**
   - Check Google Cloud Storage bucket permissions
   - Verify bucket name in environment variables
   - Ensure Cloud Storage API is enabled

4. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npx tsc --noEmit`
   - Verify all dependencies are installed

### Development Tips

- Use `npm run db:studio` to inspect database tables and data
- Check browser console and network tab for frontend errors
- Monitor server logs for backend errors
- Use TypeScript strict mode for better error catching

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and test thoroughly
4. Ensure TypeScript compilation: `npx tsc --noEmit`
5. Run the build: `npm run build`
6. Commit your changes: `git commit -m 'Add new feature'`
7. Push to your branch: `git push origin feature/new-feature`
8. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For technical support or questions:
- Check the troubleshooting section above
- Review the error logs for specific error messages
- Ensure all environment variables are properly configured

---

Built with ❤️ using modern web technologies and AI