import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Palette, Image, Save, RotateCcw } from "lucide-react";
import { MediaLibraryPicker } from "@/components/MediaLibrary/MediaLibraryPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ProjectLayoutWithHeader from "@/components/ProjectLayoutWithHeader";

interface BrandKit {
  id?: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  logoUrl?: string | null;
  logoAssetId?: string | null;
  brandAssets?: Array<{
    type: string;
    url: string;
    name?: string;
  }>;
}

const DEFAULT_BRAND_KIT: BrandKit = {
  name: "",
  primaryColor: "#000000",
  secondaryColor: "#F8FAFC",
  accentColor: "#3B82F6",
  fontFamily: "Inter",
  logoUrl: null,
  brandAssets: [],
};

const FONT_OPTIONS = [
  { group: "Popular Sans-Serif", fonts: [
    { value: "Inter", label: "Inter" },
    { value: "Roboto", label: "Roboto" },
    { value: "Open Sans", label: "Open Sans" },
    { value: "Poppins", label: "Poppins" },
    { value: "Montserrat", label: "Montserrat" },
    { value: "Lato", label: "Lato" },
    { value: "Nunito", label: "Nunito" },
    { value: "DM Sans", label: "DM Sans" },
    { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
  ]},
  { group: "Modern Sans-Serif", fonts: [
    { value: "Space Grotesk", label: "Space Grotesk" },
    { value: "Outfit", label: "Outfit" },
    { value: "Manrope", label: "Manrope" },
    { value: "Sora", label: "Sora" },
    { value: "Figtree", label: "Figtree" },
    { value: "Lexend", label: "Lexend" },
  ]},
  { group: "Display & Headlines", fonts: [
    { value: "Oswald", label: "Oswald" },
    { value: "Bebas Neue", label: "Bebas Neue" },
    { value: "Playfair Display", label: "Playfair Display" },
    { value: "Fraunces", label: "Fraunces" },
  ]},
  { group: "Serif", fonts: [
    { value: "Merriweather", label: "Merriweather" },
    { value: "Lora", label: "Lora" },
    { value: "Georgia", label: "Georgia" },
    { value: "Times New Roman", label: "Times New Roman" },
  ]},
  { group: "Monospace", fonts: [
    { value: "Roboto Mono", label: "Roboto Mono" },
    { value: "Fira Code", label: "Fira Code" },
    { value: "JetBrains Mono", label: "JetBrains Mono" },
  ]},
];

export default function ProjectBrandKit() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMediaLibraryPicker, setShowMediaLibraryPicker] = useState(false);
  const [brandKit, setBrandKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  }) as { data: any };

  const { data: brandKits, isLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "brand-kits"],
    enabled: !!projectId,
  }) as { data: any[], isLoading: boolean };

  const existingBrandKit = brandKits?.[0];
  const isNewBrandKit = !existingBrandKit?.id;

  useEffect(() => {
    if (existingBrandKit) {
      setBrandKit({
        id: existingBrandKit.id,
        name: existingBrandKit.name || "",
        primaryColor: existingBrandKit.primaryColor || DEFAULT_BRAND_KIT.primaryColor,
        secondaryColor: existingBrandKit.secondaryColor || DEFAULT_BRAND_KIT.secondaryColor,
        accentColor: existingBrandKit.accentColor || DEFAULT_BRAND_KIT.accentColor,
        fontFamily: existingBrandKit.fontFamily || DEFAULT_BRAND_KIT.fontFamily,
        logoUrl: existingBrandKit.logoUrl,
        logoAssetId: existingBrandKit.logoAssetId,
        brandAssets: existingBrandKit.brandAssets || [],
      });
      setHasChanges(false);
    } else if (project?.name && !brandKit.name) {
      setBrandKit(prev => ({ ...prev, name: `${project.name} Brand Kit` }));
    }
  }, [existingBrandKit, project?.name]);

  const saveMutation = useMutation({
    mutationFn: async (data: BrandKit) => {
      if (isNewBrandKit) {
        const response = await apiRequest("POST", `/api/projects/${projectId}/brand-kit`, data);
        return await response.json();
      } else {
        const response = await apiRequest("PUT", `/api/projects/${projectId}/brand-kits/${existingBrandKit.id}`, data);
        return await response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "brand-kits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setHasChanges(false);
      toast({
        title: isNewBrandKit ? "Brand Kit Created" : "Brand Kit Updated",
        description: "Your brand identity has been saved successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Session Expired",
          description: "Please log in again.",
          variant: "destructive",
        });
        setTimeout(() => { window.location.href = "/"; }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save brand kit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateField = <K extends keyof BrandKit>(field: K, value: BrandKit[K]) => {
    setBrandKit(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSelectLogo = (url: string) => {
    updateField("logoUrl", url);
    updateField("logoAssetId", null);
    setShowMediaLibraryPicker(false);
  };

  const handleReset = () => {
    if (existingBrandKit) {
      setBrandKit({
        id: existingBrandKit.id,
        name: existingBrandKit.name || "",
        primaryColor: existingBrandKit.primaryColor || DEFAULT_BRAND_KIT.primaryColor,
        secondaryColor: existingBrandKit.secondaryColor || DEFAULT_BRAND_KIT.secondaryColor,
        accentColor: existingBrandKit.accentColor || DEFAULT_BRAND_KIT.accentColor,
        fontFamily: existingBrandKit.fontFamily || DEFAULT_BRAND_KIT.fontFamily,
        logoUrl: existingBrandKit.logoUrl,
        logoAssetId: existingBrandKit.logoAssetId,
        brandAssets: existingBrandKit.brandAssets || [],
      });
    } else {
      setBrandKit({ ...DEFAULT_BRAND_KIT, name: `${project?.name || 'Project'} Brand Kit` });
    }
    setHasChanges(false);
  };

  const handleSave = () => {
    saveMutation.mutate(brandKit);
  };

  const getLogoUrl = () => {
    return brandKit.logoUrl || brandKit.brandAssets?.find(a => a.type === 'logo')?.url;
  };

  if (isLoading) {
    return (
      <ProjectLayoutWithHeader>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading brand kit...</div>
        </div>
      </ProjectLayoutWithHeader>
    );
  }

  return (
    <ProjectLayoutWithHeader>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Brand Kit</h1>
          <p className="mt-1 text-sm text-gray-600">
            Define your brand's visual identity for consistent pitch decks.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column - Editor */}
          <div className="lg:col-span-3 space-y-6">
            {/* Brand Identity */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Brand Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="brand-name">Brand Kit Name</Label>
                  <Input
                    id="brand-name"
                    value={brandKit.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="My Brand Kit"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Logo</Label>
                  <div className="mt-1 flex items-center gap-3">
                    {getLogoUrl() ? (
                      <div className="h-16 w-24 border rounded bg-gray-50 flex items-center justify-center p-2">
                        <img 
                          src={getLogoUrl()} 
                          alt="Logo" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-24 border rounded bg-gray-50 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">No logo</span>
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMediaLibraryPicker(true)}
                        className="w-full"
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Choose from Media Library
                      </Button>
                      <Input
                        value={brandKit.logoUrl || ""}
                        onChange={(e) => updateField("logoUrl", e.target.value || null)}
                        placeholder="Or paste logo URL"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Colors */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Colors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm">Primary</Label>
                    <p className="text-xs text-muted-foreground mb-2">Headlines, buttons</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={brandKit.primaryColor}
                        onChange={(e) => updateField("primaryColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={brandKit.primaryColor}
                        onChange={(e) => updateField("primaryColor", e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Secondary</Label>
                    <p className="text-xs text-muted-foreground mb-2">Backgrounds</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={brandKit.secondaryColor}
                        onChange={(e) => updateField("secondaryColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={brandKit.secondaryColor}
                        onChange={(e) => updateField("secondaryColor", e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Accent</Label>
                    <p className="text-xs text-muted-foreground mb-2">CTAs, highlights</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={brandKit.accentColor}
                        onChange={(e) => updateField("accentColor", e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={brandKit.accentColor}
                        onChange={(e) => updateField("accentColor", e.target.value)}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Typography */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Typography</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label className="text-sm">Font Family</Label>
                  <select
                    value={brandKit.fontFamily}
                    onChange={(e) => updateField("fontFamily", e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {FONT_OPTIONS.map((group) => (
                      <optgroup key={group.group} label={group.group}>
                        {group.fonts.map((font) => (
                          <option key={font.value} value={font.value}>
                            {font.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div 
                    className="mt-3 p-4 border rounded-lg bg-gray-50"
                    style={{ fontFamily: brandKit.fontFamily }}
                  >
                    <p className="text-lg font-semibold">The quick brown fox jumps</p>
                    <p className="text-sm text-muted-foreground">ABCDEFGHIJKLMNOPQRSTUVWXYZ • 0123456789</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Actions */}
            <div className="flex items-center gap-3">
              <Button 
                onClick={handleSave}
                disabled={saveMutation.isPending || !brandKit.name}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : (isNewBrandKit ? "Create Brand Kit" : "Save Changes")}
              </Button>
              {hasChanges && (
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Right Column - Live Preview */}
          <div className="lg:col-span-2">
            <div className="sticky top-4">
              <Card className="overflow-hidden">
                <CardHeader className="pb-2 bg-gray-50 border-b">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Slide Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Slide mockup */}
                  <div 
                    className="aspect-[16/10] relative"
                    style={{ 
                      backgroundColor: brandKit.secondaryColor,
                      fontFamily: brandKit.fontFamily
                    }}
                  >
                    {/* Header bar */}
                    <div 
                      className="absolute top-0 left-0 right-0 h-12 flex items-center px-4 gap-3"
                      style={{ backgroundColor: brandKit.primaryColor }}
                    >
                      {getLogoUrl() ? (
                        <img 
                          src={getLogoUrl()} 
                          alt="Logo" 
                          className="h-7 w-auto object-contain bg-white/10 rounded px-1"
                        />
                      ) : (
                        <div className="h-7 w-10 bg-white/20 rounded flex items-center justify-center">
                          <span className="text-white/50 text-[8px]">LOGO</span>
                        </div>
                      )}
                      <span className="text-white text-sm font-medium truncate">
                        {brandKit.name || "Your Brand"}
                      </span>
                    </div>

                    {/* Content area */}
                    <div className="pt-16 px-6 pb-4">
                      <h2 
                        className="text-xl font-bold mb-2"
                        style={{ color: brandKit.primaryColor }}
                      >
                        Slide Title Here
                      </h2>
                      <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                        This is how your pitch deck content will look with your selected brand colors and typography.
                      </p>
                      <button
                        className="px-4 py-2 rounded text-white text-sm font-medium"
                        style={{ backgroundColor: brandKit.accentColor }}
                      >
                        Call to Action
                      </button>
                    </div>

                    {/* Color legend */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1">
                      <div 
                        className="w-4 h-4 rounded-full border border-white/30"
                        style={{ backgroundColor: brandKit.primaryColor }}
                        title="Primary"
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: brandKit.secondaryColor }}
                        title="Secondary"
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-white/30"
                        style={{ backgroundColor: brandKit.accentColor }}
                        title="Accent"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick color reference */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="text-center">
                  <div 
                    className="h-8 rounded border mb-1"
                    style={{ backgroundColor: brandKit.primaryColor }}
                  />
                  <span className="text-xs text-muted-foreground">Primary</span>
                </div>
                <div className="text-center">
                  <div 
                    className="h-8 rounded border mb-1"
                    style={{ backgroundColor: brandKit.secondaryColor }}
                  />
                  <span className="text-xs text-muted-foreground">Secondary</span>
                </div>
                <div className="text-center">
                  <div 
                    className="h-8 rounded border mb-1"
                    style={{ backgroundColor: brandKit.accentColor }}
                  />
                  <span className="text-xs text-muted-foreground">Accent</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showMediaLibraryPicker && (
          <MediaLibraryPicker
            projectId={projectId!}
            open={showMediaLibraryPicker}
            onClose={() => setShowMediaLibraryPicker(false)}
            onSelect={handleSelectLogo}
            currentValue={brandKit.logoUrl || undefined}
          />
        )}
      </div>
    </ProjectLayoutWithHeader>
  );
}
