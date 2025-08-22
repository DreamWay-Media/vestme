# PitchPerfect - AI-Powered Pitch Deck Generator

## Overview

PitchPerfect is an AI-powered web application that enables entrepreneurs and startup founders to generate professional-grade pitch decks efficiently. The platform uses generative AI to analyze business information, crawl websites for additional context, and create comprehensive branded pitch decks with minimal manual input. The application includes a complete workflow from business discovery and analysis to brand kit creation, pitch deck generation, CRM management, and investor outreach campaigns.

## Recent Changes (August 21, 2025)

✅ **Complete Supabase Database Migration**: Successfully migrated entire application data storage from in-memory to Supabase PostgreSQL database with all 10 tables properly created and functioning

✅ **Fixed Audience Creation Critical Bug**: Resolved issue where audience creation was saving all contacts instead of only selected contacts, now correctly passes selected contact IDs to backend

✅ **Comprehensive Contact Import System**: Built complete contact import functionality with CSV parsing, validation, error handling, and proper routing from both dashboard and CRM page

✅ **Enhanced Backend Import API**: Created robust contact import endpoint supporting CSV data parsing with header validation, individual contact validation, and detailed error reporting

✅ **Database Schema Migration**: Generated and deployed complete Drizzle schema migration to Supabase including users, projects, brand_kits, decks, crm_contacts, audiences, campaigns, activity_log, and sessions tables

✅ **Comprehensive Bug Fix and TypeScript Resolution**: Conducted full project scan and resolved all TypeScript errors, type safety issues, and potential runtime bugs across entire codebase

✅ **Production-Ready Build System**: Verified build process works correctly with proper bundling, code splitting, and production optimizations for both frontend and backend

✅ **Comprehensive Documentation**: Created detailed README.md with complete setup instructions, environment configuration, database setup, API documentation, and troubleshooting guide for local development

## Previous Changes (August 9, 2025)

✅ **Advanced WYSIWYG Text Editing**: Implemented comprehensive rich text editing system with individual WYSIWYG editors for each text block (titles, descriptions, bullet points), featuring TipTap-powered formatting toolbar with fonts, colors, highlighting, alignment, and text effects

✅ **Background Image Upload System**: Added direct image upload functionality for slide backgrounds using object storage integration, allowing users to upload images (up to 5MB) with real-time preview and remove functionality alongside URL input option

✅ **Consistent Page Styling Architecture**: Standardized page headers across all sections with uniform typography, layout, and information hierarchy - removed business names from section titles for consistent user experience

