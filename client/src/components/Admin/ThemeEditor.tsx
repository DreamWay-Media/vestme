import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeStylingPanel, type ThemeStyling } from "./ThemeStylingPanel";
import { ThemePreview } from "./ThemePreview";
import { Badge } from "@/components/ui/badge";

export interface ThemeFormData {
  name: string;
  slug: string;
  description: string;
  accessTier: 'free' | 'premium';
  isDefault: boolean;
  isEnabled: boolean;
  tags: string[];
  styling: ThemeStyling;
}

interface ThemeEditorProps {
  initialData?: Partial<ThemeFormData>;
  onSubmit: (data: ThemeFormData) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const defaultStyling: ThemeStyling = {
  colorScheme: {
    primary: '#3B82F6',
    secondary: '#64748B',
    accent: '#10B981',
    contrast: '#FFFFFF',
  },
  typography: {
    fontFamily: 'Inter',
    titleSize: 'text-4xl',
    bodySize: 'text-base',
  },
  background: {
    type: 'solid',
    color: '#FFFFFF',
  },
  style: 'modern',
};

export function ThemeEditor({ initialData, onSubmit, onCancel, isLoading }: ThemeEditorProps) {
  const [formData, setFormData] = useState<ThemeFormData>({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    description: initialData?.description || '',
    accessTier: initialData?.accessTier || 'free',
    isDefault: initialData?.isDefault || false,
    isEnabled: initialData?.isEnabled !== undefined ? initialData.isEnabled : true,
    tags: initialData?.tags || [],
    styling: initialData?.styling || defaultStyling,
  });

  const [tagInput, setTagInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-v1';
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="styling">Styling</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Theme Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Modern Minimal"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="modern-minimal-v1"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier for this theme
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Clean, minimalist design with subtle colors..."
                  rows={4}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessTier">Access Tier</Label>
                <Select
                  value={formData.accessTier}
                  onValueChange={(value: 'free' | 'premium') =>
                    setFormData(prev => ({ ...prev, accessTier: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isEnabled">Enabled</Label>
                  <p className="text-xs text-muted-foreground">
                    Make this theme visible to users
                  </p>
                </div>
                <Switch
                  id="isEnabled"
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, isEnabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between space-x-2 p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="isDefault">Default Theme</Label>
                  <p className="text-xs text-muted-foreground">
                    Show this theme first to new users
                  </p>
                </div>
                <Switch
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) =>
                    setFormData(prev => ({ ...prev, isDefault: checked }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add tag..."
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="styling">
          <ThemeStylingPanel
            styling={formData.styling}
            onChange={(styling) => setFormData(prev => ({ ...prev, styling }))}
          />
        </TabsContent>

        <TabsContent value="preview">
          <div className="space-y-4">
            <ThemePreview styling={formData.styling} themeName={formData.name || "Theme Preview"} />
            <p className="text-sm text-muted-foreground text-center">
              This is a preview of how your theme will appear. All slides created within this theme will inherit these styles.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading || !formData.name || !formData.slug}>
          {isLoading ? 'Saving...' : initialData ? 'Update Theme' : 'Create Theme'}
        </Button>
      </div>
    </form>
  );
}


