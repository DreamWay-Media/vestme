/**
 * Media Library Component
 * Displays and manages media assets for a project
 */

import React, { useState, useRef } from 'react';
import {
  useProjectMedia,
  useUploadMedia,
  useExtractImages,
  useDeleteMedia,
  useUpdateMediaMetadata,
  type MediaAsset
} from '@/hooks/useMedia';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Download,
  Tag,
  FileText,
  Loader2,
  AlertCircle,
  Check,
  X,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface MediaLibraryProps {
  projectId: string;
  websiteUrl?: string;
  /**
   * Optional callback when an asset is selected. Used by picker dialogs.
   */
  onSelect?: (url: string) => void;
}

export function MediaLibrary({ projectId, websiteUrl, onSelect }: MediaLibraryProps) {
  const { data, isLoading, error } = useProjectMedia(projectId);
  const uploadMutation = useUploadMedia(projectId);
  const extractMutation = useExtractImages(projectId);
  const deleteMutation = useDeleteMedia(projectId);
  const updateMetadataMutation = useUpdateMediaMetadata(projectId);
  const { toast } = useToast();

  // Debug logging
  console.log('MediaLibrary - Project ID:', projectId);
  console.log('MediaLibrary - Website URL:', websiteUrl);

  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const [metadataForm, setMetadataForm] = useState({
    tags: [] as string[],
    description: '',
    altText: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file (JPEG, PNG, WebP, GIF)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB',
        variant: 'destructive',
      });
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;

      try {
        // Show initial upload toast
        toast({
          title: 'Uploading...',
          description: 'Uploading image and analyzing with AI...',
        });

        const result = await uploadMutation.mutateAsync({
          file: base64,
          filename: file.name,
          fileType: file.type,
        });

        // Show success with AI-generated tags
        const aiTags = result.tags?.filter((tag: string) => tag !== 'uploaded') || [];
        let description = 'Image uploaded successfully!';

        if (aiTags.length > 0) {
          description += `\n\n🤖 AI Tags: ${aiTags.join(', ')}`;
        }

        toast({
          title: 'Success',
          description,
        });
      } catch (error: any) {
        toast({
          title: 'Upload failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExtractImages = async () => {
    if (!websiteUrl) {
      toast({
        title: 'No website URL',
        description: 'Please provide a website URL to extract images from',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await extractMutation.mutateAsync({
        websiteUrl,
        maxImages: 20,
      });

      // Build detailed message
      const stats = result.stats || {};
      let description = `Saved ${result.saved.length} pitch deck-relevant images`;

      if (stats.totalFound) {
        const filtered = stats.filtered || 0;
        const duplicates = stats.duplicates || 0;

        if (filtered > 0 || duplicates > 0) {
          description += `\n\nFiltered out: ${filtered} irrelevant`;
          if (duplicates > 0) {
            description += `, ${duplicates} duplicates`;
          }
        }
      }

      toast({
        title: 'Extraction complete',
        description,
      });
    } catch (error: any) {
      toast({
        title: 'Extraction failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(assetId);
      toast({
        title: 'Success',
        description: 'Image deleted successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleOpenMetadata = (asset: MediaAsset) => {
    setSelectedAsset(asset);
    setMetadataForm({
      tags: asset.tags || [],
      description: asset.description || '',
      altText: asset.altText || '',
    });
    setShowMetadataDialog(true);
  };

  // New: handle asset selection for picker mode
  const handleSelectAsset = (asset: MediaAsset) => {
    if (onSelect) {
      onSelect(asset.storageUrl);
    }
  };

  const handleSaveMetadata = async () => {
    if (!selectedAsset) return;

    try {
      await updateMetadataMutation.mutateAsync({
        assetId: selectedAsset.id,
        ...metadataForm,
      });

      toast({
        title: 'Success',
        description: 'Metadata updated successfully',
      });
      setShowMetadataDialog(false);
      setSelectedAsset(null);
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleAddTag = (tag: string) => {
    if (tag && !metadataForm.tags.includes(tag)) {
      setMetadataForm({
        ...metadataForm,
        tags: [...metadataForm.tags, tag],
      });
    }
  };

  const handleRemoveTag = (tag: string) => {
    setMetadataForm({
      ...metadataForm,
      tags: metadataForm.tags.filter(t => t !== tag),
    });
  };

  const { assets = [], quota } = data || {};
  const usagePercent = quota ? (quota.currentUsage / quota.limit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Media Library</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage images for your pitch deck
          </p>
        </div>

        <div className="flex gap-2">
          {websiteUrl && (
            <Button
              variant="outline"
              onClick={handleExtractImages}
              disabled={extractMutation.isPending}
            >
              {extractMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Extracting...</>
              ) : (
                <><Globe className="w-4 h-4 mr-2" /> Extract from Website</>
              )}
            </Button>
          )}

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Upload Image</>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Website URL Info */}
      {websiteUrl && assets.length === 0 && !extractMutation.isPending && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">Website detected</h3>
              <p className="text-sm text-blue-800 mb-2">
                Click "Extract from Website" to automatically import images from <span className="font-medium">{websiteUrl}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Storage Quota */}
      {quota && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Storage Usage</span>
            <span className="text-sm text-muted-foreground">
              {quota.currentUsage.toFixed(2)} MB / {quota.limit} MB
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${usagePercent > 90 ? 'bg-destructive' : 'bg-primary'
                }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Media Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg border-destructive">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
          <h3 className="text-lg font-semibold mb-2">Failed to load media</h3>
          <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
          <p className="text-xs text-muted-foreground">You can still upload images using the button above</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No images yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Upload images or extract them from your website to get started
          </p>
          <div className="flex gap-2 justify-center">
            {websiteUrl && (
              <Button variant="outline" onClick={handleExtractImages}>
                <Globe className="w-4 h-4 mr-2" /> Extract from Website
              </Button>
            )}
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" /> Upload Image
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="group relative border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-muted flex items-center justify-center">
                <img
                  src={asset.thumbnailUrl || asset.storageUrl}
                  alt={asset.altText || asset.originalFilename || 'Media asset'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = asset.storageUrl; // Fallback to full image
                  }}
                />
              </div>

              {/* Overlay Actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleOpenMetadata(asset)}
                >
                  <FileText className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.open(asset.storageUrl, '_blank')}
                >
                  <Download className="w-4 h-4" />
                </Button>
                {onSelect && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectAsset(asset)}
                  >
                    Select
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeleteAsset(asset.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Info Bar */}
              <div className="p-2 bg-background space-y-1">
                <p className="text-xs font-medium truncate">
                  {asset.originalFilename || 'Untitled'}
                </p>

                {/* AI Tags */}
                {asset.tags && asset.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {asset.tags
                      .filter(tag => tag !== 'website-extracted') // Hide the source tag
                      .slice(0, 2) // Show max 2 tags
                      .map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {(asset.fileSize / 1024).toFixed(0)} KB
                  </span>
                  {asset.tags && asset.tags.length > 2 && (
                    <span className="text-xs text-muted-foreground">
                      +{asset.tags.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metadata Dialog */}
      <Dialog open={showMetadataDialog} onOpenChange={setShowMetadataDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Image Metadata</DialogTitle>
            <DialogDescription>
              Add tags and descriptions to help AI select the best images for your slides
            </DialogDescription>
          </DialogHeader>

          {selectedAsset && (
            <div className="space-y-4">
              {/* Image Preview */}
              <div className="aspect-video bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src={selectedAsset.storageUrl}
                  alt={selectedAsset.altText || selectedAsset.originalFilename || 'Asset'}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2 mt-1">
                  {metadataForm.tags.map((tag) => (
                    <div
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                    >
                      <span>{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag (e.g., product, team, logo)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.querySelector('input[placeholder*="Add a tag"]') as HTMLInputElement;
                      if (input?.value) {
                        handleAddTag(input.value);
                        input.value = '';
                      }
                    }}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this image shows..."
                  value={metadataForm.description}
                  onChange={(e) =>
                    setMetadataForm({ ...metadataForm, description: e.target.value })
                  }
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Alt Text */}
              <div>
                <Label htmlFor="altText">Alt Text (for accessibility)</Label>
                <Input
                  id="altText"
                  placeholder="Brief description for screen readers"
                  value={metadataForm.altText}
                  onChange={(e) =>
                    setMetadataForm({ ...metadataForm, altText: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMetadataDialog(false);
                    setSelectedAsset(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveMetadata}
                  disabled={updateMetadataMutation.isPending}
                >
                  {updateMetadataMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

