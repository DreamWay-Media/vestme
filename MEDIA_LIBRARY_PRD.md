# Media Library Feature - PRD & Implementation Plan

## Overview
Add a Media Library management system as a new step in the project wizard (after Brand Kit) to extract, store, organize, and manage images and media assets for use in pitch decks.

## User Story
As a user creating a pitch deck, I want to:
- Extract images from my company website automatically
- Upload my own images manually
- Generate images using AI
- Tag and organize media assets
- Have AI automatically select appropriate images for slides based on tags and context
- Manage all media in one centralized location

## Architecture

### 1. Database Schema

#### New Table: `media_assets`
```sql
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- File information
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER, -- in bytes
  mime_type VARCHAR(100),
  width INTEGER,
  height INTEGER,
  
  -- Source tracking
  source VARCHAR(50) NOT NULL, -- 'website', 'upload', 'ai_generated'
  source_url TEXT, -- Original URL if from website
  
  -- Organization & metadata
  title VARCHAR(255),
  description TEXT,
  tags TEXT[], -- Array of tags for AI/search
  category VARCHAR(50), -- 'product', 'team', 'screenshot', 'graph', 'logo', 'background', etc.
  
  -- AI metadata
  ai_description TEXT, -- Auto-generated description by vision AI
  ai_tags TEXT[], -- Auto-generated tags
  dominant_colors JSONB, -- Color palette
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_media_assets_project ON media_assets(project_id);
CREATE INDEX idx_media_assets_user ON media_assets(user_id);
CREATE INDEX idx_media_assets_tags ON media_assets USING gin(tags);
CREATE INDEX idx_media_assets_category ON media_assets(category);
```

#### Update `projects` table
```sql
ALTER TABLE projects
ADD COLUMN media_library_completed BOOLEAN DEFAULT false,
ADD COLUMN media_library_completed_at TIMESTAMP;
```

### 2. Backend Services

#### `MediaLibraryService` (`server/services/mediaLibrary.ts`)
- `extractImagesFromWebsite(url: string)` - Scrape and extract images from website
- `uploadMedia(file: Buffer, metadata: any)` - Handle file uploads to Supabase Storage
- `generateImageWithAI(prompt: string, projectContext: any)` - Generate images using DALL-E or Stable Diffusion
- `analyzeImageWithAI(imageUrl: string)` - Use GPT-4 Vision to auto-tag and describe images
- `getProjectMedia(projectId: string)` - Fetch all media for a project
- `updateMediaMetadata(mediaId: string, updates: any)` - Update tags, title, description
- `deleteMedia(mediaId: string)` - Remove media asset
- `suggestMediaForSlide(slideType: string, slideContent: any, availableMedia: any[])` - AI suggests best image

#### `ImageAnalysisService` (`server/services/imageAnalysis.ts`)
- `extractColorsFromImage(imageUrl: string)` - Get color palette
- `detectImageContent(imageUrl: string)` - Identify objects, people, text
- `generateImageTags(imageUrl: string)` - Auto-generate relevant tags
- `categorizeImage(imageUrl: string)` - Determine category (product, team, etc.)

### 3. Storage Integration

#### Supabase Storage Bucket
- Bucket name: `project-media`
- Structure: `{projectId}/{mediaId}.{ext}`
- Public access: Read-only URLs
- CDN: Automatic via Supabase

### 4. API Endpoints

#### Media Management
```
GET    /api/projects/:projectId/media              - List all media
POST   /api/projects/:projectId/media/upload       - Upload file
POST   /api/projects/:projectId/media/extract      - Extract from website
POST   /api/projects/:projectId/media/generate     - Generate with AI
GET    /api/projects/:projectId/media/:mediaId     - Get single media
PUT    /api/projects/:projectId/media/:mediaId     - Update metadata
DELETE /api/projects/:projectId/media/:mediaId     - Delete media
POST   /api/projects/:projectId/media/:mediaId/analyze - AI analyze image

#### Wizard Integration
PUT    /api/projects/:projectId/complete-media-library - Mark step complete
```

#### AI Suggestions
```
POST   /api/projects/:projectId/suggest-media      - Suggest media for slide context
```

### 5. Frontend Components

