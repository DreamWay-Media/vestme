import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { ArrowLeft, Plus, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetAdminTheme, useDeleteTheme } from "@/hooks/useAdminThemes";
import { useAdminTemplates, useDeleteTemplate } from "@/hooks/useAdminTemplates";
import { useToast } from "@/hooks/use-toast";
import { ThemePreview } from "@/components/Admin/ThemePreview";
import type { ThemeStyling } from "@/components/Admin/ThemeStylingPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ThemeTemplatesPage() {
  const { themeId } = useParams<{ themeId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  const { data: theme, isLoading: isLoadingTheme } = useGetAdminTheme(themeId || null);
  const deleteThemeMutation = useDeleteTheme();
  const deleteTemplateMutation = useDeleteTemplate();

  // Get templates for this theme
  const { data: allTemplates, isLoading: isLoadingTemplates, refetch: refetchTemplates } = useAdminTemplates();
  const themeTemplates = allTemplates?.filter(t => (t as any).themeId === themeId) || [];

  const templatesByCategory = themeTemplates.reduce((acc, template) => {
    const category = template.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, typeof themeTemplates>);

  const handleDeleteTheme = async () => {
    if (!themeId) return;

    try {
      await deleteThemeMutation.mutateAsync(themeId);
      toast({
        title: "Theme deleted",
        description: "Theme has been deleted successfully.",
      });
      setLocation('/admin/templates');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete theme",
        variant: "destructive",
      });
    }
  };

  const handleCreateTemplate = () => {
    setLocation(`/admin/templates/new/design?themeId=${themeId}`);
  };

  const handleEditTemplate = (templateId: string) => {
    setLocation(`/admin/templates/${templateId}/design?themeId=${themeId}`);
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplateToDelete(templateId);
    setDeleteDialogOpen(true);
  };

  if (isLoadingTheme) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Loading theme...</p>
        </div>
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Theme not found</h2>
          <Button onClick={() => setLocation('/admin/templates')}>
            Back to Themes
          </Button>
        </div>
      </div>
    );
  }

  const themeStyling: ThemeStyling = theme.metadata ? {
    colorScheme: theme.metadata.colorScheme || {
      primary: '#3B82F6',
      secondary: '#64748B',
      accent: '#10B981',
      contrast: '#FFFFFF',
    },
    typography: theme.metadata.typography || {
      fontFamily: 'Inter',
      titleSize: 'text-4xl',
      bodySize: 'text-base',
    },
    background: theme.metadata.background || {
      type: 'solid',
      color: '#FFFFFF',
    },
    style: (theme.metadata.style as any) || 'modern',
  } : {
    colorScheme: { primary: '#3B82F6', secondary: '#64748B', accent: '#10B981', contrast: '#FFFFFF' },
    typography: { fontFamily: 'Inter', titleSize: 'text-4xl', bodySize: 'text-base' },
    background: { type: 'solid', color: '#FFFFFF' },
    style: 'modern',
  };

  const categories = ['title', 'content', 'data', 'closing'];
  const selectedTemplates = selectedCategory === 'all'
    ? themeTemplates
    : templatesByCategory[selectedCategory] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation('/admin/templates')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{theme.name}</h1>
                <p className="text-sm text-muted-foreground">{theme.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setLocation(`/admin/themes/${themeId}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Theme
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setTemplateToDelete(themeId);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Theme
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Theme Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme Preview</CardTitle>
                <CardDescription>How this theme looks</CardDescription>
              </CardHeader>
              <CardContent>
                <ThemePreview styling={themeStyling} themeName={theme.name} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Theme Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Access Tier</div>
                  <Badge variant={theme.accessTier === 'premium' ? 'default' : 'secondary'}>
                    {theme.accessTier}
                  </Badge>
                </div>
                {theme.isDefault && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    <Badge>Default Theme</Badge>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Slides</div>
                  <div className="text-2xl font-bold">{themeTemplates.length}</div>
                </div>
                {theme.tags && theme.tags.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Tags</div>
                    <div className="flex flex-wrap gap-2">
                      {theme.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Slides */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Slides in Theme</h2>
              <Button onClick={handleCreateTemplate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Slide
              </Button>
            </div>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="title">Title</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="data">Data</TabsTrigger>
                <TabsTrigger value="closing">Closing</TabsTrigger>
              </TabsList>

              {isLoadingTemplates ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-32 w-full mb-4" />
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : selectedTemplates.length === 0 ? (
                <div className="text-center py-12 mt-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                    <Plus className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No slides in this category
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {selectedCategory === 'all'
                      ? 'Get started by creating your first slide for this theme'
                      : `No ${selectedCategory} slides in this theme`}
                  </p>
                  <Button onClick={handleCreateTemplate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Slide
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {selectedTemplates.map((template) => (
                    <Card key={template.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <CardDescription className="mt-1">
                              {template.description}
                            </CardDescription>
                          </div>
                          <Badge variant="outline">{template.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {template.thumbnail && (
                          <div className="aspect-video bg-gray-100 rounded-lg mb-4 overflow-hidden">
                            <img
                              src={template.thumbnail}
                              alt={template.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTemplate(template.id)}
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTemplate(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </Tabs>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {templateToDelete === themeId ? 'Theme' : 'Slide'}?</AlertDialogTitle>
            <AlertDialogDescription>
              {templateToDelete === themeId
                ? 'This will delete the theme and all slides within it. This action cannot be undone.'
                : 'This action cannot be undone. This slide will be permanently deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (templateToDelete === themeId) {
                  handleDeleteTheme();
                } else if (templateToDelete) {
                  try {
                    await deleteTemplateMutation.mutateAsync(templateToDelete);
                    toast({
                      title: "Slide Deleted",
                      description: "Slide has been deleted successfully",
                    });
                    // Refresh templates list
                    await refetchTemplates();
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message || "Failed to delete slide",
                      variant: "destructive",
                    });
                  }
                }
                setDeleteDialogOpen(false);
                setTemplateToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


