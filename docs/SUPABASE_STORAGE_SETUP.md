# Supabase Storage Setup Guide

## 1. Create Storage Bucket in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **Create a new bucket**
4. Name it: `pitch-perfect-files`
5. Set it as **Public** (or Private if you prefer)
6. Click **Create bucket**

## 2. Set Storage Policies

### For Public Bucket:
```sql
-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'pitch-perfect-files');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pitch-perfect-files' AND auth.role() = 'authenticated');

-- Allow users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE USING (bucket_id = 'pitch-perfect-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (bucket_id = 'pitch-perfect-files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### For Private Bucket:
```sql
-- Allow users to read their own files
CREATE POLICY "Users can read own files" ON storage.objects FOR SELECT USING (bucket_id = 'pitch-perfect-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pitch-perfect-files' AND auth.role() = 'authenticated');

-- Allow users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE USING (bucket_id = 'pitch-perfect-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (bucket_id = 'pitch-perfect-files' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## 3. Environment Variables

Add these to your `.env` file:

```bash
# Supabase Storage
SUPABASE_STORAGE_BUCKET=pitch-perfect-files
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Important**: Use the `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) for server-side operations.

## 4. Test Upload

1. Restart your server
2. Try uploading a document
3. Check the server console for any errors
4. Check Supabase Storage dashboard to see if files appear

## 5. Troubleshooting

### Common Issues:

1. **"Bucket not found"**: Make sure the bucket name matches exactly
2. **"Permission denied"**: Check your storage policies
3. **"Service role key invalid"**: Use the service role key, not the anon key

### Check Storage Policies:
```sql
SELECT * FROM storage.policies WHERE bucket_id = 'pitch-perfect-files';
```

### Test Upload Manually:
```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'pitch-perfect-files';

-- List files in bucket
SELECT * FROM storage.objects WHERE bucket_id = 'pitch-perfect-files';
```

## 6. File Structure

Files will be stored with this structure:
- `public/filename.ext` - Public files
- `private/userId/filename.ext` - Private files per user

## 7. Security Notes

- The service role key has full access to your database and storage
- Keep it secure and never expose it in client-side code
- Consider implementing user-specific file access controls
- Monitor storage usage and costs
