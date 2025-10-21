import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, CheckCircle, Loader2, Download, Edit, RefreshCw, ChevronLeft, ChevronRight, Eye, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ProjectLayoutWithHeader from "@/components/ProjectLayoutWithHeader";
import { SlideRenderer } from "@/components/SlideRenderer";

// Custom scrollbar styles
const scrollbarStyles = `
  .scrollbar-thin::-webkit-scrollbar {
    height: 6px;
  }
  .scrollbar-thin::-webkit-scrollbar-track {
    background: #f3f4f6;
    border-radius: 3px;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 3px;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
`;

export default function ProjectGenerateDeck() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPreviewSlide, setCurrentPreviewSlide] = useState(0);
  const [slideThumbnailsRef, setSlideThumbnailsRef] = useState<HTMLDivElement | null>(null);

  // Function to scroll to current slide
  const scrollToCurrentSlide = (slideIndex: number) => {
    if (slideThumbnailsRef) {
      const slideElement = slideThumbnailsRef.children[slideIndex] as HTMLElement;
      if (slideElement) {
        slideElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  };

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  }) as { data: any, isLoading: boolean };

  const { data: decks, isLoading: decksLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "decks"],
    enabled: !!projectId,
  }) as { data: any[], isLoading: boolean };

  const { data: brandKits } = useQuery({
    queryKey: ["/api/projects", projectId, "brand-kits"],
    enabled: !!projectId,
  }) as { data: any[] };

  const generateDeckMutation = useMutation({
    mutationFn: async (brandKitId?: string) => {
      return await apiRequest("POST", `/api/projects/${projectId}/generate-deck`, {
        brandKitId: brandKitId || (brandKits?.[0]?.id)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "decks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Pitch Deck Generated",
        description: "Your pitch deck has been created successfully.",
      });
    },
    onError: (error: any) => {
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
      
      // Check for specific business profile error
      if (error?.response?.status === 400 && error?.response?.data?.message?.includes("Business analysis")) {
        toast({
          title: "Business Analysis Required",
          description: "Please complete the business discovery step first.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Generation Failed",
        description: "Failed to generate pitch deck. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add PDF generation mutation (for Export PDF button)
  const generatePdfMutation = useMutation({
    mutationFn: async (deckId: string) => {
      return await apiRequest("POST", `/api/decks/${deckId}/generate-pdf`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "decks"] });
      toast({
        title: "PDF Generated",
        description: "Your PDF has been generated successfully and is ready for download.",
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
        title: "PDF Generation Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add PDF regeneration mutation
  const regeneratePdfMutation = useMutation({
    mutationFn: async (deckId: string) => {
      return await apiRequest("POST", `/api/decks/${deckId}/regenerate-pdf`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "decks"] });
      toast({
        title: "PDF Regenerated",
        description: "Your PDF has been regenerated successfully and is ready for download.",
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
        title: "PDF Regeneration Failed",
        description: "Failed to regenerate PDF. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateDeck = () => {
    const defaultBrandKit = brandKits?.[0];
    generateDeckMutation.mutate(defaultBrandKit?.id);
  };

  const handleViewDeck = (deckId: string) => {
    navigate(`/deck-viewer/${deckId}`);
  };



  // Use shared slide renderer for exact consistency with deck viewer
  const SlidePreview = ({ slide, isCompact = false }: { slide: any; isCompact?: boolean }) => {
    // Pass ALL AI-generated colors and ALL brand kit colors to SlideRenderer
    // This must match exactly what renderSlideContent in deck-viewer.tsx does
    const slideWithStyling = {
      ...slide,
      styling: {
        // Preserve existing slide styling first
        ...(slide.styling || {}),
        // Use saved styling colors first, then brand kit defaults
        backgroundColor: slide.styling?.backgroundColor || slide.backgroundColor || brandKits?.[0]?.secondaryColor || '#ffffff',
        textColor: slide.styling?.textColor || slide.textColor || brandKits?.[0]?.primaryColor || '#333333',
        primaryColor: slide.styling?.primaryColor || slide.textColor || brandKits?.[0]?.primaryColor || '#3b82f6',
        secondaryColor: slide.styling?.secondaryColor || slide.backgroundColor || brandKits?.[0]?.secondaryColor || '#64748b',
        accentColor: slide.styling?.accentColor || brandKits?.[0]?.accentColor || '#10b981',
        fontFamily: slide.styling?.fontFamily || brandKits?.[0]?.fontFamily || 'Inter',
        fontSize: slide.styling?.fontSize || 'medium',
        titleFontSize: slide.styling?.titleFontSize || '3xl',
        descriptionFontSize: slide.styling?.descriptionFontSize || 'lg',
        bulletFontSize: slide.styling?.bulletFontSize || 'base',
        logoUrl: brandKits?.[0]?.logoUrl || slide.styling?.logoUrl,
        backgroundImage: slide.styling?.backgroundImage,
        // Store all logos from brand kit for comprehensive logo usage
        allLogos: [
          ...(brandKits?.[0]?.logoUrl ? [brandKits[0].logoUrl] : []),
          ...(brandKits?.[0]?.brandAssets ? brandKits[0].brandAssets.map((asset: any) => asset.url) : [])
        ].filter(Boolean),
        brandColors: {
          primary: slide.styling?.primaryColor || slide.textColor || brandKits?.[0]?.primaryColor || '#3b82f6',
          secondary: slide.styling?.secondaryColor || slide.backgroundColor || brandKits?.[0]?.secondaryColor || '#64748b',
          accent: slide.styling?.accentColor || brandKits?.[0]?.accentColor || '#10b981'
        }
      }
    };

    // Debug: Log the actual colors and font sizes being used
    console.log('SlidePreview - Original slide colors:', {
      backgroundColor: slide.backgroundColor,
      textColor: slide.textColor
    });
    console.log('SlidePreview - Font sizes from AI:', {
      titleFontSize: slide.styling?.titleFontSize,
      descriptionFontSize: slide.styling?.descriptionFontSize,
      bulletFontSize: slide.styling?.bulletFontSize
    });
    console.log('SlidePreview - Final styling:', slideWithStyling.styling);
    console.log('SlidePreview - Slide styling object:', slide.styling);
    console.log('SlidePreview - Brand kits:', brandKits);

    return (
      <div className={`relative overflow-hidden rounded border ${isCompact ? 'h-24' : 'aspect-video'}`}>
        <SlideRenderer slide={slideWithStyling} isCompact={isCompact} />
      </div>
    );
  };

  const handleBackToProjects = () => {
    navigate("/projects");
  };

  if (projectLoading || !project) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const latestDeck = decks?.[0];
  const hasDeck = !!latestDeck;
  const isGenerating = generateDeckMutation.isPending;

  return (
    <ProjectLayoutWithHeader>
      <style>{scrollbarStyles}</style>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Generate Deck</h1>
            <p className="mt-1 text-sm text-gray-600">Create professional pitch decks using AI analysis of your business data.</p>
          </div>
        </div>
      </div>

      <div className="w-full">
        <div className="w-full space-y-6">
          {!hasDeck && !isGenerating ? (
            <>
              {/* Check if business profile exists */}
              {!project?.businessProfile ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      Business Analysis Required
                    </CardTitle>
                    <CardDescription>
                      You need to complete the business discovery step before generating a pitch deck
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          <p className="font-medium mb-2">Complete Business Discovery First</p>
                          <p className="mb-3">To generate a professional pitch deck, we need to analyze your business data, market opportunity, and competitive landscape.</p>
                          <ul className="space-y-1 text-xs">
                            <li>• Upload business documents or analyze your website</li>
                            <li>• Get AI-powered business insights and market analysis</li>
                            <li>• Define your value proposition and business model</li>
                            <li>• Identify target market and competitive advantages</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button 
                        onClick={() => navigate(`/projects/${projectId}/discovery`)}
                        className="flex-1"
                        size="lg"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Go to Business Discovery
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => navigate(`/projects/${projectId}/brand-kit`)}
                        className="flex-1"
                        size="lg"
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Go to Brand Kit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : !brandKits || brandKits.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-500" />
                      Brand Kit Required
                    </CardTitle>
                    <CardDescription>
                      You need to create a brand kit before generating a pitch deck
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div className="text-sm text-amber-800">
                          <p className="font-medium mb-2">Complete Brand Kit First</p>
                          <p className="mb-3">To generate a branded pitch deck, we need your brand colors, typography, and visual identity to create a cohesive presentation.</p>
                          <ul className="space-y-1 text-xs">
                            <li>• Define your brand colors (primary, secondary, accent)</li>
                            <li>• Choose professional typography</li>
                            <li>• Upload your company logo</li>
                            <li>• Create consistent visual branding</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => navigate(`/projects/${projectId}/brand-kit`)}
                      className="w-full"
                      size="lg"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Go to Brand Kit
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Generate Pitch Deck
                    </CardTitle>
                    <CardDescription>
                      Create a professional pitch deck using AI analysis of your business
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        <div className="text-sm text-green-800">
                          <p className="font-medium mb-1">Business Analysis Complete ✓</p>
                          <p>Your business profile is ready. We'll use this data to create a comprehensive pitch deck.</p>
                        </div>
                      </div>
                    </div>

                    {/* Brand Kit Preview */}
                    {brandKits && brandKits[0] && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-2">Brand Kit Ready ✓</p>
                            <p className="mb-3">Your pitch deck will use your brand colors, typography, and ALL available logos for a professional, cohesive look.</p>
                            
                            {/* Brand Colors Preview */}
                            <div className="grid grid-cols-3 gap-3 mt-3">
                              <div className="text-center">
                                <div 
                                  className="w-12 h-12 rounded border-2 border-white shadow-sm mx-auto mb-1"
                                  style={{ backgroundColor: brandKits[0].primaryColor }}
                                ></div>
                                <p className="text-xs font-medium">Primary</p>
                                <p className="text-xs text-blue-700">{brandKits[0].primaryColor}</p>
                              </div>
                              <div className="text-center">
                                <div 
                                  className="w-12 h-12 rounded border-2 border-white shadow-sm mx-auto mb-1"
                                  style={{ backgroundColor: brandKits[0].secondaryColor }}
                                ></div>
                                <p className="text-xs font-medium">Secondary</p>
                                <p className="text-xs text-blue-700">{brandKits[0].secondaryColor}</p>
                              </div>
                              <div className="text-center">
                                <div 
                                  className="w-12 h-12 rounded border-2 border-white shadow-sm mx-auto mb-1"
                                  style={{ backgroundColor: brandKits[0].accentColor }}
                                ></div>
                                <p className="text-xs font-medium">Accent</p>
                                <p className="text-xs text-blue-700">{brandKits[0].accentColor}</p>
                              </div>
                            </div>
                            
                            <div className="mt-3 text-xs">
                              <p><strong>Typography:</strong> {brandKits[0].fontFamily}</p>
                              <div className="mt-2">
                                <p><strong>Logos:</strong></p>
                                {brandKits[0].logoUrl && (
                                  <p className="ml-2">• Main Logo: Ready</p>
                                )}
                                {brandKits[0].brandAssets && brandKits[0].brandAssets.length > 0 && (
                                  <p className="ml-2">• Additional Logos: {brandKits[0].brandAssets.length} available</p>
                                )}
                                {!brandKits[0].logoUrl && (!brandKits[0].brandAssets || brandKits[0].brandAssets.length === 0) && (
                                  <p className="ml-2 text-amber-600">• No logos uploaded yet</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold">What's Included</h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Problem & Solution</li>
                          <li>• Market Opportunity</li>
                          <li>• Business Model</li>
                          <li>• Competitive Analysis</li>
                          <li>• Financial Projections</li>
                          <li>• Team & Roadmap</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold">AI Features</h3>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          <li>• Industry-specific content</li>
                          <li>• Data-driven insights</li>
                          <li>• Professional design</li>
                          <li>• Investor-ready format</li>
                          <li>• Customizable slides</li>
                          <li>• PDF export ready</li>
                        </ul>
                      </div>
                    </div>

                    <Button 
                      onClick={handleGenerateDeck}
                      disabled={isGenerating}
                      className="w-full"
                      size="lg"
                    >
                      Generate Branded Pitch Deck
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          ) : isGenerating ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Your Pitch Deck
                </CardTitle>
                <CardDescription>
                  AI is creating your professional presentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Analyzing business data
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Creating slide content
                    </p>
                    <p className="flex items-center gap-2 text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Applying brand styling
                    </p>
                    <p className="text-muted-foreground">• Finalizing presentation</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> This process typically takes 1-2 minutes. 
                    We're analyzing your business data and creating investor-ready content.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Pitch Deck Ready!
                </CardTitle>
                <CardDescription>
                  Your professional pitch deck has been generated successfully
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{latestDeck.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {latestDeck.slides?.length || 10} slides • Created {new Date(latestDeck.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">Ready</Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleViewDeck(latestDeck.id)}
                      className="flex-1"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Deck
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={async () => {
                        try {
                          // Always regenerate PDF first to get the latest version
                          toast({
                            title: "Generating PDF",
                            description: "Creating your latest PDF, it will download automatically when ready.",
                          });
                          
                          // Generate PDF and then download it
                          const result = await generatePdfMutation.mutateAsync(latestDeck.id);
                          
                          // Wait a moment for the PDF to be ready, then download
                          setTimeout(async () => {
                            try {
                              // Refetch deck to get updated PDF URL
                              await queryClient.refetchQueries({ queryKey: ["/api/projects", projectId, "decks"] });
                              
                              // Get the updated deck data
                              const updatedDeck = await queryClient.getQueryData(["/api/projects", projectId, "decks"]);
                              const deckWithPdf = Array.isArray(updatedDeck) ? updatedDeck[0] : null;
                              
                              if (deckWithPdf?.pdfUrl) {
                                const response = await fetch(deckWithPdf.pdfUrl);
                                if (response.ok) {
                                  const blob = await response.blob();
                                  const link = document.createElement('a');
                                  link.href = URL.createObjectURL(blob);
                                  link.download = `${latestDeck.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-deck.pdf`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(link.href);
                                  
                                  toast({
                                    title: "PDF Ready & Downloaded",
                                    description: "Your latest pitch deck PDF has been generated and downloaded successfully.",
                                  });
                                }
                              }
                            } catch (downloadError) {
                              toast({
                                title: "PDF Generated",
                                description: "PDF created successfully! Click the button again to download.",
                              });
                            }
                          }, 2000); // Wait 2 seconds for PDF to be ready
                        } catch (error) {
                          console.error('PDF operation failed:', error);
                          toast({
                            title: "PDF Operation Failed",
                            description: "There was an issue with the PDF. Please try again.",
                            variant: "destructive"
                          });
                        }
                      }}
                      disabled={generatePdfMutation.isPending}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {generatePdfMutation.isPending ? 'Generating PDF...' : 'Download Latest PDF'}
                    </Button>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button 
                      onClick={handleGenerateDeck}
                      disabled={isGenerating}
                      variant="outline" 
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {isGenerating ? 'Generating...' : 'Re-generate Deck'}
                    </Button>

                  </div>
                </div>

                {/* Slide Preview Gallery */}
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-600" />
                      Deck Preview
                    </h4>
                  </div>
                  
                  {latestDeck.slides && latestDeck.slides.length > 0 && (
                    <>
                      {/* Main slide preview - matches deck viewer exactly */}
                      <div className="mb-4">
                        <SlidePreview 
                          slide={latestDeck.slides[currentPreviewSlide]} 
                          isCompact={false} 
                        />
                      </div>
                      
                                              {/* Navigation controls */}
                        <div className="space-y-4">
                          {/* Slide counter and navigation */}
                          <div className="flex items-center justify-between">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newIndex = Math.max(0, currentPreviewSlide - 1);
                                setCurrentPreviewSlide(newIndex);
                                scrollToCurrentSlide(newIndex);
                              }}
                              disabled={currentPreviewSlide === 0}
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            
                            <div className="text-sm text-gray-600 font-medium">
                              Slide {currentPreviewSlide + 1} of {latestDeck.slides.length}
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newIndex = Math.min(latestDeck.slides.length - 1, currentPreviewSlide + 1);
                                setCurrentPreviewSlide(newIndex);
                                scrollToCurrentSlide(newIndex);
                              }}
                              disabled={currentPreviewSlide === latestDeck.slides.length - 1}
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                          
                          {/* Slide thumbnails */}
                          <div className="bg-white rounded-lg border p-3">
                            <div className="text-xs font-medium text-gray-700 mb-2 text-center">
                              Click any slide to preview
                            </div>
                            <div 
                              ref={setSlideThumbnailsRef}
                              className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                            >
                              {latestDeck.slides.map((slide: any, index: number) => (
                                <div
                                  key={index}
                                  onClick={() => {
                                    setCurrentPreviewSlide(index);
                                    scrollToCurrentSlide(index);
                                  }}
                                  className={`flex-shrink-0 w-28 cursor-pointer border-2 rounded-lg transition-all duration-200 hover:shadow-md ${
                                    currentPreviewSlide === index
                                      ? 'border-blue-500 ring-2 ring-blue-200 shadow-lg'
                                      : 'border-gray-200 hover:border-blue-300'
                                  }`}
                                >
                                  <SlidePreview slide={slide} isCompact={true} />
                                  <div className="text-xs text-center py-2 bg-gray-50 border-t font-medium text-gray-700">
                                    {index + 1}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                    </>
                  )}
                </div>



                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600">{latestDeck.slides?.length || 10}</div>
                    <div className="text-sm text-muted-foreground">Total Slides</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600">Ready</div>
                    <div className="text-sm text-muted-foreground">Status</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </ProjectLayoutWithHeader>
  );
}