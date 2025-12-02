import React, { useState, useRef } from 'react';
import { useProjectMedia, useUploadMedia, type MediaAsset } from '@/hooks/useMedia';
import { Upload, Loader2, Image as ImageIcon, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface MediaLibraryPickerProps {
    projectId: string;
    open: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
    currentValue?: string;
}

export function MediaLibraryPicker({
    projectId,
    open,
    onClose,
    onSelect,
    currentValue,
}: MediaLibraryPickerProps) {
    const { data, isLoading } = useProjectMedia(projectId);
    const uploadMutation = useUploadMedia(projectId);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedUrl, setSelectedUrl] = useState<string | undefined>(currentValue);

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
                const result = await uploadMutation.mutateAsync({
                    file: base64,
                    filename: file.name,
                    fileType: file.type,
                });

                toast({
                    title: 'Success',
                    description: 'Image uploaded successfully!',
                });

                // Auto-select the newly uploaded image
                if (result.storageUrl) {
                    setSelectedUrl(result.storageUrl);
                    onSelect(result.storageUrl);
                    onClose();
                }
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

    const handleSelect = (url: string) => {
        setSelectedUrl(url);
    };

    const handleConfirm = () => {
        if (selectedUrl) {
            onSelect(selectedUrl);
            onClose();
        }
    };

    const { assets = [] } = data || {};

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select Image</DialogTitle>
                    <DialogDescription>
                        Choose an image from your media library or upload a new one
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    {/* Upload Button */}
                    <div className="mb-4">
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadMutation.isPending}
                            variant="outline"
                            className="w-full"
                        >
                            {uploadMutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload New Image
                                </>
                            )}
                        </Button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileSelect}
                        />
                    </div>

                    {/* Media Grid */}
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : assets.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No images found in your library</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-4">
                            {assets.map((asset: MediaAsset) => (
                                <div
                                    key={asset.id}
                                    className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden aspect-square ${selectedUrl === asset.storageUrl
                                            ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2'
                                            : 'border-transparent hover:border-gray-200'
                                        }`}
                                    onClick={() => handleSelect(asset.storageUrl)}
                                >
                                    <img
                                        src={asset.storageUrl}
                                        alt={asset.filename}
                                        className="w-full h-full object-cover"
                                    />
                                    {selectedUrl === asset.storageUrl && (
                                        <div className="absolute top-2 right-2 bg-blue-500 text-white p-1 rounded-full">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!selectedUrl}>
                        Select Image
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
