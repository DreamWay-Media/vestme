import { useLocation } from "wouter";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeEditor, type ThemeFormData } from "@/components/Admin/ThemeEditor";
import { useCreateTheme, useGetAdminTheme, useUpdateTheme } from "@/hooks/useAdminThemes";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "wouter";

export default function ThemeEditorPage() {
  const { themeId } = useParams<{ themeId?: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditing = !!themeId;

  const { data: existingTheme, isLoading: isLoadingTheme } = useGetAdminTheme(themeId || null);
  const createMutation = useCreateTheme();
  const updateMutation = useUpdateTheme(themeId || '');

  const handleSubmit = async (data: ThemeFormData) => {
    try {
      // Only send fields that have changed when editing
      const themePayload: any = {
        name: data.name,
        slug: data.slug,
        accessTier: data.accessTier,
        isDefault: data.isDefault,
        isEnabled: data.isEnabled,
        tags: data.tags,
        metadata: {
          style: data.styling.style,
          colorScheme: data.styling.colorScheme,
          typography: data.styling.typography,
          background: data.styling.background,
        },
      };

      // Include description (can be empty string)
      if (data.description !== undefined) {
        themePayload.description = data.description || null;
      }

      if (isEditing) {
        console.log('Updating theme with payload:', JSON.stringify(themePayload, null, 2));
        await updateMutation.mutateAsync(themePayload);
        toast({
          title: "Theme updated",
          description: "Theme has been updated successfully.",
        });
        setLocation(`/admin/themes/${themeId}/templates`);
      } else {
        const result = await createMutation.mutateAsync(themePayload);
        toast({
          title: "Theme created",
          description: "Theme has been created successfully.",
        });
        setLocation(`/admin/themes/${result.id}/templates`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save theme",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      setLocation(`/admin/themes/${themeId}/templates`);
    } else {
      setLocation('/admin/templates');
    }
  };

  if (isLoadingTheme && isEditing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading theme...</p>
        </div>
      </div>
    );
  }

  const initialData = existingTheme ? {
    name: existingTheme.name,
    slug: existingTheme.slug,
    description: existingTheme.description || '',
    accessTier: existingTheme.accessTier,
    isDefault: existingTheme.isDefault,
    isEnabled: existingTheme.isEnabled !== undefined ? existingTheme.isEnabled : true,
    tags: existingTheme.tags || [],
    styling: existingTheme.metadata ? {
      colorScheme: existingTheme.metadata.colorScheme || {
        primary: '#3B82F6',
        secondary: '#64748B',
        accent: '#10B981',
        contrast: '#FFFFFF',
      },
      typography: existingTheme.metadata.typography || {
        fontFamily: 'Inter',
        titleSize: 'text-4xl',
        bodySize: 'text-base',
      },
      background: existingTheme.metadata.background || {
        type: 'solid' as const,
        color: '#FFFFFF',
      },
      style: (existingTheme.metadata.style as any) || 'modern',
    } : undefined,
  } : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {isEditing ? 'Edit Theme' : 'Create New Theme'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isEditing
                  ? 'Update theme settings and styling'
                  : 'Define a new theme with styling and attributes'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ThemeEditor
          initialData={initialData}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    </div>
  );
}


