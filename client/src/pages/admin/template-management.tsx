import { useState } from "react";
import { useLocation } from "wouter";
import { 
  Star, 
  Lock, 
  Unlock, 
  Eye, 
  Download, 
  Trash2, 
  RefreshCw, 
  Upload,
  TrendingUp,
  Search,
  Filter,
  Edit,
  Plus,
  FileDown,
  FileUp,
  Palette
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminTemplates,
  useGetTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useSetDefaultTemplate,
  useUpdateTemplateAccess,
  useReloadTemplates,
  useDeleteTemplate,
} from "@/hooks/useAdminTemplates";
import type { Template } from "@/hooks/useTemplates";

export default function TemplateManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<Template | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Template>>({});
  const [showAdvancedEdit, setShowAdvancedEdit] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState<Partial<Template>>({
    name: '',
    description: '',
    category: 'content',
    accessTier: 'free',
    isEnabled: true,
    displayOrder: 0,
    tags: [],
    layout: { zones: [] },
    defaultStyling: { colors: {}, fonts: {} },
    contentSchema: { fields: [] },
  });
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<Partial<Template> | null>(null);
  
  const { data: templates, isLoading } = useAdminTemplates({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    search: searchTerm || undefined,
  });
  
  const createTemplateMutation = useCreateTemplate();
  const setDefaultMutation = useSetDefaultTemplate();
  const updateAccessMutation = useUpdateTemplateAccess();
  const updateTemplateMutation = useUpdateTemplate();
  const reloadMutation = useReloadTemplates();
  const deleteMutation = useDeleteTemplate();
  
  const { data: editingTemplate } = useGetTemplate(editingTemplateId);
  
  const handleSetDefault = async (templateId: string) => {
    try {
      await setDefaultMutation.mutateAsync(templateId);
      toast({
        title: "Default Template Set",
        description: "This template is now the default for free users",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set default template",
        variant: "destructive",
      });
    }
  };
  
  const handleAccessTierChange = async (templateId: string, accessTier: 'free' | 'premium', currentEnabled: boolean) => {
    try {
      await updateAccessMutation.mutateAsync({
        templateId,
        accessTier,
        isEnabled: currentEnabled,
      });
      toast({
        title: "Access Updated",
        description: `Template is now ${accessTier}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update template access",
        variant: "destructive",
      });
    }
  };
  
  const handleToggleEnabled = async (templateId: string, isEnabled: boolean, currentAccessTier: string) => {
    try {
      await updateAccessMutation.mutateAsync({
        templateId,
        accessTier: currentAccessTier as 'free' | 'premium',
        isEnabled,
      });
      toast({
        title: isEnabled ? "Template Enabled" : "Template Disabled",
        description: `Template is now ${isEnabled ? "visible" : "hidden"} to users`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update template status",
        variant: "destructive",
      });
    }
  };
  
  const handleReload = async () => {
    try {
      await reloadMutation.mutateAsync();
      toast({
        title: "Templates Reloaded",
        description: "All templates have been synced from filesystem",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reload templates",
        variant: "destructive",
      });
    }
  };
  
  const handleDelete = async (template: Template) => {
    try {
      await deleteMutation.mutateAsync(template.id);
      toast({
        title: "Template Deleted",
        description: `${template.name} has been removed`,
      });
      setDeleteConfirm(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      });
    }
  };
  
  const handleOpenEdit = (template: Template) => {
    setEditingTemplateId(template.id);
    setThumbnailPreview(template.thumbnail || '');
    setEditFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      thumbnail: template.thumbnail,
      layout: template.layout,
      defaultStyling: template.defaultStyling,
      contentSchema: template.contentSchema,
      accessTier: template.accessTier,
      isEnabled: template.isEnabled,
      displayOrder: template.displayOrder,
      tags: template.tags || [],
    });
    setShowAdvancedEdit(false);
  };
  
  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUri = reader.result as string;
      setThumbnailPreview(dataUri);
      setEditFormData({ ...editFormData, thumbnail: dataUri });
    };
    reader.readAsDataURL(file);
  };
  
  const handleSaveEdit = async () => {
    if (!editingTemplateId) return;
    
    try {
      // Validate JSON fields if they were edited
      const updates = { ...editFormData };
      
      // Validate layout
      if (typeof updates.layout === 'string') {
        try {
          updates.layout = JSON.parse(updates.layout);
        } catch (e) {
          toast({
            title: "Invalid JSON",
            description: "Layout configuration contains invalid JSON",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Validate defaultStyling
      if (typeof updates.defaultStyling === 'string') {
        try {
          updates.defaultStyling = JSON.parse(updates.defaultStyling);
        } catch (e) {
          toast({
            title: "Invalid JSON",
            description: "Default styling contains invalid JSON",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Validate contentSchema
      if (typeof updates.contentSchema === 'string') {
        try {
          updates.contentSchema = JSON.parse(updates.contentSchema);
        } catch (e) {
          toast({
            title: "Invalid JSON",
            description: "Content schema contains invalid JSON",
            variant: "destructive",
          });
          return;
        }
      }
      
      await updateTemplateMutation.mutateAsync({
        templateId: editingTemplateId,
        updates,
      });
      toast({
        title: "Template Updated",
        description: "Template has been successfully updated",
      });
      setEditingTemplateId(null);
      setEditFormData({});
      setThumbnailPreview('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update template",
        variant: "destructive",
      });
    }
  };
  
  const handleOpenCreate = () => {
    setCreateFormData({
      name: '',
      description: '',
      category: 'content',
      accessTier: 'free',
      isEnabled: true,
      displayOrder: 0,
      tags: [],
      layout: { zones: [] },
      defaultStyling: { colors: {}, fonts: {} },
      contentSchema: { fields: [] },
    });
    setThumbnailPreview('');
    setShowCreateModal(true);
  };
  
  const handleCreateThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Thumbnail must be less than 2MB",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }
    
    // Convert to data URI
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUri = e.target?.result as string;
      setThumbnailPreview(dataUri);
      setCreateFormData(prev => ({ ...prev, thumbnail: dataUri }));
    };
    reader.readAsDataURL(file);
  };
  
  const handleCreateTemplate = async () => {
    try {
      // Validate required fields
      if (!createFormData.name?.trim()) {
        toast({
          title: "Validation Error",
          description: "Template name is required",
          variant: "destructive",
        });
        return;
      }
      
      // Validate JSON fields
      const templateData = { ...createFormData };
      
      // Validate layout
      if (typeof templateData.layout === 'string') {
        try {
          templateData.layout = JSON.parse(templateData.layout);
        } catch (e) {
          toast({
            title: "Invalid JSON",
            description: "Layout configuration contains invalid JSON",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Validate defaultStyling
      if (typeof templateData.defaultStyling === 'string') {
        try {
          templateData.defaultStyling = JSON.parse(templateData.defaultStyling);
        } catch (e) {
          toast({
            title: "Invalid JSON",
            description: "Default styling contains invalid JSON",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Validate contentSchema
      if (typeof templateData.contentSchema === 'string') {
        try {
          templateData.contentSchema = JSON.parse(templateData.contentSchema);
        } catch (e) {
          toast({
            title: "Invalid JSON",
            description: "Content schema contains invalid JSON",
            variant: "destructive",
          });
          return;
        }
      }
      
      // Parse tags if it's a string
      if (typeof templateData.tags === 'string') {
        templateData.tags = templateData.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }
      
      await createTemplateMutation.mutateAsync(templateData);
      
      toast({
        title: "Template Created",
        description: "The new template has been created successfully",
      });
      
      setShowCreateModal(false);
      setCreateFormData({
        name: '',
        description: '',
        category: 'content',
        accessTier: 'free',
        isEnabled: true,
        displayOrder: 0,
        tags: [],
        layout: { zones: [] },
        defaultStyling: { colors: {}, fonts: {} },
        contentSchema: { fields: [] },
      });
      setThumbnailPreview('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    }
  };
  
  const handleExportTemplate = (template: Template) => {
    try {
      // Create a clean export object (remove system fields)
      const exportData = {
        name: template.name,
        description: template.description,
        category: template.category,
        thumbnail: template.thumbnail,
        layout: template.layout,
        defaultStyling: template.defaultStyling,
        contentSchema: template.contentSchema,
        accessTier: template.accessTier,
        tags: template.tags,
        version: template.version || '1.0.0',
      };
      
      // Create blob and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.toLowerCase().replace(/\s+/g, '-')}-template.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Template Exported",
        description: `${template.name} has been exported successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export template",
        variant: "destructive",
      });
    }
  };
  
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    
    // Validate file type
    if (!file.name.endsWith('.json')) {
      toast({
        title: "Invalid File",
        description: "Please upload a JSON file",
        variant: "destructive",
      });
      return;
    }
    
    // Read and parse file
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate required fields
      if (!data.name || !data.category) {
        toast({
          title: "Invalid Template",
          description: "Template must have name and category fields",
          variant: "destructive",
        });
        return;
      }
      
      setImportPreview(data);
    } catch (error: any) {
      toast({
        title: "Parse Error",
        description: "Failed to parse JSON file",
        variant: "destructive",
      });
      setImportFile(null);
      setImportPreview(null);
    }
  };
  
  const handleImportTemplate = async () => {
    if (!importPreview) return;
    
    try {
      await createTemplateMutation.mutateAsync(importPreview);
      
      toast({
        title: "Template Imported",
        description: `${importPreview.name} has been imported successfully`,
      });
      
      setShowImportModal(false);
      setImportFile(null);
      setImportPreview(null);
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import template",
        variant: "destructive",
      });
    }
  };
  
  const getCategoryBadgeColor = (category: string) => {
    const colors = {
      title: "bg-blue-100 text-blue-800",
      content: "bg-green-100 text-green-800",
      data: "bg-purple-100 text-purple-800",
      closing: "bg-amber-100 text-amber-800",
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Template Management</h1>
              <p className="text-gray-600 mt-1">
                Manage slide templates, access control, and settings
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReload}
                disabled={reloadMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${reloadMutation.isPending ? 'animate-spin' : ''}`} />
                Reload from Files
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowImportModal(true)}
              >
                <FileUp className="h-4 w-4 mr-2" />
                Import Template
              </Button>
              <Button onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create New Template
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="content">Content</SelectItem>
                <SelectItem value="data">Data</SelectItem>
                <SelectItem value="closing">Closing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Templates Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-16 w-24" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Preview</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Access Tier</TableHead>
                  <TableHead className="text-center">Default</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    {/* Preview */}
                    <TableCell>
                      <div className="aspect-video w-20 bg-gray-100 rounded overflow-hidden">
                        {template.thumbnail ? (
                          <img
                            src={template.thumbnail}
                            alt={template.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            📄
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Name */}
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-gray-500 line-clamp-1">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Category */}
                    <TableCell>
                      <Badge className={getCategoryBadgeColor(template.category)}>
                        {template.category}
                      </Badge>
                    </TableCell>
                    
                    {/* Access Tier Selector */}
                    <TableCell>
                      <Select
                        value={template.accessTier}
                        onValueChange={(value) =>
                          handleAccessTierChange(template.id, value as 'free' | 'premium', template.isEnabled)
                        }
                        disabled={updateAccessMutation.isPending}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">
                            <span className="flex items-center">
                              <Unlock className="mr-2 h-4 w-4" />
                              Free
                            </span>
                          </SelectItem>
                          <SelectItem value="premium">
                            <span className="flex items-center">
                              <Lock className="mr-2 h-4 w-4" />
                              Premium
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    
                    {/* Default Toggle */}
                    <TableCell className="text-center">
                      <Button
                        variant={template.isDefault ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSetDefault(template.id)}
                        disabled={template.isDefault || setDefaultMutation.isPending}
                        className="min-w-24"
                      >
                        {template.isDefault ? (
                          <>
                            <Star className="mr-1 h-3 w-3 fill-current" />
                            Default
                          </>
                        ) : (
                          <>
                            <Star className="mr-1 h-3 w-3" />
                            Set Default
                          </>
                        )}
                      </Button>
                    </TableCell>
                    
                    {/* Enabled/Disabled Toggle */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Switch
                          checked={template.isEnabled}
                          onCheckedChange={(checked) =>
                            handleToggleEnabled(template.id, checked, template.accessTier)
                          }
                          disabled={updateAccessMutation.isPending}
                        />
                        <span className="text-xs text-gray-500">
                          {template.isEnabled ? "On" : "Off"}
                        </span>
                      </div>
                    </TableCell>
                    
                    {/* Usage Stats */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="h-3 w-3 text-gray-400" />
                        <span className="text-sm font-medium">
                          {template.usageCount || 0}
                        </span>
                      </div>
                    </TableCell>
                    
                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/admin/templates/${template.id}/design`)}
                          title="Visual Design Studio"
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        >
                          <Palette className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(template)}
                          title="Edit template"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExportTemplate(template)}
                          title="Export template as JSON"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(template)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete template"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Filter className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
        
        {/* Summary Stats */}
        {templates && templates.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Total Templates</div>
              <div className="text-2xl font-bold mt-1">{templates.length}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Free Templates</div>
              <div className="text-2xl font-bold mt-1">
                {templates.filter((t) => t.accessTier === "free").length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Premium Templates</div>
              <div className="text-2xl font-bold mt-1">
                {templates.filter((t) => t.accessTier === "premium").length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm text-gray-600">Total Usage</div>
              <div className="text-2xl font-bold mt-1">
                {templates.reduce((sum, t) => sum + (t.usageCount || 0), 0)}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Edit Template Dialog */}
      <AlertDialog open={!!editingTemplateId} onOpenChange={() => {
        setEditingTemplateId(null);
        setEditFormData({});
        setThumbnailPreview('');
        setShowAdvancedEdit(false);
      }}>
        <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Template</AlertDialogTitle>
            <AlertDialogDescription>
              Update template properties. Changes will be applied immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <Tabs defaultValue="basic" className="flex-1 overflow-hidden">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="thumbnail">Thumbnail</TabsTrigger>
              <TabsTrigger value="advanced">Layout & Styling</TabsTrigger>
            </TabsList>
            
            <div className="overflow-y-auto max-h-[60vh] mt-4">
              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 px-1">
            {/* Name */}
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editFormData.name || ''}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Template name"
              />
            </div>
            
            {/* Description */}
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={editFormData.description || ''}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Template description"
              />
            </div>
            
            {/* Category */}
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select
                value={editFormData.category}
                onValueChange={(value: any) => setEditFormData({ ...editFormData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">Title</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="closing">Closing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Access Tier */}
            <div>
              <label className="text-sm font-medium">Access Tier</label>
              <Select
                value={editFormData.accessTier}
                onValueChange={(value: any) => setEditFormData({ ...editFormData, accessTier: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select access tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Display Order */}
            <div>
              <label className="text-sm font-medium">Display Order</label>
              <Input
                type="number"
                value={editFormData.displayOrder || 0}
                onChange={(e) => setEditFormData({ ...editFormData, displayOrder: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            
            {/* Tags */}
            <div>
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                value={editFormData.tags?.join(', ') || ''}
                onChange={(e) => setEditFormData({ 
                  ...editFormData, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                })}
                placeholder="title, hero, modern"
              />
            </div>
            
            {/* Enabled Switch */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Enabled</label>
              <Switch
                checked={editFormData.isEnabled}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, isEnabled: checked })}
              />
            </div>
              </TabsContent>
              
              {/* Thumbnail Tab */}
              <TabsContent value="thumbnail" className="space-y-4 px-1">
                <div className="space-y-4">
                  {/* Current Thumbnail Preview */}
                  {thumbnailPreview && (
                    <div>
                      <label className="text-sm font-medium">Current Thumbnail</label>
                      <div className="mt-2 border rounded-lg p-4 bg-gray-50">
                        <img 
                          src={thumbnailPreview} 
                          alt="Template thumbnail" 
                          className="w-full max-w-md mx-auto rounded"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Upload New Thumbnail */}
                  <div>
                    <label className="text-sm font-medium">Upload New Thumbnail</label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Accepts: JPG, PNG, SVG, WebP (Max 2MB). Image will be converted to data URI.
                    </p>
                  </div>
                  
                  {/* Or Paste Data URI */}
                  <div>
                    <label className="text-sm font-medium">Or Paste Data URI / URL</label>
                    <Textarea
                      value={editFormData.thumbnail || ''}
                      onChange={(e) => {
                        setEditFormData({ ...editFormData, thumbnail: e.target.value });
                        setThumbnailPreview(e.target.value);
                      }}
                      placeholder="data:image/svg+xml;base64,... or https://..."
                      rows={4}
                      className="mt-2 font-mono text-xs"
                    />
                  </div>
                </div>
              </TabsContent>
              
              {/* Advanced Tab - Layout & Styling */}
              <TabsContent value="advanced" className="space-y-4 px-1">
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                    ⚠️ <strong>Advanced:</strong> Edit JSON structures carefully. Invalid JSON will cause errors.
                  </div>
                  
                  {/* Layout Editor */}
                  <div>
                    <label className="text-sm font-medium">Layout Configuration</label>
                    <p className="text-xs text-gray-500 mb-2">
                      Define zones, positioning, and constraints for template elements
                    </p>
                    <Textarea
                      value={JSON.stringify(editFormData.layout, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setEditFormData({ ...editFormData, layout: parsed });
                        } catch (error) {
                          // Allow invalid JSON while typing
                          setEditFormData({ ...editFormData, layout: e.target.value as any });
                        }
                      }}
                      rows={10}
                      className="font-mono text-xs"
                    />
                  </div>
                  
                  {/* Default Styling Editor */}
                  <div>
                    <label className="text-sm font-medium">Default Styling</label>
                    <p className="text-xs text-gray-500 mb-2">
                      Define colors, fonts, spacing (supports brandKit variables)
                    </p>
                    <Textarea
                      value={JSON.stringify(editFormData.defaultStyling, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setEditFormData({ ...editFormData, defaultStyling: parsed });
                        } catch (error) {
                          setEditFormData({ ...editFormData, defaultStyling: e.target.value as any });
                        }
                      }}
                      rows={10}
                      className="font-mono text-xs"
                    />
                  </div>
                  
                  {/* Content Schema Editor */}
                  <div>
                    <label className="text-sm font-medium">Content Schema</label>
                    <p className="text-xs text-gray-500 mb-2">
                      Define required fields and validation rules for template content
                    </p>
                    <Textarea
                      value={JSON.stringify(editFormData.contentSchema, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setEditFormData({ ...editFormData, contentSchema: parsed });
                        } catch (error) {
                          setEditFormData({ ...editFormData, contentSchema: e.target.value as any });
                        }
                      }}
                      rows={8}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
          
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSaveEdit}
              disabled={updateTemplateMutation.isPending}
            >
              {updateTemplateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteConfirm?.isSystem ? "⚠️ Delete System Template?" : "Delete Template?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.isSystem ? (
                <>
                  <div className="text-red-600 font-semibold mb-2">
                    Warning: This is a system template!
                  </div>
                  <div>
                    You are about to delete "{deleteConfirm?.name}". This template is loaded from the filesystem 
                    and will be recreated on server restart unless you also remove the JSON file.
                  </div>
                  <div className="mt-2 text-sm">
                    To permanently delete: Remove the file at <code className="bg-gray-100 px-1 rounded">server/templates/definitions/</code>
                  </div>
                </>
              ) : (
                <>
                  Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteConfirm?.isSystem ? "Delete Anyway" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Template Modal */}
      <AlertDialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Template</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new template from scratch. Fill in all required fields.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="thumbnail">Thumbnail</TabsTrigger>
              <TabsTrigger value="advanced">Advanced (JSON)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={createFormData.name || ''}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Hero Title Slide"
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={createFormData.description || ''}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the template"
                  className="mt-1"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category *</label>
                  <Select
                    value={createFormData.category || 'content'}
                    onValueChange={(value) => setCreateFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="title">Title</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="data">Data</SelectItem>
                      <SelectItem value="closing">Closing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Access Tier *</label>
                  <Select
                    value={createFormData.accessTier || 'free'}
                    onValueChange={(value) => setCreateFormData(prev => ({ ...prev, accessTier: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Display Order</label>
                  <Input
                    type="number"
                    value={createFormData.displayOrder || 0}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center space-x-2 mt-6">
                  <Switch
                    checked={createFormData.isEnabled !== false}
                    onCheckedChange={(checked) => setCreateFormData(prev => ({ ...prev, isEnabled: checked }))}
                  />
                  <label className="text-sm font-medium">Enabled</label>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  value={Array.isArray(createFormData.tags) ? createFormData.tags.join(', ') : ''}
                  onChange={(e) => setCreateFormData(prev => ({ 
                    ...prev, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                  }))}
                  placeholder="e.g., hero, title, intro"
                  className="mt-1"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="thumbnail" className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Thumbnail Preview</label>
                {thumbnailPreview && (
                  <div className="mt-2 border rounded-lg p-4 bg-gray-50">
                    <img 
                      src={thumbnailPreview} 
                      alt="Thumbnail preview" 
                      className="max-w-full h-auto max-h-64 mx-auto"
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium">Upload Thumbnail (Max 2MB)</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleCreateThumbnailUpload}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: JPG, PNG, GIF, WebP
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Or Paste Thumbnail URL/Data URI</label>
                <Textarea
                  value={createFormData.thumbnail || ''}
                  onChange={(e) => {
                    setCreateFormData(prev => ({ ...prev, thumbnail: e.target.value }));
                    setThumbnailPreview(e.target.value);
                  }}
                  placeholder="https://... or data:image/..."
                  className="mt-1 font-mono text-xs"
                  rows={4}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-800">
                  ⚠️ Advanced settings: Edit these JSON configurations carefully. Invalid JSON will prevent template creation.
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Layout Configuration (JSON)</label>
                <Textarea
                  value={typeof createFormData.layout === 'string' ? createFormData.layout : JSON.stringify(createFormData.layout, null, 2)}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, layout: e.target.value }))}
                  placeholder='{"zones": []}'
                  className="mt-1 font-mono text-xs"
                  rows={8}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Default Styling (JSON)</label>
                <Textarea
                  value={typeof createFormData.defaultStyling === 'string' ? createFormData.defaultStyling : JSON.stringify(createFormData.defaultStyling, null, 2)}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, defaultStyling: e.target.value }))}
                  placeholder='{"colors": {}, "fonts": {}}'
                  className="mt-1 font-mono text-xs"
                  rows={8}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Content Schema (JSON)</label>
                <Textarea
                  value={typeof createFormData.contentSchema === 'string' ? createFormData.contentSchema : JSON.stringify(createFormData.contentSchema, null, 2)}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, contentSchema: e.target.value }))}
                  placeholder='{"fields": []}'
                  className="mt-1 font-mono text-xs"
                  rows={8}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateTemplate}
              disabled={createTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Template Modal */}
      <AlertDialog open={showImportModal} onOpenChange={(open) => {
        setShowImportModal(open);
        if (!open) {
          setImportFile(null);
          setImportPreview(null);
        }
      }}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Import Template</AlertDialogTitle>
            <AlertDialogDescription>
              Upload a template JSON file to import it into your template library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Select Template File (JSON)</label>
              <Input
                type="file"
                accept=".json"
                onChange={handleImportFileChange}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload a JSON file exported from the template system
              </p>
            </div>
            
            {importPreview && (
              <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
                <h4 className="font-medium text-sm">Template Preview:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-medium">{importPreview.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <p className="font-medium capitalize">{importPreview.category}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Access Tier:</span>
                    <p className="font-medium capitalize">{importPreview.accessTier || 'free'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Version:</span>
                    <p className="font-medium">{importPreview.version || '1.0.0'}</p>
                  </div>
                </div>
                {importPreview.description && (
                  <div>
                    <span className="text-gray-600 text-sm">Description:</span>
                    <p className="text-sm">{importPreview.description}</p>
                  </div>
                )}
                {importPreview.tags && importPreview.tags.length > 0 && (
                  <div>
                    <span className="text-gray-600 text-sm">Tags:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {importPreview.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleImportTemplate}
              disabled={!importPreview || createTemplateMutation.isPending}
            >
              {createTemplateMutation.isPending ? "Importing..." : "Import Template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