✅ **Enhanced Color Contrast System**: Fixed text readability issues by implementing dark text colors (#333333) throughout deck viewer and added AI prompt guidelines to prevent white text on white backgrounds

✅ **UI Cleanup and Navigation**: Removed duplicate export PDF buttons, eliminated unnecessary back navigation links, and cleaned up Generate Deck section for streamlined user experience

✅ **AI-Powered Brand Analysis**: Added intelligent website crawling with automatic brand element extraction including colors, fonts, logos, and brand personality analysis

✅ **Advanced Brand Intelligence**: Implemented GPT-4o powered brand analysis service that crawls websites, analyzes CSS styles, identifies brand colors and typography, and creates comprehensive brand kits automatically

✅ **Brand Kit AI Button**: Added "AI Analyze Website Brand" button in brand kit section that extracts brand elements from company websites and creates brand kits automatically

✅ **Enhanced Brand Analysis Pipeline**: Built complete brand extraction workflow from website crawling to AI analysis to brand kit creation with proper error handling and user feedback

✅ **Enhanced AI Business Intelligence**: Upgraded to GPT-4o with temperature 0.3 and comprehensive 13-category business analysis including market research, competition analysis, and financial projections

✅ **Advanced Anti-Hallucination Protocols**: Implemented strict evidence-based analysis requiring data sources and marking unavailable information rather than fabricating details

✅ **Comprehensive Business Analysis Prompts**: Enhanced AI prompts to generate detailed business descriptions, problem statements, value propositions, competitive advantages, investment thesis, go-to-market strategies, and risk analysis

✅ **Strategic Business Intelligence**: Business insights now include 10+ detailed categories: business model analysis, market positioning, competitive advantages, strategic recommendations, key success metrics, and scaling opportunities

✅ **Enhanced Discovery UI Display**: Updated project discovery page to showcase comprehensive AI-generated business intelligence with investment thesis, key insights, and strategic recommendations prominently displayed

✅ **Comprehensive Financial Analysis**: Built financial analyzer service with 3-year revenue forecasts, funding requirements, key metrics (LTV, CAC), and business valuation

✅ **Competition Research Engine**: Enhanced competitor analysis with direct/indirect competitors, market positioning, competitive advantages, and market opportunity identification

✅ **Complete Database Schema**: Supabase PostgreSQL database with full relational structure including enhanced business profile fields

✅ **AI-Powered Website Crawling**: Comprehensive website analysis for business intelligence gathering and content extraction with fixed integration

✅ **Object Storage Integration**: Google Cloud Storage with custom ACL system for secure file uploads and management

✅ **Real-time Dashboard**: Live statistics and recent activity tracking with project status workflow management

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript running on Vite for fast development and hot module replacement
- **UI Library**: Shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with custom CSS variables for theming and design consistency
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation for type-safe form management
- **File Uploads**: Uppy with AWS S3 integration for direct-to-cloud file uploads

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful API architecture with structured error handling and logging middleware
- **Authentication**: Replit Auth integration using OpenID Connect (OIDC) with Passport.js
- **Session Management**: Express sessions with PostgreSQL store for persistent authentication

### Data Storage Solutions
- **Primary Database**: Supabase PostgreSQL with Drizzle ORM for type-safe database operations (fully migrated and operational)
- **Schema Design**: Relational structure with JSONB columns for flexible content storage (business profiles, pitch deck slides)
- **Object Storage**: Google Cloud Storage with custom ACL system for file management and access control
- **Session Storage**: PostgreSQL-based session store for authentication persistence

### Authentication and Authorization
- **Authentication Provider**: Replit Auth using OpenID Connect standard
- **Session Strategy**: Server-side sessions with secure HTTP-only cookies
- **Authorization Pattern**: User-based access control with middleware guards on protected routes
- **Object Access Control**: Custom ACL system for fine-grained file and resource permissions

### External Dependencies

#### AI and Machine Learning
- **OpenAI GPT-4o**: Business analysis, content generation, and pitch deck creation
- **Website Crawling**: JSDOM for extracting business information from company websites

#### Cloud Services
- **Database**: Supabase PostgreSQL database
- **File Storage**: Google Cloud Storage with Replit sidecar authentication
- **Authentication**: Replit Auth infrastructure

#### Development and Build Tools
- **Build System**: Vite for frontend bundling and esbuild for server-side bundling
- **Database Migrations**: Drizzle Kit for schema management and migrations
- **Type Safety**: TypeScript across the entire stack with shared schema definitions
- **Development Environment**: Replit-specific tooling for cartographer and error overlay

#### UI and User Experience
- **Component Library**: Radix UI primitives for accessibility-first components
- **Icons**: Font Awesome for consistent iconography
- **Typography**: Inter font family for modern, readable text
- **File Upload UX**: Uppy dashboard with progress tracking and preview capabilities

#### Data Validation and Processing
- **Schema Validation**: Zod for runtime type checking and form validation
- **Date Handling**: date-fns for consistent date formatting and manipulation
- **Query Management**: TanStack Query for efficient data fetching, caching, and synchronization

The architecture follows a clear separation of concerns with shared TypeScript schemas between frontend and backend, ensuring type safety across the entire application. The system is designed for scalability with serverless database connections and cloud-native file storage.