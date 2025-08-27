import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Palette, CheckCircle, Upload, Brain } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
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
  brandAssets?: Array<{
    type: string;
    url: string;
    name?: string;
  }>;
}

export default function ProjectBrandKit() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [customizing, setCustomizing] = useState(false);
  const [editingBrandKit, setEditingBrandKit] = useState<Partial<BrandKit> | null>(null);

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
      return await apiRequest("POST", `/api/projects/${projectId}/brand-kit`, data);
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

  const updateBrandKitMutation = useMutation({
    mutationFn: async (data: Partial<BrandKit>) => {
      const brandKitId = activeBrandKit?.id;
      return await apiRequest("PUT", `/api/projects/${projectId}/brand-kits/${brandKitId}`, data);
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

  const analyzeBrandMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/projects/${projectId}/analyze-brand`);
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "brand-kits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "AI Brand Analysis Complete",
        description: response.message || "Brand elements extracted from website successfully.",
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
        title: "Analysis Failed",
        description: "Failed to analyze website for brand elements. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateBrandKit = () => {
    generateBrandKitMutation.mutate({
      name: `${project?.name} Brand Kit`,
    });
  };

  const handleAnalyzeBrand = () => {
    if (!project?.websiteUrl) {
      toast({
        title: "Website URL Required",
        description: "Please add a website URL to your project to analyze brand elements.",
        variant: "destructive",
      });
      return;
    }
    analyzeBrandMutation.mutate();
  };

  const handleEditBrandKit = () => {
    if (activeBrandKit) {
      setEditingBrandKit({
        primaryColor: activeBrandKit.primaryColor,
        secondaryColor: activeBrandKit.secondaryColor,
        accentColor: activeBrandKit.accentColor,
        fontFamily: activeBrandKit.fontFamily,
        logoUrl: activeBrandKit.logoUrl,
        brandAssets: activeBrandKit.brandAssets || [],
        name: activeBrandKit.name,
      });
      setCustomizing(true);
    }
  };

  const handleSaveBrandKit = () => {
    if (editingBrandKit) {
      // Ensure logoUrl is properly handled - if it's undefined, it should be explicitly set to null for the server
      const brandKitData = {
        ...editingBrandKit,
        logoUrl: editingBrandKit.logoUrl === undefined ? null : editingBrandKit.logoUrl
      };
      
      console.log('Saving brand kit with data:', brandKitData);
      console.log('logoUrl being sent:', brandKitData.logoUrl);
      console.log('brandAssets being sent:', brandKitData.brandAssets);
      
      updateBrandKitMutation.mutate(brandKitData);
    }
  };

  const handleCancelEdit = () => {
    setCustomizing(false);
    setEditingBrandKit(null);
  };

  const handleContinue = () => {
    navigate(`/projects/${projectId}/generate-deck`);
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
          {!hasBrandKit ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Generate Brand Kit
                </CardTitle>
                <CardDescription>
                  Create a professional brand kit with AI-powered color schemes and typography
                  {project?.websiteUrl && " based on your website's existing design"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {project?.businessProfile?.websiteContent?.designElements && (
                  <div className="p-4 bg-blue-50 rounded-lg border">
                    <h4 className="font-medium text-sm text-blue-900 mb-2">Extracted from your website:</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {project.businessProfile.websiteContent.designElements.colors.length > 0 && (
                        <div>
                          <p className="text-xs text-blue-700 mb-1">Colors found:</p>
                          <div className="flex gap-1">
                            {project.businessProfile.websiteContent.designElements.colors.slice(0, 5).map((color: string, idx: number) => (
                              <div 
                                key={idx} 
                                className="w-6 h-6 rounded border border-white"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      {project.businessProfile.websiteContent.designElements.fonts.length > 0 && (
                        <div>
                          <p className="text-xs text-blue-700 mb-1">Fonts found:</p>
                          <div className="flex flex-wrap gap-1">
                            {project.businessProfile.websiteContent.designElements.fonts.slice(0, 3).map((font: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {font}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {project.businessProfile.websiteContent.designElements.logoUrls && project.businessProfile.websiteContent.designElements.logoUrls.length > 0 && (
                        <div>
                          <p className="text-xs text-blue-700 mb-1">Logos found:</p>
                          <div className="flex gap-2">
                            {project.businessProfile.websiteContent.designElements.logoUrls.slice(0, 3).map((logoUrl: string, idx: number) => (
                              <div key={idx} className="w-12 h-12 border rounded overflow-hidden">
                                <img 
                                  src={logoUrl} 
                                  alt={`Logo ${idx + 1}`}
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
                      {project.businessProfile.websiteContent.designElements.keyImages && project.businessProfile.websiteContent.designElements.keyImages.length > 0 && (
                        <div>
                          <p className="text-xs text-blue-700 mb-1">Key images found:</p>
                          <div className="flex gap-2">
                            {project.businessProfile.websiteContent.designElements.keyImages.slice(0, 3).map((imageUrl: string, idx: number) => (
                              <div key={idx} className="w-12 h-12 border rounded overflow-hidden">
                                <img 
                                  src={imageUrl} 
                                  alt={`Image ${idx + 1}`}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="h-12 bg-blue-600 rounded border"></div>
                    <p className="text-sm text-muted-foreground">#3B82F6</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="h-12 bg-slate-100 rounded border"></div>
                    <p className="text-sm text-muted-foreground">#F1F5F9</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Typography</Label>
                  <div className="p-4 border rounded">
                    <h3 className="font-semibold text-xl">Inter - Modern & Clean</h3>
                    <p className="text-sm text-muted-foreground">
                      Perfect for professional presentations and startup branding
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {project?.websiteUrl && (
                    <Button 
                      onClick={handleAnalyzeBrand}
                      disabled={analyzeBrandMutation.isPending}
                      className="w-full"
                    >
                      <Brain className="h-4 w-4 mr-2" />
                      {analyzeBrandMutation.isPending ? "Analyzing Website..." : "AI Analyze Website Brand"}
                    </Button>
                  )}
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
                    {project?.websiteUrl && (
                      <Button 
                        onClick={handleAnalyzeBrand}
                        disabled={analyzeBrandMutation.isPending}
                        variant="ghost"
                        className="flex-1"
                      >
                        <Brain className="h-4 w-4 mr-2" />
                        {analyzeBrandMutation.isPending ? "Re-analyzing..." : "Re-analyze Website"}
                      </Button>
                    )}
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
                          <div className="flex gap-2 items-center">
                            <Input
                              id="primary-color"
                              type="color"
                              value={editingBrandKit?.primaryColor || "#000000"}
                              onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, primaryColor: e.target.value} : null)}
                              className="w-12 h-8 p-1 border rounded"
                            />
                            <Input
                              value={editingBrandKit?.primaryColor || ""}
                              onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, primaryColor: e.target.value} : null)}
                              placeholder="#000000"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="secondary-color">Secondary Color</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              id="secondary-color"
                              type="color"
                              value={editingBrandKit?.secondaryColor || "#000000"}
                              onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, secondaryColor: e.target.value} : null)}
                              className="w-12 h-8 p-1 border rounded"
                            />
                            <Input
                              value={editingBrandKit?.secondaryColor || ""}
                              onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, secondaryColor: e.target.value} : null)}
                              placeholder="#000000"
                              className="flex-1"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="accent-color">Accent Color</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              id="accent-color"
                              type="color"
                              value={editingBrandKit?.accentColor || "#000000"}
                              onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, accentColor: e.target.value} : null)}
                              className="w-12 h-8 p-1 border rounded"
                            />
                            <Input
                              value={editingBrandKit?.accentColor || ""}
                              onChange={(e) => setEditingBrandKit(prev => prev ? {...prev, accentColor: e.target.value} : null)}
                              placeholder="#000000"
                              className="flex-1"
                            />
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
                          <option value="Inter">Inter - Modern & Clean</option>
                          <option value="Roboto">Roboto - Professional & Readable</option>
                          <option value="Open Sans">Open Sans - Friendly & Accessible</option>
                          <option value="Lato">Lato - Warm & Professional</option>
                          <option value="Poppins">Poppins - Modern & Geometric</option>
                          <option value="Montserrat">Montserrat - Elegant & Contemporary</option>
                          <option value="Source Sans Pro">Source Sans Pro - Clean & Versatile</option>
                          <option value="Nunito">Nunito - Rounded & Friendly</option>
                          <option value="Work Sans">Work Sans - Modern & Geometric</option>
                          <option value="Raleway">Raleway - Elegant & Lightweight</option>
                          <option value="Ubuntu">Ubuntu - Modern & Humanist</option>
                          <option value="Merriweather">Merriweather - Serif & Readable</option>
                          <option value="Playfair Display">Playfair Display - Elegant Serif</option>
                          <option value="Georgia">Georgia - Classic Serif</option>
                          <option value="Times New Roman">Times New Roman - Traditional Serif</option>
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="logo-url">Logos</Label>
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
                            {project?.websiteUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const result = await analyzeBrandMutation.mutateAsync();
                                    if (result?.analysis?.logo?.logoUrl) {
                                      setEditingBrandKit(prev => prev ? {
                                        ...prev, 
                                        brandAssets: [...(prev.brandAssets || []), {
                                          type: 'logo',
                                          url: result.analysis.logo.logoUrl,
                                          name: 'Website Logo'
                                        }]
                                      } : null);
                                      toast({
                                        title: "Logo Extracted",
                                        description: "Logo has been extracted from your website.",
                                      });
                                    } else {
                                      toast({
                                        title: "No Logo Found",
                                        description: "Could not find a clear logo on your website.",
                                        variant: "destructive",
                                      });
                                    }
                                  } catch (error) {
                                    toast({
                                      title: "Extraction Failed",
                                      description: "Failed to extract logo from website.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                                className="flex-1"
                              >
                                <Brain className="h-4 w-4 mr-2" />
                                Extract from Website
                              </Button>
                            )}
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
                        disabled={updateBrandKitMutation.isPending}
                        className="flex-1"
                      >
                        {updateBrandKitMutation.isPending ? "Saving..." : "Save Changes"}
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

          {hasBrandKit && (
            <div className="mt-6">
              <Button onClick={handleContinue} className="w-full">
                Continue to Pitch Deck Generation
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </ProjectLayoutWithHeader>
  );
}