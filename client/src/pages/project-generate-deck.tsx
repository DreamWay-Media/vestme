import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, CheckCircle, Loader2, Download, Edit, RefreshCw, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ProjectLayoutWithHeader from "@/components/ProjectLayoutWithHeader";
import { SlideRenderer } from "@/components/SlideRenderer";

export default function ProjectGenerateDeck() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPreviewSlide, setCurrentPreviewSlide] = useState(0);

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
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Generation Failed",
        description: "Failed to generate pitch deck. Please try again.",
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
          window.location.href = "/api/login";
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
    return (
      <div className={`relative overflow-hidden rounded border ${isCompact ? 'h-24' : 'aspect-video'}`}>
        <SlideRenderer slide={slide} isCompact={isCompact} />
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
                  Generate Pitch Deck
                </Button>
              </CardContent>
            </Card>
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
                        if (latestDeck.pdfUrl && latestDeck.pdfUrl.endsWith('.pdf')) {
                          // Create a proper PDF download
                          try {
                            const response = await fetch(latestDeck.pdfUrl);
                            if (response.ok) {
                              const blob = await response.blob();
                              const link = document.createElement('a');
                              link.href = URL.createObjectURL(blob);
                              link.download = `${latestDeck.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-deck.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(link.href);
                            } else {
                              throw new Error('PDF not found');
                            }
                          } catch (error) {
                            toast({
                              title: "PDF Download Failed",
                              description: "The PDF could not be downloaded. Please regenerate it.",
                              variant: "destructive"
                            });
                          }
                        } else {
                          toast({
                            title: "PDF Not Available",
                            description: "Please regenerate the PDF first.",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button 
                      onClick={handleGenerateDeck}
                      disabled={isGenerating || regeneratePdfMutation.isPending}
                      variant="outline" 
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {isGenerating ? 'Generating...' : 'Re-generate Deck'}
                    </Button>
                    <Button 
                      onClick={() => regeneratePdfMutation.mutate(latestDeck.id)}
                      disabled={isGenerating || regeneratePdfMutation.isPending}
                      variant="outline" 
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {regeneratePdfMutation.isPending ? 'Fixing PDF...' : 'Fix PDF Export'}
                    </Button>
                  </div>
                </div>

                {/* Slide Preview Gallery */}
                <div className="mt-6 p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Deck Preview</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Eye className="h-4 w-4" />
                      {currentPreviewSlide + 1} of {latestDeck.slides?.length || 0}
                    </div>
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
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPreviewSlide(Math.max(0, currentPreviewSlide - 1))}
                          disabled={currentPreviewSlide === 0}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        
                        <div className="flex gap-1 max-w-md overflow-x-auto">
                          {latestDeck.slides.slice(0, 12).map((slide: any, index: number) => (
                            <div
                              key={index}
                              onClick={() => setCurrentPreviewSlide(index)}
                              className={`flex-shrink-0 w-20 cursor-pointer border-2 rounded ${
                                currentPreviewSlide === index
                                  ? 'border-blue-500 ring-2 ring-blue-200'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <SlidePreview slide={slide} isCompact={true} />
                              <div className="text-xs text-center py-1 bg-gray-50 border-t">
                                {index + 1}
                              </div>
                            </div>
                          ))}
                          {latestDeck.slides.length > 12 && (
                            <div className="flex items-center px-3 text-xs text-gray-500 border border-gray-200 rounded">
                              +{latestDeck.slides.length - 12}
                            </div>
                          )}
                        </div>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPreviewSlide(Math.min(latestDeck.slides.length - 1, currentPreviewSlide + 1))}
                          disabled={currentPreviewSlide === latestDeck.slides.length - 1}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
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