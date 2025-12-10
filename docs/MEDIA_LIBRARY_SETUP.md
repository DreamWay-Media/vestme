# Media Library Setup Guide

This guide will help you set up the Supabase storage bucket for the Media Library feature.

## Overview

The Media Library allows users to:
- Upload images directly (up to 10MB per file)
- Extract images from their website
- Store up to 32MB of media per project
- Tag and annotate images for AI context
- Use images in pitch deck slides

## Supabase Storage Configuration

### 1. Create Storage Bucket

Go to your Supabase project dashboard and navigate to **Storage** section.

#### Create `project-media` Bucket

1. Click "Create a new bucket"
2. Set the following configuration:
   - **Name**: `project-media`
   - **Public bucket**: ✅ Yes (checked)
   - **File size limit**: `10 MB`
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp,image/gif`

3. Click "Create bucket"

### 2. Set Up Storage Policies

After creating the bucket, you need to set up Row Level Security (RLS) policies to control access.

Go to **Storage** → **Policies** → Select `project-media` bucket → Click "New Policy"

#### Policy 1: Allow Authenticated Users to Upload

```sql
-- Name: Allow authenticated users to upload
-- Operation: INSERT
-- Policy definition:

CREATE POLICY "Allow authenticated users to upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
);
```

#### Policy 2: Allow Public Read Access

```sql
-- Name: Allow public read access
-- Operation: SELECT
-- Policy definition:

CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'project-media');
```

#### Policy 3: Allow Users to Update Their Own Files

```sql
-- Name: Allow users to update their own files
-- Operation: UPDATE
-- Policy definition:

CREATE POLICY "Allow users to update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
);
```

#### Policy 4: Allow Users to Delete Their Own Files

```sql
-- Name: Allow users to delete their own files
-- Operation: DELETE
-- Policy definition:

CREATE POLICY "Allow users to delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-media'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE user_id = auth.uid()
  )
);
```

### 3. Verify Storage Setup

After setting up the policies, verify everything works:

1. **Environment Variables**: Ensure your `.env` file has:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Test Upload**: Try uploading an image through the Media Library UI

3. **Check Storage Usage**: Go to Supabase dashboard → Storage → `project-media` to see uploaded files

## Database Schema

The media assets are stored in the `media_assets` table with the following structure:

```sql
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  filename VARCHAR NOT NULL,
  original_filename VARCHAR,
  file_type VARCHAR NOT NULL,
  file_size INTEGER NOT NULL,
  storage_url VARCHAR NOT NULL,
  thumbnail_url VARCHAR,
  width INTEGER,
  height INTEGER,
  source VARCHAR NOT NULL, -- 'upload', 'website_extraction', 'ai_generated'
  source_url VARCHAR,
  tags JSONB,
  description TEXT,
  alt_text TEXT,
  metadata JSONB,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Storage Limits

- **Per File**: 10 MB maximum
- **Per Project**: 32 MB total storage
- **File Types**: JPEG, PNG, WebP, GIF
- **AI Generated Images**: 10 images per project (to be implemented in Phase 2)

## File Organization

Files are organized in Supabase Storage as:

```
project-media/
├── {project-id}/
│   ├── {timestamp}_{filename}.jpg
│   ├── {timestamp}_{filename}.png
│   └── thumbnails/
│       ├── {timestamp}_thumb_{filename}.jpg
│       └── {timestamp}_thumb_{filename}.png
```

## API Endpoints

The following API endpoints are available:

- `GET /api/projects/:projectId/media` - Get all media assets for a project
- `POST /api/projects/:projectId/media/upload` - Upload a new media file
- `POST /api/projects/:projectId/media/extract` - Extract images from website
- `PATCH /api/projects/:projectId/media/:assetId` - Update media metadata
- `DELETE /api/projects/:projectId/media/:assetId` - Delete a media asset

## Troubleshooting

### Upload Fails with "Quota Exceeded"
- Check current storage usage in the Media Library UI
- Delete unused images to free up space
- Each project has a 32MB limit

### Images Not Displaying
- Verify the `project-media` bucket is set to **Public**
- Check browser console for CORS errors
- Ensure storage policies are correctly configured

### Website Extraction Not Working
- Verify the website URL is accessible
- Some websites block scraping - this is expected
- Try uploading images manually if extraction fails

## Future Enhancements (Phase 2)

- AI-generated images using DALL-E or Stable Diffusion
- Automatic image tagging using AI vision models
- Smart image suggestions based on slide content
- Image editing tools (crop, resize, filters)
- Bulk upload and management