#### Main Component: `MediaLibrary` (`client/src/components/MediaLibrary/`)

```
MediaLibrary/
├── MediaLibraryManager.tsx        # Main container
├── MediaUploader.tsx              # Drag-drop upload
├── WebsiteExtractor.tsx           # Extract from URL
├── AIImageGenerator.tsx           # Generate with AI
├── MediaGrid.tsx                  # Display media grid
├── MediaCard.tsx                  # Individual media item
├── MediaEditor.tsx                # Edit metadata modal
├── MediaFilters.tsx               # Filter by category/tags
├── MediaSearch.tsx                # Search functionality
└── MediaSelector.tsx              # Select media for slides (reusable)
```

#### Wizard Integration
- Update `ProjectSetup.tsx` to add Media Library step
- Add route: `/projects/:id/media-library`
- Navigation: Discovery → Brand Kit → **Media Library** → Generate Deck

### 6. AI Integration

#### Website Image Extraction
```typescript
// Use Puppeteer or Cheerio to scrape website
- Extract all <img> tags
- Download images
- Filter by size (min 400x300)
- Analyze relevance
- Store in Supabase Storage
```

#### Image Generation (OpenAI DALL-E)
```typescript
// Generate images based on context
const prompt = `
  Create a professional ${imageType} image for ${companyName}.
  Context: ${projectContext}
  Style: Modern, clean, professional
  Format: 16:9 aspect ratio
`;

const image = await openai.images.generate({
  model: "dall-e-3",
  prompt,
  size: "1792x1024",
  quality: "hd"
});
```

#### Image Analysis (GPT-4 Vision)
```typescript
// Auto-tag and describe images
const analysis = await openai.chat.completions.create({
  model: "gpt-4-vision-preview",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Analyze this image and provide: 1) Description, 2) 5-7 relevant tags, 3) Best category, 4) Suggested usage in pitch deck" },
      { type: "image_url", image_url: { url: imageUrl } }
    ]
  }]
});
```

#### Smart Media Selection
```typescript
// AI suggests best media for slide
const suggestion = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{
    role: "system",
    content: "You are a pitch deck designer. Select the most appropriate image for this slide."
  }, {
    role: "user",
    content: `
      Slide Type: ${slideType}
      Slide Content: ${slideContent}
      Available Media: ${JSON.stringify(mediaWithTags)}
      
      Select the best matching image and explain why.
    `
  }]
});
```

### 7. User Interface Flow

#### Step 1: Access Media Library
```
Project Setup → Brand Kit Complete → "Next: Media Library" button
```

#### Step 2: Media Library Dashboard
```
┌─────────────────────────────────────────────────────┐
│ Media Library                                        │
├─────────────────────────────────────────────────────┤
│ [Extract from Website] [Upload Files] [Generate AI] │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Filters: [All] [Products] [Team] [Screenshots]...  │
│  Search: [_________________________] [🔍]            │
│                                                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │
│  │      │ │      │ │      │ │      │               │
│  │ Img1 │ │ Img2 │ │ Img3 │ │ Img4 │               │
│  │      │ │      │ │      │ │      │               │
│  └──────┘ └──────┘ └──────┘ └──────┘               │
│   product   team    graph    logo                   │
│                                                      │
│  [+ More images...]                                  │
│                                                      │
│  [← Back]              [Continue to Generate →]     │
└─────────────────────────────────────────────────────┘
```

#### Step 3: Edit Media Modal
```
┌─────────────────────────────────────┐
│ Edit Media                     [✕]  │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────┐       │
│  │                         │       │
│  │      [Image Preview]     │       │
│  │                         │       │
│  └─────────────────────────┘       │
│                                     │
│  Title: [Product Screenshot_____]  │
│  Description:                       │
│  [_____________________________]   │
│  [_____________________________]   │
│                                     │
│  Category: [Product ▼]             │
│                                     │
│  Tags: [product] [app] [mobile] +  │
│                                     │
│  AI Suggestions: [team] [ui] [ux]  │
│                                     │
│  [Cancel]            [Save Changes] │
└─────────────────────────────────────┘
```

### 8. Template Integration

