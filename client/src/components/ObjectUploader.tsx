import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters?: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed to be uploaded
 *   (default: 1)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.onGetUploadParameters - Function to get upload parameters (method and URL).
 *   Typically used to fetch a presigned URL from the backend server for direct-to-S3
 *   uploads.
 * @param props.onComplete - Callback function called when upload is complete. Typically
 *   used to make post-upload API calls to update server state and set object ACL
 *   policies.
 * @param props.buttonClassName - Optional CSS class name for the button
 * @param props.children - Content to be rendered inside the button
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['image/*', 'application/pdf', 'text/*', 'application/*'], // Allow various file types
      },
      autoProceed: false,
    })
      .on("file-added", async (file) => {
        try {
          console.log('Starting upload for file:', file.name);
          console.log('File data type:', typeof file.data);
          console.log('File size:', file.data?.size || 'unknown');
          
          // Upload file directly to Supabase Storage
          // Sanitize filename to remove invalid characters
          const sanitizedName = file.name
            .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace invalid chars with underscore
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
          
          const fileName = `${Date.now()}-${sanitizedName}`;
          console.log('Original filename:', file.name);
          console.log('Sanitized filename:', sanitizedName);
          console.log('Final filename:', fileName);
          
          const bucketName = 'pitch-perfect-files'; // This should match your SUPABASE_STORAGE_BUCKET
          console.log('Using bucket:', bucketName);
          console.log('Supabase client:', supabase);
          
          // Try uploading without the 'public/' prefix first
          const uploadPath = fileName;
          console.log('Upload path:', uploadPath);
          
          const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(uploadPath, file.data, {
              contentType: file.type,
              upsert: true
            });

          if (error) {
            console.error('Upload error:', error);
            uppy.emit('upload-error', file, error);
            return;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(uploadPath);

          // Mark file as uploaded
          file.meta.uploadURL = urlData.publicUrl;
          uppy.emit('upload-success', file, { uploadURL: urlData.publicUrl });
          
          // Trigger complete event
          const result: UploadResult<Record<string, unknown>, Record<string, unknown>> = {
            successful: [{
              ...file,
              uploadURL: urlData.publicUrl
            }],
            failed: [],
            uploadURL: urlData.publicUrl
          };
          
          onComplete?.(result);
          setShowModal(false);
        } catch (error) {
          console.error('Upload failed:', error);
          uppy.emit('upload-error', file, error);
        }
      })
      .on("upload-success", (file, response) => {
        console.log(`File ${file.name} uploaded successfully:`, response);
      })
      .on("upload-error", (file, error) => {
        console.error(`Upload failed for ${file.name}:`, error);
      })
  );

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName}>
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}