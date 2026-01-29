import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Palette, Upload, Image, CheckCircle } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { MediaLibraryPicker } from "@/components/MediaLibrary/MediaLibraryPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ProjectLayoutWithHeader from "@/components/ProjectLayoutWithHeader";

interface BrandKit {
  id: string;
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

export default function ProjectBrandKit() {
  const { projectId } = useParams<{ projectId: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customizing, setCustomizing] = useState(false);
  const [editingBrandKit, setEditingBrandKit] = useState<Partial<BrandKit> | null>(null);
  const [showMediaLibraryPicker, setShowMediaLibraryPicker] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  }) as { data: any, isLoading: boolean };

  const { data: brandKits, isLoading: brandKitsLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "brand-kits"],
    enabled: !!projectId,
  }) as { data: any[], isLoading: boolean };

  const [generatedSuggestions, setGeneratedSuggestions] = useState<any>(null);

  const generateBrandKitMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/brand-kit`, data);
      return await response.json();
    },
    onSuccess: (response: any) => {
      console.log('Brand kit generation response:', response);
      console.log('Suggestions:', response.suggestions);
      console.log('Logo analysis:', response.suggestions?.logoAnalysis);
      setGeneratedSuggestions(response.suggestions);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "brand-kits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Brand Kit Generated",
        description: response.suggestions?.reasoning || "Your brand kit has been created successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to generate brand kit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createBrandKitMutation = useMutation({
    mutationFn: async (data: Partial<BrandKit>) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/brand-kit`, data);
      return await response.json();
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "brand-kits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setCustomizing(false);
      setEditingBrandKit(null);
      toast({
        title: "Brand Kit Created",
        description: "Your brand kit has been created successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create brand kit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateBrandKitMutation = useMutation({
    mutationFn: async (data: Partial<BrandKit>) => {
      const brandKitId = activeBrandKit?.id;
      const response = await apiRequest("PUT", `/api/projects/${projectId}/brand-kits/${brandKitId}`, data);
      return await response.json();
    },
    onSuccess: (response: any) => {
      console.log('Brand kit update response:', response);
      console.log('Response logoUrl:', response.logoUrl);
      console.log('Response brandAssets:', response.brandAssets);
      
      // Force refetch to ensure we get the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "brand-kits"] });
      queryClient.refetchQueries({ queryKey: ["/api/projects", projectId, "brand-kits"] });
      
      setCustomizing(false);
      setEditingBrandKit(null);
      toast({
        title: "Brand Kit Updated",
        description: "Your changes have been saved successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update brand kit. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateBrandKit = () => {
    generateBrandKitMutation.mutate({
      name: `${project?.name} Brand Kit`,
    });
  };

  const handleEditBrandKit = () => {
    if (activeBrandKit) {
      setEditingBrandKit({
        primaryColor: activeBrandKit.primaryColor,
        secondaryColor: activeBrandKit.secondaryColor,
        accentColor: activeBrandKit.accentColor,
        fontFamily: activeBrandKit.fontFamily,
        logoUrl: activeBrandKit.logoUrl,
        logoAssetId: activeBrandKit.logoAssetId,
        brandAssets: activeBrandKit.brandAssets || [],
        name: activeBrandKit.name,
      });
      setCustomizing(true);
    }
  };

  const handleSaveBrandKit = () => {
    if (editingBrandKit) {
      // Ensure logoUrl and logoAssetId are properly handled
      const brandKitData: any = {
        ...editingBrandKit,
        logoUrl: editingBrandKit.logoUrl === undefined ? null : editingBrandKit.logoUrl,
        logoAssetId: editingBrandKit.logoAssetId === undefined ? null : editingBrandKit.logoAssetId
      };
      
      console.log('Saving brand kit with data:', brandKitData);
      console.log('logoUrl being sent:', brandKitData.logoUrl);
      console.log('logoAssetId being sent:', brandKitData.logoAssetId);
      console.log('brandAssets being sent:', brandKitData.brandAssets);
      
      // If no brand kit exists, create a new one; otherwise update existing
      if (!hasBrandKit) {
        createBrandKitMutation.mutate(brandKitData);
      } else {
        updateBrandKitMutation.mutate(brandKitData);
      }
    }
  };

  const handleSelectLogoFromMediaLibrary = async (url: string) => {
    // Find the asset ID from the media library
    try {
      const response = await apiRequest("GET", `/api/projects/${projectId}/media`);
      // API returns { assets: [...], quota: {...} }
      const mediaData = response as { assets?: any[]; quota?: any };
      const assets = mediaData?.assets || [];
      const asset = assets.find((a: any) => a.storageUrl === url);
      
      if (asset) {
        setEditingBrandKit(prev => prev ? {
          ...prev,
          logoAssetId: asset.id,
          logoUrl: asset.storageUrl
        } : null);
        toast({
          title: "Logo Selected",
          description: "Logo selected from media library",
        });
        setShowMediaLibraryPicker(false);
      } else {
        // Fallback to URL if asset not found
        setEditingBrandKit(prev => prev ? {
          ...prev,
          logoUrl: url,
          logoAssetId: null
        } : null);
        toast({
          title: "Logo Selected",
          description: "Logo URL set (not found in media library)",
        });
        setShowMediaLibraryPicker(false);
      }
    } catch (error) {
      console.error('Error selecting logo from media library:', error);
      // Fallback to URL if lookup fails
      setEditingBrandKit(prev => prev ? {
        ...prev,
        logoUrl: url,
        logoAssetId: null
      } : null);
      toast({
        title: "Logo Selected",
        description: "Logo URL set (media library lookup failed)",
        variant: "default",
      });
      setShowMediaLibraryPicker(false);
    }
  };

  const handleCancelEdit = () => {
    setCustomizing(false);
    setEditingBrandKit(null);
  };

  if (projectLoading || !project) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  const activeBrandKit = brandKits?.[0] as BrandKit | undefined;
  const hasBrandKit = !!activeBrandKit;
  
  // Debug logging
  console.log('Active brand kit:', activeBrandKit);
  console.log('brandAssets in active brand kit:', activeBrandKit?.brandAssets);
  console.log('logoUrl in active brand kit:', activeBrandKit?.logoUrl);
  console.log('logoUrl type:', typeof activeBrandKit?.logoUrl);
  console.log('logoUrl truthy check:', !!activeBrandKit?.logoUrl);

  return (
    <ProjectLayoutWithHeader>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Brand Kit</h1>
            <p className="mt-1 text-sm text-gray-600">Create and customize your brand identity for consistent presentation materials.</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
          {!hasBrandKit && !customizing ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Create Your Brand Kit
                </CardTitle>
                <CardDescription>
                  Define your brand's visual identity with custom colors, fonts, and logo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Palette className="h-8 w-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Choose Your Brand Colors</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
                    Select colors that represent your brand identity. You'll be able to pick your primary, secondary, and accent colors.
                  </p>
                  <Button 
                    onClick={() => {
                      setEditingBrandKit({
                        name: `${project?.name || 'Project'} Brand Kit`,
                        primaryColor: "#000000",
                        secondaryColor: "#F8FAFC",
                        accentColor: "#64748B",
                        fontFamily: "Inter"
                      });
                      setCustomizing(true);
                    }}
                    size="lg"
                    className="px-8"
                  >
                    <Palette className="h-4 w-4 mr-2" />
                    Start Customizing
                  </Button>
                </div>
                
                <div className="border-t pt-6">
                  <h4 className="text-sm font-medium mb-4 text-center text-muted-foreground">What you'll customize:</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 rounded-lg bg-gray-50">
                      <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-black"></div>
                      <p className="text-xs font-medium">Primary Color</p>
                      <p className="text-xs text-muted-foreground">Headlines & buttons</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gray-50">
                      <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-slate-100 border"></div>
                      <p className="text-xs font-medium">Secondary Color</p>
                      <p className="text-xs text-muted-foreground">Backgrounds</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-gray-50">
                      <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-slate-500"></div>
                      <p className="text-xs font-medium">Accent Color</p>
                      <p className="text-xs text-muted-foreground">Highlights & CTAs</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : !hasBrandKit && customizing ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Create Brand Kit
                </CardTitle>
                <CardDescription>
                  Customize your brand kit colors, fonts, and logos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="brand-name-new">Brand Kit Name</Label>
                    <Input
                      id="brand-name-new"
                      value={editingBrandKit?.name || ""}
                      onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, name: e.target.value} : null)}
                      placeholder="Enter brand kit name"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="primary-color-new">Primary Color</Label>
                      <p className="text-xs text-muted-foreground mb-2">Your main brand color (headings, buttons)</p>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="primary-color-new"
                          type="color"
                          value={editingBrandKit?.primaryColor || "#000000"}
                          onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, primaryColor: e.target.value} : null)}
                          className="w-12 h-10 p-1 border rounded cursor-pointer"
                        />
                        <Input
                          value={editingBrandKit?.primaryColor || "#000000"}
                          onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, primaryColor: e.target.value} : null)}
                          placeholder="#000000"
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="secondary-color-new">Secondary Color</Label>
                      <p className="text-xs text-muted-foreground mb-2">Background and accent areas</p>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="secondary-color-new"
                          type="color"
                          value={editingBrandKit?.secondaryColor || "#F8FAFC"}
                          onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, secondaryColor: e.target.value} : null)}
                          className="w-12 h-10 p-1 border rounded cursor-pointer"
                        />
                        <Input
                          value={editingBrandKit?.secondaryColor || "#F8FAFC"}
                          onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, secondaryColor: e.target.value} : null)}
                          placeholder="#F8FAFC"
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="accent-color-new">Accent Color</Label>
                      <p className="text-xs text-muted-foreground mb-2">Highlights and call-to-actions</p>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="accent-color-new"
                          type="color"
                          value={editingBrandKit?.accentColor || "#64748B"}
                          onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, accentColor: e.target.value} : null)}
                          className="w-12 h-10 p-1 border rounded cursor-pointer"
                        />
                        <Input
                          value={editingBrandKit?.accentColor || "#64748B"}
                          onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, accentColor: e.target.value} : null)}
                          placeholder="#64748B"
                          className="flex-1 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Color Preview Section */}
                  <div className="border rounded-lg p-4 bg-white">
                    <Label className="text-sm font-medium mb-3 block">Color Preview</Label>
                    <div 
                      className="rounded-lg overflow-hidden border"
                      style={{ backgroundColor: editingBrandKit?.secondaryColor || "#F8FAFC" }}
                    >
                      <div 
                        className="p-4"
                        style={{ backgroundColor: editingBrandKit?.primaryColor || "#000000" }}
                      >
                        <h3 className="text-white font-semibold text-lg">Your Brand Headline</h3>
                        <p className="text-white/80 text-sm">Primary color as header background</p>
                      </div>
                      <div className="p-4">
                        <p className="text-gray-700 mb-3">This is how your content will look with your chosen colors.</p>
                        <button
                          className="px-4 py-2 rounded-md text-white font-medium"
                          style={{ backgroundColor: editingBrandKit?.accentColor || "#64748B" }}
                        >
                          Accent Button
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="font-family-new">Font Family</Label>
                    <select
                      id="font-family-new"
                      value={editingBrandKit?.fontFamily || "Inter"}
                      onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, fontFamily: e.target.value} : null)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <optgroup label="Popular Sans-Serif">
                        <option value="Inter">Inter - Modern & Clean</option>
                        <option value="Roboto">Roboto - Professional & Readable</option>
                        <option value="Open Sans">Open Sans - Friendly & Accessible</option>
                        <option value="Lato">Lato - Warm & Professional</option>
                        <option value="Poppins">Poppins - Modern & Geometric</option>
                        <option value="Montserrat">Montserrat - Elegant & Contemporary</option>
                        <option value="Source Sans 3">Source Sans 3 - Clean & Versatile</option>
                        <option value="Nunito">Nunito - Rounded & Friendly</option>
                        <option value="Work Sans">Work Sans - Modern & Geometric</option>
                        <option value="Raleway">Raleway - Elegant & Lightweight</option>
                        <option value="Ubuntu">Ubuntu - Modern & Humanist</option>
                        <option value="Rubik">Rubik - Modern & Rounded</option>
                        <option value="Outfit">Outfit - Sleek & Contemporary</option>
                        <option value="DM Sans">DM Sans - Minimal & Clean</option>
                        <option value="Manrope">Manrope - Modern & Technical</option>
                        <option value="Plus Jakarta Sans">Plus Jakarta Sans - Fresh & Modern</option>
                        <option value="Space Grotesk">Space Grotesk - Bold & Geometric</option>
                        <option value="Lexend">Lexend - Clear & Readable</option>
                        <option value="Sora">Sora - Minimal & Contemporary</option>
                        <option value="Figtree">Figtree - Friendly & Approachable</option>
                      </optgroup>
                      <optgroup label="Modern Sans-Serif">
                        <option value="Archivo">Archivo - Bold & Technical</option>
                        <option value="Barlow">Barlow - Rounded Industrial</option>
                        <option value="Exo 2">Exo 2 - Futuristic & Geometric</option>
                        <option value="Quicksand">Quicksand - Light & Rounded</option>
                        <option value="Mulish">Mulish - Clean & Minimal</option>
                        <option value="Cabin">Cabin - Humanist & Modern</option>
                        <option value="Karla">Karla - Grotesque & Readable</option>
                        <option value="Fira Sans">Fira Sans - Modern & Technical</option>
                        <option value="Noto Sans">Noto Sans - Universal & Clean</option>
                        <option value="IBM Plex Sans">IBM Plex Sans - Corporate & Professional</option>
                        <option value="Red Hat Display">Red Hat Display - Bold & Distinct</option>
                        <option value="Public Sans">Public Sans - Clear & Accessible</option>
                        <option value="Albert Sans">Albert Sans - Clean & Versatile</option>
                        <option value="Be Vietnam Pro">Be Vietnam Pro - Modern & Sharp</option>
                        <option value="Jost">Jost - Elegant & Geometric</option>
                        <option value="Titillium Web">Titillium Web - Techy & Modern</option>
                        <option value="Josefin Sans">Josefin Sans - Elegant & Light</option>
                        <option value="Libre Franklin">Libre Franklin - Classic & Professional</option>
                        <option value="Sarabun">Sarabun - Clean & International</option>
                        <option value="Overpass">Overpass - Open & Friendly</option>
                      </optgroup>
                      <optgroup label="Display & Headlines">
                        <option value="Oswald">Oswald - Narrow & Bold</option>
                        <option value="Bebas Neue">Bebas Neue - All-Caps Impact</option>
                        <option value="Anton">Anton - Bold & Impactful</option>
                        <option value="Staatliches">Staatliches - Condensed & Modern</option>
                        <option value="Teko">Teko - Condensed & Sporty</option>
                        <option value="Fjalla One">Fjalla One - Bold & Nordic</option>
                        <option value="Righteous">Righteous - Retro & Fun</option>
                        <option value="Russo One">Russo One - Bold & Industrial</option>
                        <option value="Passion One">Passion One - Bold & Dynamic</option>
                        <option value="Alfa Slab One">Alfa Slab One - Bold Slab Serif</option>
                        <option value="Bungee">Bungee - Colorful & Bold</option>
                        <option value="Monoton">Monoton - Retro Display</option>
                      </optgroup>
                      <optgroup label="Elegant Serif">
                        <option value="Playfair Display">Playfair Display - Elegant & High Contrast</option>
                        <option value="Merriweather">Merriweather - Readable & Classic</option>
                        <option value="Lora">Lora - Calligraphic & Warm</option>
                        <option value="PT Serif">PT Serif - Clean & Humanist</option>
                        <option value="Libre Baskerville">Libre Baskerville - Classic & Readable</option>
                        <option value="Cormorant Garamond">Cormorant Garamond - Elegant & Refined</option>
                        <option value="Crimson Text">Crimson Text - Old-Style & Beautiful</option>
                        <option value="Bitter">Bitter - Slab Serif & Modern</option>
                        <option value="Zilla Slab">Zilla Slab - Bold & Contemporary</option>
                        <option value="Spectral">Spectral - Screen Optimized Serif</option>
                        <option value="EB Garamond">EB Garamond - Classic Revival</option>
                        <option value="Vollkorn">Vollkorn - German Text Serif</option>
                        <option value="Cardo">Cardo - Scholarly & Classic</option>
                        <option value="Frank Ruhl Libre">Frank Ruhl Libre - Modern Hebrew Serif</option>
                        <option value="Fraunces">Fraunces - Quirky & Soft Serif</option>
                        <option value="DM Serif Display">DM Serif Display - High-Contrast Display</option>
                        <option value="Bodoni Moda">Bodoni Moda - Classic & Fashionable</option>
                      </optgroup>
                      <optgroup label="Script & Handwritten">
                        <option value="Dancing Script">Dancing Script - Casual Script</option>
                        <option value="Pacifico">Pacifico - Retro Script</option>
                        <option value="Great Vibes">Great Vibes - Elegant Script</option>
                        <option value="Lobster">Lobster - Bold Script</option>
                        <option value="Satisfy">Satisfy - Casual Script</option>
                        <option value="Sacramento">Sacramento - Thin Script</option>
                        <option value="Caveat">Caveat - Handwritten & Casual</option>
                        <option value="Kalam">Kalam - Handwritten & Warm</option>
                        <option value="Patrick Hand">Patrick Hand - Hand-Drawn</option>
                        <option value="Indie Flower">Indie Flower - Casual Handwriting</option>
                        <option value="Shadows Into Light">Shadows Into Light - Light Script</option>
                        <option value="Permanent Marker">Permanent Marker - Marker Style</option>
                        <option value="Rock Salt">Rock Salt - Grungy Handwritten</option>
                        <option value="Amatic SC">Amatic SC - Thin & Playful</option>
                      </optgroup>
                      <optgroup label="Monospace & Technical">
                        <option value="Roboto Mono">Roboto Mono - Clean Monospace</option>
                        <option value="Fira Code">Fira Code - Coding Ligatures</option>
                        <option value="Source Code Pro">Source Code Pro - Adobe Monospace</option>
                        <option value="JetBrains Mono">JetBrains Mono - Developer Font</option>
                        <option value="Space Mono">Space Mono - Geometric Monospace</option>
                        <option value="IBM Plex Mono">IBM Plex Mono - Corporate Monospace</option>
                        <option value="Inconsolata">Inconsolata - Readable Monospace</option>
                        <option value="Ubuntu Mono">Ubuntu Mono - Linux Terminal</option>
                      </optgroup>
                      <optgroup label="System Fonts">
                        <option value="Georgia">Georgia - Classic Serif</option>
                        <option value="Times New Roman">Times New Roman - Traditional Serif</option>
                        <option value="Arial">Arial - Universal Sans-Serif</option>
                        <option value="Verdana">Verdana - Web Safe Sans-Serif</option>
                        <option value="Trebuchet MS">Trebuchet MS - Humanist Sans-Serif</option>
                      </optgroup>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="logo-url-new">Logo (Optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        id="logo-url-new"
                        value={editingBrandKit?.logoUrl || ""}
                        onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, logoUrl: e.target.value || null, logoAssetId: null} : null)}
                        placeholder="Enter logo image URL"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowMediaLibraryPicker(true)}
                        className="flex items-center gap-2"
                      >
                        <Image className="h-4 w-4" />
                        Choose from Media Library
                      </Button>
                    </div>
                    {showMediaLibraryPicker && (
                      <MediaLibraryPicker
                        projectId={projectId!}
                        open={showMediaLibraryPicker}
                        onClose={() => setShowMediaLibraryPicker(false)}
                        onSelect={handleSelectLogoFromMediaLibrary}
                        currentValue={editingBrandKit?.logoUrl}
                      />
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSaveBrandKit}
                    disabled={createBrandKitMutation.isPending}
                    className="flex-1"
                  >
                    {createBrandKitMutation.isPending ? "Creating..." : "Create Brand Kit"}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={createBrandKitMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Brand Kit Ready
                </CardTitle>
                <CardDescription>
                  Your brand kit has been generated and is ready to use
                  {generatedSuggestions?.extractedElements && " • Based on your website design"}
                </CardDescription>
                {generatedSuggestions?.reasoning && (
                  <div className="mt-2 p-3 bg-green-50 rounded text-sm text-green-800">
                    <strong>AI Analysis:</strong> {generatedSuggestions.reasoning}
                  </div>
                )}
                {generatedSuggestions?.logoAnalysis && (
                  <div className="mt-2 p-3 bg-blue-50 rounded text-sm text-blue-800">
                    <strong>Logo Analysis:</strong>
                    <div className="mt-2 space-y-2">
                      {generatedSuggestions.logoAnalysis.recommendations.map((rec: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>{rec}</span>
                        </div>
                      ))}
                      {generatedSuggestions.logoAnalysis.logos.length > 0 && (
                        <div className="mt-3">
                          <p className="font-medium mb-2">Extracted Logos:</p>
                          <div className="flex gap-2">
                            {generatedSuggestions.logoAnalysis.logos.slice(0, 3).map((logoUrl: string, idx: number) => (
                              <div key={idx} className="w-12 h-12 border rounded overflow-hidden bg-white">
                                <img 
                                  src={logoUrl} 
                                  alt={`Extracted Logo ${idx + 1}`}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Primary</Label>
                    <div 
                      className="h-12 rounded border"
                      style={{ backgroundColor: activeBrandKit.primaryColor }}
                    ></div>
                    <p className="text-sm text-muted-foreground">{activeBrandKit.primaryColor}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary</Label>
                    <div 
                      className="h-12 rounded border"
                      style={{ backgroundColor: activeBrandKit.secondaryColor }}
                    ></div>
                    <p className="text-sm text-muted-foreground">{activeBrandKit.secondaryColor}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Accent</Label>
                    <div 
                      className="h-12 rounded border"
                      style={{ backgroundColor: activeBrandKit.accentColor }}
                    ></div>
                    <p className="text-sm text-muted-foreground">{activeBrandKit.accentColor}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Typography</Label>
                  <div className="p-4 border rounded">
                    <h3 className="font-semibold text-xl" style={{ fontFamily: activeBrandKit.fontFamily }}>
                      {activeBrandKit.fontFamily}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Professional typography for your brand
                    </p>
                  </div>
                </div>

                {(activeBrandKit.logoUrl || (activeBrandKit.brandAssets && activeBrandKit.brandAssets.length > 0)) && (
                  <div className="space-y-2">
                    <Label>Logos</Label>
                    <div className="space-y-3">
                      {/* Show main logo if exists */}
                      {activeBrandKit.logoUrl && activeBrandKit.logoUrl !== null && activeBrandKit.logoUrl !== undefined && (
                        <div className="p-4 border-2 border-gray-200 rounded flex items-center justify-center" style={{
                          backgroundImage: `
                            linear-gradient(45deg, #f3f4f6 25%, transparent 25%),
                            linear-gradient(-45deg, #f3f4f6 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #f3f4f6 75%),
                            linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)
                          `,
                          backgroundSize: '20px 20px',
                          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                        }}>
                          <img 
                            src={activeBrandKit.logoUrl} 
                            alt="Main Brand Logo"
                            className="max-h-16 max-w-48 object-contain"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Show additional brand assets */}
                      {activeBrandKit.brandAssets && activeBrandKit.brandAssets.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {activeBrandKit.brandAssets.map((asset, index) => (
                            <div key={index} className="relative p-3 border-2 border-gray-200 rounded flex items-center justify-center shadow-sm" style={{
                              backgroundImage: `
                                linear-gradient(45deg, #f3f4f6 25%, transparent 25%),
                                linear-gradient(-45deg, #f3f4f6 25%, transparent 25%),
                                linear-gradient(45deg, transparent 75%, #f3f4f6 75%),
                                linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)
                              `,
                              backgroundSize: '20px 20px',
                              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                            }}>
                              <img 
                                src={asset.url} 
                                alt={asset.name || `Brand Asset ${index + 1}`}
                                className="max-h-16 max-w-32 object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {!customizing ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleEditBrandKit}
                      className="flex-1"
                    >
                      Edit Brand Kit
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="brand-name">Brand Kit Name</Label>
                        <Input
                          id="brand-name"
                          value={editingBrandKit?.name || ""}
                          onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, name: e.target.value} : null)}
                          placeholder="Enter brand kit name"
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="primary-color">Primary Color</Label>
                          <p className="text-xs text-muted-foreground mb-2">Your main brand color</p>
                          <div className="flex gap-2 items-center">
                            <Input
                              id="primary-color"
                              type="color"
                              value={editingBrandKit?.primaryColor || "#000000"}
                              onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, primaryColor: e.target.value} : null)}
                              className="w-12 h-10 p-1 border rounded cursor-pointer"
                            />
                            <Input
                              value={editingBrandKit?.primaryColor || ""}
                              onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, primaryColor: e.target.value} : null)}
                              placeholder="#000000"
                              className="flex-1 font-mono text-sm"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="secondary-color">Secondary Color</Label>
                          <p className="text-xs text-muted-foreground mb-2">Background color</p>
                          <div className="flex gap-2 items-center">
                            <Input
                              id="secondary-color"
                              type="color"
                              value={editingBrandKit?.secondaryColor || "#F8FAFC"}
                              onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, secondaryColor: e.target.value} : null)}
                              className="w-12 h-10 p-1 border rounded cursor-pointer"
                            />
                            <Input
                              value={editingBrandKit?.secondaryColor || ""}
                              onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, secondaryColor: e.target.value} : null)}
                              placeholder="#F8FAFC"
                              className="flex-1 font-mono text-sm"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="accent-color">Accent Color</Label>
                          <p className="text-xs text-muted-foreground mb-2">Highlights & CTAs</p>
                          <div className="flex gap-2 items-center">
                            <Input
                              id="accent-color"
                              type="color"
                              value={editingBrandKit?.accentColor || "#64748B"}
                              onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, accentColor: e.target.value} : null)}
                              className="w-12 h-10 p-1 border rounded cursor-pointer"
                            />
                            <Input
                              value={editingBrandKit?.accentColor || ""}
                              onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, accentColor: e.target.value} : null)}
                              placeholder="#64748B"
                              className="flex-1 font-mono text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      
                      {/* Color Preview Section */}
                      <div className="border rounded-lg p-4 bg-white">
                        <Label className="text-sm font-medium mb-3 block">Color Preview</Label>
                        <div 
                          className="rounded-lg overflow-hidden border"
                          style={{ backgroundColor: editingBrandKit?.secondaryColor || "#F8FAFC" }}
                        >
                          <div 
                            className="p-4"
                            style={{ backgroundColor: editingBrandKit?.primaryColor || "#000000" }}
                          >
                            <h3 className="text-white font-semibold text-lg">Your Brand Headline</h3>
                            <p className="text-white/80 text-sm">Primary color as header</p>
                          </div>
                          <div className="p-4">
                            <p className="text-gray-700 mb-3">Preview of your chosen colors.</p>
                            <button
                              className="px-4 py-2 rounded-md text-white font-medium"
                              style={{ backgroundColor: editingBrandKit?.accentColor || "#64748B" }}
                            >
                              Accent Button
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="font-family">Font Family</Label>
                        <select
                          id="font-family"
                          value={editingBrandKit?.fontFamily || ""}
                          onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, fontFamily: e.target.value} : null)}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">Select a font family</option>
                          <optgroup label="Popular Sans-Serif">
                            <option value="Inter">Inter - Modern & Clean</option>
                            <option value="Roboto">Roboto - Professional & Readable</option>
                            <option value="Open Sans">Open Sans - Friendly & Accessible</option>
                            <option value="Lato">Lato - Warm & Professional</option>
                            <option value="Poppins">Poppins - Modern & Geometric</option>
                            <option value="Montserrat">Montserrat - Elegant & Contemporary</option>
                            <option value="Source Sans 3">Source Sans 3 - Clean & Versatile</option>
                            <option value="Nunito">Nunito - Rounded & Friendly</option>
                            <option value="Work Sans">Work Sans - Modern & Geometric</option>
                            <option value="Raleway">Raleway - Elegant & Lightweight</option>
                            <option value="Ubuntu">Ubuntu - Modern & Humanist</option>
                            <option value="Rubik">Rubik - Modern & Rounded</option>
                            <option value="Outfit">Outfit - Sleek & Contemporary</option>
                            <option value="DM Sans">DM Sans - Minimal & Clean</option>
                            <option value="Manrope">Manrope - Modern & Technical</option>
                            <option value="Plus Jakarta Sans">Plus Jakarta Sans - Fresh & Modern</option>
                            <option value="Space Grotesk">Space Grotesk - Bold & Geometric</option>
                            <option value="Lexend">Lexend - Clear & Readable</option>
                            <option value="Sora">Sora - Minimal & Contemporary</option>
                            <option value="Figtree">Figtree - Friendly & Approachable</option>
                          </optgroup>
                          <optgroup label="Modern Sans-Serif">
                            <option value="Archivo">Archivo - Bold & Technical</option>
                            <option value="Barlow">Barlow - Rounded Industrial</option>
                            <option value="Exo 2">Exo 2 - Futuristic & Geometric</option>
                            <option value="Quicksand">Quicksand - Light & Rounded</option>
                            <option value="Mulish">Mulish - Clean & Minimal</option>
                            <option value="Cabin">Cabin - Humanist & Modern</option>
                            <option value="Karla">Karla - Grotesque & Readable</option>
                            <option value="Fira Sans">Fira Sans - Modern & Technical</option>
                            <option value="Noto Sans">Noto Sans - Universal & Clean</option>
                            <option value="IBM Plex Sans">IBM Plex Sans - Corporate & Professional</option>
                            <option value="Red Hat Display">Red Hat Display - Bold & Distinct</option>
                            <option value="Public Sans">Public Sans - Clear & Accessible</option>
                            <option value="Albert Sans">Albert Sans - Clean & Versatile</option>
                            <option value="Be Vietnam Pro">Be Vietnam Pro - Modern & Sharp</option>
                            <option value="Jost">Jost - Elegant & Geometric</option>
                            <option value="Titillium Web">Titillium Web - Techy & Modern</option>
                            <option value="Josefin Sans">Josefin Sans - Elegant & Light</option>
                            <option value="Libre Franklin">Libre Franklin - Classic & Professional</option>
                            <option value="Sarabun">Sarabun - Clean & International</option>
                            <option value="Overpass">Overpass - Open & Friendly</option>
                          </optgroup>
                          <optgroup label="Display & Headlines">
                            <option value="Oswald">Oswald - Narrow & Bold</option>
                            <option value="Bebas Neue">Bebas Neue - All-Caps Impact</option>
                            <option value="Anton">Anton - Bold & Impactful</option>
                            <option value="Staatliches">Staatliches - Condensed & Modern</option>
                            <option value="Teko">Teko - Condensed & Sporty</option>
                            <option value="Fjalla One">Fjalla One - Bold & Nordic</option>
                            <option value="Righteous">Righteous - Retro & Fun</option>
                            <option value="Russo One">Russo One - Bold & Industrial</option>
                            <option value="Passion One">Passion One - Bold & Dynamic</option>
                            <option value="Alfa Slab One">Alfa Slab One - Bold Slab Serif</option>
                            <option value="Bungee">Bungee - Colorful & Bold</option>
                            <option value="Monoton">Monoton - Retro Display</option>
                          </optgroup>
                          <optgroup label="Elegant Serif">
                            <option value="Playfair Display">Playfair Display - Elegant & High Contrast</option>
                            <option value="Merriweather">Merriweather - Readable & Classic</option>
                            <option value="Lora">Lora - Calligraphic & Warm</option>
                            <option value="PT Serif">PT Serif - Clean & Humanist</option>
                            <option value="Libre Baskerville">Libre Baskerville - Classic & Readable</option>
                            <option value="Cormorant Garamond">Cormorant Garamond - Elegant & Refined</option>
                            <option value="Crimson Text">Crimson Text - Old-Style & Beautiful</option>
                            <option value="Bitter">Bitter - Slab Serif & Modern</option>
                            <option value="Zilla Slab">Zilla Slab - Bold & Contemporary</option>
                            <option value="Spectral">Spectral - Screen Optimized Serif</option>
                            <option value="EB Garamond">EB Garamond - Classic Revival</option>
                            <option value="Vollkorn">Vollkorn - German Text Serif</option>
                            <option value="Cardo">Cardo - Scholarly & Classic</option>
                            <option value="Frank Ruhl Libre">Frank Ruhl Libre - Modern Hebrew Serif</option>
                            <option value="Fraunces">Fraunces - Quirky & Soft Serif</option>
                            <option value="DM Serif Display">DM Serif Display - High-Contrast Display</option>
                            <option value="Bodoni Moda">Bodoni Moda - Classic & Fashionable</option>
                          </optgroup>
                          <optgroup label="Script & Handwritten">
                            <option value="Dancing Script">Dancing Script - Casual Script</option>
                            <option value="Pacifico">Pacifico - Retro Script</option>
                            <option value="Great Vibes">Great Vibes - Elegant Script</option>
                            <option value="Lobster">Lobster - Bold Script</option>
                            <option value="Satisfy">Satisfy - Casual Script</option>
                            <option value="Sacramento">Sacramento - Thin Script</option>
                            <option value="Caveat">Caveat - Handwritten & Casual</option>
                            <option value="Kalam">Kalam - Handwritten & Warm</option>
                            <option value="Patrick Hand">Patrick Hand - Hand-Drawn</option>
                            <option value="Indie Flower">Indie Flower - Casual Handwriting</option>
                            <option value="Shadows Into Light">Shadows Into Light - Light Script</option>
                            <option value="Permanent Marker">Permanent Marker - Marker Style</option>
                            <option value="Rock Salt">Rock Salt - Grungy Handwritten</option>
                            <option value="Amatic SC">Amatic SC - Thin & Playful</option>
                          </optgroup>
                          <optgroup label="Monospace & Technical">
                            <option value="Roboto Mono">Roboto Mono - Clean Monospace</option>
                            <option value="Fira Code">Fira Code - Coding Ligatures</option>
                            <option value="Source Code Pro">Source Code Pro - Adobe Monospace</option>
                            <option value="JetBrains Mono">JetBrains Mono - Developer Font</option>
                            <option value="Space Mono">Space Mono - Geometric Monospace</option>
                            <option value="IBM Plex Mono">IBM Plex Mono - Corporate Monospace</option>
                            <option value="Inconsolata">Inconsolata - Readable Monospace</option>
                            <option value="Ubuntu Mono">Ubuntu Mono - Linux Terminal</option>
                          </optgroup>
                          <optgroup label="System Fonts">
                            <option value="Georgia">Georgia - Classic Serif</option>
                            <option value="Times New Roman">Times New Roman - Traditional Serif</option>
                            <option value="Arial">Arial - Universal Sans-Serif</option>
                            <option value="Verdana">Verdana - Web Safe Sans-Serif</option>
                            <option value="Trebuchet MS">Trebuchet MS - Humanist Sans-Serif</option>
                          </optgroup>
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="main-logo-url">Main Logo (Optional)</Label>
                        <div className="flex gap-2 mb-3">
                          <Input
                            id="main-logo-url"
                            value={editingBrandKit?.logoUrl || ""}
                            onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, logoUrl: e.target.value || null, logoAssetId: null} : null)}
                            placeholder="Enter logo image URL"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowMediaLibraryPicker(true)}
                            className="flex items-center gap-2"
                          >
                            <Image className="h-4 w-4" />
                            Choose from Media Library
                          </Button>
                        </div>
                        {showMediaLibraryPicker && (
                          <MediaLibraryPicker
                            projectId={projectId!}
                            open={showMediaLibraryPicker}
                            onClose={() => setShowMediaLibraryPicker(false)}
                            onSelect={handleSelectLogoFromMediaLibrary}
                            currentValue={editingBrandKit?.logoUrl}
                          />
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="logo-url">Additional Logos</Label>
                        <div className="space-y-3">
                          <Input
                            id="logo-url"
                            value=""
                            onChange={(e) => {
                              if (e.target.value.trim()) {
                                const newLogoUrl = e.target.value.trim();
                                setEditingBrandKit(prev => prev ? {
                                  ...prev, 
                                  brandAssets: [...(prev.brandAssets || []), {
                                    type: 'logo',
                                    url: newLogoUrl,
                                    name: `Logo ${(prev.brandAssets?.length || 0) + 1}`
                                  }]
                                } : null);
                                e.target.value = '';
                              }
                            }}
                            placeholder="Enter logo image URL and press Enter"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const target = e.target as HTMLInputElement;
                                if (target.value.trim()) {
                                  const newLogoUrl = target.value.trim();
                                  setEditingBrandKit(prev => prev ? {
                                    ...prev, 
                                    brandAssets: [...(prev.brandAssets || []), {
                                      type: 'logo',
                                      url: newLogoUrl,
                                      name: `Logo ${(prev.brandAssets?.length || 0) + 1}`
                                    }]
                                  } : null);
                                  target.value = '';
                                }
                              }
                            }}
                          />
                          <div className="flex gap-2">
                            <ObjectUploader
                              maxNumberOfFiles={5}
                              maxFileSize={10485760} // 10MB for SVG files
                              onGetUploadParameters={async () => {
                                const response = await fetch('/api/objects/upload', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' }
                                });
                                const data = await response.json();
                                return {
                                  method: 'PUT' as const,
                                  url: data.uploadURL,
                                };
                              }}
                              onComplete={async (result) => {
                                if (result.successful && result.successful.length > 0) {
                                  try {
                                    for (const file of result.successful) {
                                      // Use the upload URL directly without processing
                                      if (file.uploadURL) {
                                        const logoUrl = file.uploadURL.split('?')[0]; // Remove query params
                                        
                                        // Add the new logo to brand assets (not replacing existing ones)
                                        setEditingBrandKit(prev => prev ? {
                                          ...prev, 
                                          brandAssets: [...(prev.brandAssets || []), {
                                            type: 'logo',
                                            url: logoUrl,
                                            name: `Uploaded Logo ${(prev.brandAssets?.length || 0) + 1}`
                                          }]
                                        } : null);
                                      }
                                    }
                                    
                                    toast({
                                      title: "Logos Uploaded",
                                      description: `${result.successful.length} logo(s) have been added successfully.`,
                                    });
                                  } catch (error) {
                                    console.error('Logo upload error:', error);
                                    toast({
                                      title: "Upload Error",
                                      description: "Failed to add logos. Please try again.",
                                      variant: "destructive",
                                    });
                                  }
                                }
                              }}
                              buttonClassName="flex-1 h-8"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Logos
                            </ObjectUploader>
                          </div>
                          
                          {/* Display current brand assets with remove functionality */}
                          {editingBrandKit?.brandAssets && editingBrandKit.brandAssets.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-gray-700">Current Logos:</p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {editingBrandKit.brandAssets.map((asset, index) => (
                                  <div key={index} className="relative p-2 border-2 border-gray-200 rounded shadow-sm" style={{
                                    backgroundImage: `
                                      linear-gradient(45deg, #f3f4f6 25%, transparent 25%),
                                      linear-gradient(-45deg, #f3f4f6 25%, transparent 25%),
                                      linear-gradient(45deg, transparent 75%, #f3f4f6 75%),
                                      linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)
                                    `,
                                    backgroundSize: '20px 20px',
                                    backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                                  }}>
                                    <img 
                                      src={asset.url} 
                                      alt={asset.name || `Logo ${index + 1}`}
                                      className="w-full h-16 object-contain"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingBrandKit(prev => prev ? {
                                          ...prev,
                                          brandAssets: prev.brandAssets?.filter((_, i) => i !== index) || []
                                        } : null);
                                      }}
                                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center text-xs hover:bg-red-600 transition-colors"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Display main logo if exists */}
                          {editingBrandKit?.logoUrl && (
                            <div className="relative p-3 border-2 border-gray-200 rounded shadow-sm flex items-center justify-center" style={{
                              backgroundImage: `
                                linear-gradient(45deg, #f3f4f6 25%, transparent 25%),
                                linear-gradient(-45deg, #f3f4f6 25%, transparent 25%),
                                linear-gradient(45deg, transparent 75%, #f3f4f6 75%),
                                linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)
                              `,
                              backgroundSize: '20px 20px',
                              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                            }}>
                              <img 
                                src={editingBrandKit.logoUrl} 
                                alt="Main Logo"
                                className="max-h-12 max-w-32 object-contain"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBrandKit(prev => prev ? {
                                    ...prev,
                                    logoUrl: undefined
                                  } : null);
                                }}
                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                                title="Delete main logo"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSaveBrandKit}
                        disabled={updateBrandKitMutation.isPending || createBrandKitMutation.isPending}
                        className="flex-1"
                      >
                        {(updateBrandKitMutation.isPending || createBrandKitMutation.isPending) 
                          ? (hasBrandKit ? "Saving..." : "Creating...") 
                          : (hasBrandKit ? "Save Changes" : "Create Brand Kit")}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={handleCancelEdit}
                        disabled={updateBrandKitMutation.isPending}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </ProjectLayoutWithHeader>
  );
}