#### Updated Template Schema
```typescript
interface Template {
  // ... existing fields
  mediaSlots?: {
    id: string;
    type: 'background' | 'inline' | 'icon';
    suggestedCategory?: string[];
    suggestedTags?: string[];
    position?: { x: number; y: number };
    size?: { width: number; height: number };
  }[];
}
```

#### Slide Generation with Media
```typescript
// When generating slides
for (const slide of deckStructure) {
  const template = selectTemplate(slide.type);
  const content = generateContent(slide.type);
  
  // NEW: Suggest and include media
  if (template.mediaSlots) {
    const suggestedMedia = await suggestMediaForSlide(
      slide.type,
      content,
      projectMedia
    );
    
    slide.media = suggestedMedia;
  }
}
```

### 9. Implementation Phases

#### Phase 1: Core Infrastructure (Week 1)
- [ ] Database schema & migration
- [ ] Supabase Storage setup
- [ ] Basic backend service structure
- [ ] File upload endpoint

#### Phase 2: Website Extraction (Week 1-2)
- [ ] Image scraping service
- [ ] Website image extraction endpoint
- [ ] Filter and quality checks
- [ ] Automatic upload to storage

#### Phase 3: Manual Upload (Week 2)
- [ ] Frontend upload component
- [ ] Drag-and-drop interface
- [ ] Multiple file support
- [ ] Progress indicators

#### Phase 4: AI Features (Week 2-3)
- [ ] GPT-4 Vision integration for auto-tagging
- [ ] DALL-E image generation
- [ ] Smart media suggestion algorithm
- [ ] Color extraction

#### Phase 5: Media Management (Week 3)
- [ ] Media grid display
- [ ] Edit modal with tagging
- [ ] Search and filter
- [ ] Delete functionality

#### Phase 6: Wizard Integration (Week 3-4)
- [ ] Add Media Library step to wizard
- [ ] Progress tracking
- [ ] Navigation flow
- [ ] "Skip" option with warning

#### Phase 7: Template Integration (Week 4)
- [ ] Add mediaSlots to templates
- [ ] Auto-select media for slides
- [ ] Media positioning in SlideRenderer
- [ ] Manual media selection in editor

#### Phase 8: Testing & Polish (Week 4)
- [ ] End-to-end testing
- [ ] Error handling
- [ ] Loading states
- [ ] Performance optimization

### 10. Technical Considerations

#### File Size Limits
- Max upload: 10MB per file
- Supported formats: JPG, PNG, WebP, SVG
- Auto-optimization on upload

#### Performance
- Lazy loading in grid
- Thumbnail generation (200x200, 800x600)
- CDN caching via Supabase

#### Security
- User authentication required
- Project ownership verification
- File type validation
- Virus scanning (optional)

#### Cost Optimization
- Image compression on upload
- Storage limits per project (100 images)
- AI generation limits (10 per project)

### 11. Success Metrics

- **Adoption**: % of users completing media library step
- **Engagement**: Average # of media assets per project
- **AI Usage**: % using website extraction vs upload vs AI generation
- **Quality**: % of AI-suggested media accepted in slides
- **Time Saved**: Reduction in deck creation time

### 12. Future Enhancements

- **Video Support**: Add video media assets
- **Stock Photos**: Integration with Unsplash/Pexels
- **Batch Operations**: Bulk tag, delete, download
- **Media Analytics**: Track which images perform best
- **Version History**: Keep old versions of edited images
- **Collaboration**: Share media library across team
- **Templates**: Predefined media packs by industry

## Getting Started

To implement this feature:

1. **Review & Approve** this PRD
2. **Database Migration**: Create `media_assets` table
3. **Supabase Storage**: Set up `project-media` bucket
4. **Backend Services**: Implement core services
5. **Frontend Components**: Build UI components
6. **Integration**: Connect to wizard and templates
7. **Testing**: Comprehensive QA
8. **Deploy**: Staged rollout

## Questions to Resolve

1. Should media library be **required** or **optional** in wizard?
2. What's the **storage limit** per project?
3. Which **AI image generation** service to use (DALL-E, Midjourney, Stable Diffusion)?
4. Should we support **video** in v1 or defer to v2?
5. Do we need **admin approval** for AI-generated images?

---

**Ready to implement? Let's start with Phase 1: Core Infrastructure!**

