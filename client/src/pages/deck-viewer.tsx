import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";
import type { UploadResult } from "@uppy/core";
import { 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Save, 
  X, 
  Palette, 
  Type, 
  Image,
  Download,
  Settings,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  FileImage,
  Layout,
  Sparkles
} from "lucide-react";
import { WysiwygEditor } from "@/components/WysiwygEditor";
import { ObjectUploader } from "@/components/ObjectUploader";
import { SlideRenderer } from "@/components/SlideRenderer";

interface DeckViewerProps {
  deckId: string;
}

interface Slide {
  id: string;
  type: string;
  title: string;
  content: any;
  order: number;
  styling?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    logoUrl?: string;
    textColor?: string;
    backgroundColor?: string;
    backgroundImage?: string;
  };
}

interface Deck {
  id: string;
  projectId: string;
  title: string;
  slides: Slide[];
  status: string;
  pdfUrl?: string;
  createdAt: string;
}

export default function DeckViewer({ deckId }: DeckViewerProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [showSlideManager, setShowSlideManager] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: deck, isLoading: deckLoading, error } = useQuery({
    queryKey: [`/api/decks/${deckId}`],
    retry: false,
    enabled: !!deckId && isAuthenticated,
  });

  // Mutation for updating slide content and styling
  const updateSlideMutation = useMutation({
    mutationFn: async ({ slideId, updates }: { slideId: string, updates: Partial<Slide> }) => {
      return await apiRequest("PUT", `/api/decks/${deckId}/slides/${slideId}`, updates);
    },
    onSuccess: () => {
      // Aggressively invalidate all related queries to ensure immediate update reflection
      queryClient.invalidateQueries({ queryKey: [`/api/decks/${deckId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/decks`] });
      // Force refetch to ensure we get the latest data immediately
      queryClient.refetchQueries({ queryKey: [`/api/decks/${deckId}`] });
      toast({
        title: "Slide Updated",
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
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Update Failed",
        description: "Failed to update slide. Please try again.",
        variant: "destructive",
      });
    },
  });

  // AI text improvement mutation
  const improveTextMutation = useMutation({
    mutationFn: async ({ text, context }: { text: string; context: string }) => {
      if (!deckId) throw new Error('Deck ID is required');
      return await apiRequest('POST', `/api/projects/${deckId}/ai-improve-text`, {
        text,
        context
      });
    },
    onSuccess: (data: any, variables: any) => {
      if (data.improvedText && editingSlide) {
        // Update the appropriate field based on context
        const { context } = variables;
        if (context === 'slide title') {
          updateEditingSlide('title', data.improvedText);
          updateEditingSlide('content.titleHtml', `<h1 style="color: ${editingSlide.styling?.primaryColor || '#3b82f6'}; margin: 0;">${data.improvedText}</h1>`);
        } else if (context === 'slide description') {
          updateEditingSlide('content.description', data.improvedText);
          updateEditingSlide('content.descriptionHtml', `<p>${data.improvedText}</p>`);
        } else if (context === 'bullet points') {
          const points = data.improvedText.split(',').map((p: string) => p.trim()).filter((p: string) => p);
          updateEditingSlide('content.bulletPoints', points);
          updateEditingSlide('content.bulletPointsHtml', `<ul>${points.map((point: string) => `<li>${point}</li>`).join('')}</ul>`);
        } else if (context === 'call to action') {
          updateEditingSlide('content.call_to_action', data.improvedText);
          updateEditingSlide('content.callToActionHtml', `<p style="font-weight: bold;">${data.improvedText}</p>`);
        }
        
        toast({
          title: "Content Improved",
          description: "AI has enhanced your content based on your project information.",
        });
      }
    },
    onError: (error) => {
      console.error('Failed to improve text:', error);
      toast({
        title: "Improvement Failed",
        description: "Could not improve the content. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  // Mutation for adding custom slides
  const addSlideMutation = useMutation({
    mutationFn: async () => {
      const nextOrder = sortedSlides.length;
      return await apiRequest("POST", `/api/decks/${deckId}/slides`, {
        type: 'custom',
        title: `Custom Slide ${nextOrder + 1}`,
        content: {
          sections: []
        },
        order: nextOrder,
        styling: {
          backgroundColor: '#ffffff',
          textColor: '#333333'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/decks/${deckId}`] });
      toast({
        title: "Slide Added",
        description: "New custom slide has been added successfully.",
      });
    },
  });

  // Mutation for deleting slides
  const deleteSlideMutation = useMutation({
    mutationFn: async (slideId: string) => {
      return await apiRequest("DELETE", `/api/decks/${deckId}/slides/${slideId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/decks/${deckId}`] });
      setCurrentSlide(Math.max(0, currentSlide - 1));
      toast({
        title: "Slide Deleted",
        description: "Slide has been removed successfully.",
      });
    },
  });

  // Mutation for reordering slides
  const reorderSlidesMutation = useMutation({
    mutationFn: async (slideOrders: Array<{ slideId: string; order: number }>) => {
      return await apiRequest("PUT", `/api/decks/${deckId}/slides/reorder`, { slideOrders });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/decks/${deckId}`] });
      toast({
        title: "Slides Reordered",
        description: "Slide order has been updated successfully.",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (deckLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow-lg h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!deck) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-presentation text-gray-400 text-2xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Deck Not Found</h3>
          <p className="text-gray-600 mb-4">The requested pitch deck could not be found.</p>
          <Button onClick={() => window.close()}>
            <i className="fas fa-arrow-left mr-2"></i>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const deckData = deck as Deck;
  const slides = Array.isArray(deckData.slides) ? deckData.slides : [];
  const sortedSlides = slides.sort((a, b) => (a.order || 0) - (b.order || 0));

  const nextSlide = () => {
    if (currentSlide < sortedSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const currentSlideData = sortedSlides[currentSlide];

  // Editing handlers
  const startEditing = (slide: Slide) => {
    setEditingSlide({ ...slide });
    setIsEditing(true);
  };



  // Section management functions
  const addSection = (type: 'title' | 'text' | 'bullet' | 'image') => {
    if (!editingSlide) return;
    
    const newSection = {
      id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      content: type === 'image' ? '' : `<p>Enter ${type} content...</p>`,
      order: (editingSlide.content?.sections?.length || 0) + 1,
    };

    const updatedSections = [...(editingSlide.content?.sections || []), newSection];
    updateEditingSlide('content.sections', updatedSections);
  };

  const removeSection = (sectionId: string) => {
    if (!editingSlide) return;
    
    const updatedSections = (editingSlide.content?.sections || []).filter((s: any) => s.id !== sectionId);
    // Reorder remaining sections
    const reorderedSections = updatedSections.map((s: any, index: number) => ({ ...s, order: index + 1 }));
    updateEditingSlide('content.sections', reorderedSections);
  };

  const moveSectionOrder = (sectionId: string, direction: 'up' | 'down') => {
    if (!editingSlide) return;
    
    const sections = [...(editingSlide.content?.sections || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    const currentIndex = sections.findIndex((s: any) => s.id === sectionId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    
    // Swap sections
    [sections[currentIndex], sections[newIndex]] = [sections[newIndex], sections[currentIndex]];
    
    // Update order values
    const reorderedSections = sections.map((s: any, index: number) => ({ ...s, order: index + 1 }));
    updateEditingSlide('content.sections', reorderedSections);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingSlide(null);
    setShowStylePanel(false);
  };

  const saveSlide = () => {
    if (editingSlide && currentSlideData) {
      updateSlideMutation.mutate({
        slideId: currentSlideData.id,
        updates: editingSlide
      });
      setIsEditing(false);
      setEditingSlide(null);
      setShowStylePanel(false);
    }
  };

  const updateEditingSlide = (field: string, value: any) => {
    if (editingSlide) {
      if (field.startsWith('styling.')) {
        const styleProp = field.replace('styling.', '');
        setEditingSlide({
          ...editingSlide,
          styling: {
            ...editingSlide.styling,
            [styleProp]: value
          }
        });
      } else if (field.startsWith('content.')) {
        const contentProp = field.replace('content.', '');
        setEditingSlide({
          ...editingSlide,
          content: {
            ...editingSlide.content,
            [contentProp]: value
          }
        });
      } else {
        setEditingSlide({
          ...editingSlide,
          [field]: value
        });
      }
    }
  };

  const handleImproveText = (field: string, text: string, context: string) => {
    if (!text?.trim()) {
      toast({
        title: "No Content",
        description: "Please add some text first before improving it.",
        variant: "destructive",
      });
      return;
    }
    improveTextMutation.mutate({ text, context });
  };


  // Add a new custom slide function
  const addCustomSlide = () => {
    const newSlide = {
      id: `custom_${Date.now()}`,
      type: 'custom',
      title: 'Custom Slide',
      content: {
        sections: [
          { id: 'section_1', type: 'title', content: 'Custom Title', order: 1 },
          { id: 'section_2', type: 'text', content: 'Your content here...', order: 2 }
        ]
      },
      order: sortedSlides.length,
      styling: {
        backgroundColor: '#ffffff',
        textColor: '#333333',
        fontFamily: 'Inter'
      }
    };
    
    addSlideMutation.mutate(newSlide as any);
  };



  // Use shared slide renderer for exact consistency
  const renderSlideContent = (slide: Slide) => {
    return <SlideRenderer slide={slide} isCompact={false} />;
  };

  // Render editable slide content with WYSIWYG editors
  const renderEditableSlideContent = (slide: Slide) => {
    if (!editingSlide) return null;
    
    const content = editingSlide.content || {};
    const styling = editingSlide.styling || {};
    const primaryColor = styling.primaryColor || '#3b82f6';
    const backgroundImage = styling.backgroundImage;
    
    const cardStyle = {
      backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundColor: styling.backgroundColor || '#ffffff'
    };

    return (
      <div style={cardStyle} className="min-h-full p-6">
        <div className="space-y-8">
          {/* Title WYSIWYG Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Slide Title</label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleImproveText('title', editingSlide.title || '', 'slide title')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 h-6 px-2"
                data-testid="button-ai-improve-title"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Button>
            </div>
            <WysiwygEditor
              content={editingSlide.title ? `<h1 style="color: ${primaryColor}; margin: 0;">${editingSlide.title}</h1>` : `<h1 style="color: ${primaryColor}; margin: 0;">Slide Title</h1>`}
              onChange={(html) => {
                // Extract text content from HTML and update title
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                updateEditingSlide('title', doc.body.textContent || '');
                // Also store the HTML for rich formatting
                updateEditingSlide('content.titleHtml', html);
              }}
              placeholder="Enter slide title..."
              minHeight="min-h-[80px]"
              className="border-2 border-dashed border-blue-300"
              projectId={deckId}
              context="slide title"
              showAiImprove={true}
            />
          </div>

          {/* Dynamic Section Editors */}
          {(editingSlide?.content?.sections || [])
            .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
            .map((section: any) => (
              <div key={section.id} className="section-editor">
                <label className="text-xs font-medium text-gray-600 mb-2 block flex items-center justify-between">
                  <span>{section.type.toUpperCase()} Section</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSection(section.id)}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </label>
                
                {section.type === 'image' ? (
                  <div className="space-y-3">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5242880} // 5MB
                      onGetUploadParameters={async () => {
                        const response = await fetch('/api/objects/upload', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        });
                        const data = await response.json();
                        return {
                          method: 'PUT' as const,
                          url: data.uploadURL
                        };
                      }}
                      onComplete={(result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                        if (result.successful && result.successful[0]) {
                          const uploadedFile = result.successful[0];
                          const imageUrl = uploadedFile.uploadURL;
                          
                          // Update the section content with the uploaded URL
                          const sections = editingSlide?.content?.sections || [];
                          const updatedSections = sections.map((s: any) => 
                            s.id === section.id ? {...s, content: imageUrl} : s
                          );
                          updateEditingSlide('content.sections', updatedSections);
                          
                          toast({
                            title: "Image uploaded",
                            description: "Your image has been uploaded successfully.",
                          });
                        }
                      }}
                      buttonClassName="w-full"
                    >
                      <div className="flex items-center gap-2">
                        <FileImage className="h-4 w-4" />
                        <span>Upload Image</span>
                      </div>
                    </ObjectUploader>
                    
                    <div className="text-xs text-gray-500 text-center">OR</div>
                    
                    <Input
                      placeholder="Image URL"
                      value={section.content || ''}
                      onChange={(e) => {
                        const sections = editingSlide?.content?.sections || [];
                        const updatedSections = sections.map((s: any) => 
                          s.id === section.id ? {...s, content: e.target.value} : s
                        );
                        updateEditingSlide('content.sections', updatedSections);
                      }}
                    />
                    
                    {section.content && (
                      <div className="mt-2">
                        <img
                          src={section.content}
                          alt="Section content"
                          className="max-w-full h-24 object-cover rounded border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const sections = editingSlide?.content?.sections || [];
                            const updatedSections = sections.map((s: any) => 
                              s.id === section.id ? {...s, content: ''} : s
                            );
                            updateEditingSlide('content.sections', updatedSections);
                          }}
                          className="mt-2 w-full"
                        >
                          Remove Image
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <WysiwygEditor
                    content={section.content || `<p>Enter ${section.type} content...</p>`}
                    onChange={(html) => {
                      const sections = editingSlide?.content?.sections || [];
                      const updatedSections = sections.map((s: any) => 
                        s.id === section.id ? {...s, content: html} : s
                      );
                      updateEditingSlide('content.sections', updatedSections);
                    }}
                    placeholder={`Enter ${section.type} content...`}
                    minHeight="min-h-[100px]"
                    className="border-2 border-dashed border-blue-300"
                  />
                )}
              </div>
            ))}

          {/* Legacy Content Editors for backward compatibility */}
          {slide.type === 'title' && !editingSlide?.content?.sections?.length && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-2 block">Subtitle</label>
              <WysiwygEditor
                content={content.subtitleHtml || (content.subtitle ? `<p>${content.subtitle}</p>` : '<p>Enter subtitle...</p>')}
                onChange={(html) => {
                  updateEditingSlide('content.subtitleHtml', html);
                  // Also extract plain text for backward compatibility
                  const parser = new DOMParser();
                  const doc = parser.parseFromString(html, 'text/html');
                  updateEditingSlide('content.subtitle', doc.body.textContent || '');
                }}
                placeholder="Enter subtitle..."
                minHeight="min-h-[100px]"
                className="border-2 border-dashed border-gray-300"
              />
            </div>
          )}

          {(slide.type === 'content' || slide.type === 'default') && (
            <>
              {/* Description WYSIWYG Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">Main Description</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleImproveText('description', content.description || content.main_text || '', 'slide description')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 h-6 px-2"
                    data-testid="button-ai-improve-description"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Button>
                </div>
                <WysiwygEditor
                  content={content.descriptionHtml || (content.description || content.main_text ? `<p>${content.description || content.main_text}</p>` : '<p>Enter description...</p>')}
                  onChange={(html) => {
                    updateEditingSlide('content.descriptionHtml', html);
                    // Also extract plain text for backward compatibility
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    updateEditingSlide('content.description', doc.body.textContent || '');
                  }}
                  placeholder="Enter main description..."
                  minHeight="min-h-[150px]"
                  className="border-2 border-dashed border-gray-300"
                  projectId={deckId}
                  context="slide description"
                  showAiImprove={true}
                />
              </div>

              {/* Bullet Points WYSIWYG Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">Bullet Points</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleImproveText('bulletPoints', (content.bullet_points || content.bulletPoints || []).join(', '), 'bullet points')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 h-6 px-2"
                    data-testid="button-ai-improve-bullets"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Button>
                </div>
                <WysiwygEditor
                  content={content.bulletPointsHtml || (content.bullet_points || content.bulletPoints ? 
                    `<ul>${(content.bullet_points || content.bulletPoints).map((point: string) => `<li>${point}</li>`).join('')}</ul>` : 
                    '<ul><li>First bullet point</li><li>Second bullet point</li></ul>')}
                  onChange={(html) => {
                    updateEditingSlide('content.bulletPointsHtml', html);
                    // Also extract plain text array for backward compatibility
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const listItems = doc.querySelectorAll('li');
                    const bulletPoints = Array.from(listItems).map(li => li.textContent || '').filter(Boolean);
                    updateEditingSlide('content.bulletPoints', bulletPoints);
                  }}
                  placeholder="Enter bullet points..."
                  minHeight="min-h-[120px]"
                  className="border-2 border-dashed border-gray-300"
                  projectId={deckId}
                  context="bullet points"
                  showAiImprove={true}
                />
              </div>

              {/* Call to Action WYSIWYG Editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-600">Call to Action</label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleImproveText('callToAction', content.call_to_action || '', 'call to action')}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600 h-6 px-2"
                    data-testid="button-ai-improve-cta"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Button>
                </div>
                <WysiwygEditor
                  content={content.callToActionHtml || (content.call_to_action ? `<p style="font-weight: bold;">${content.call_to_action}</p>` : '<p style="font-weight: bold;">Enter call to action...</p>')}
                  onChange={(html) => {
                    updateEditingSlide('content.callToActionHtml', html);
                    // Also extract plain text for backward compatibility
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    updateEditingSlide('content.call_to_action', doc.body.textContent || '');
                  }}
                  placeholder="Enter call to action..."
                  minHeight="min-h-[80px]"
                  className="border-2 border-dashed border-green-300"
                  projectId={deckId}
                  context="call to action"
                  showAiImprove={true}
                />
              </div>
            </>
          )}

          {/* Additional Content Blocks */}
          {(slide.type === 'content' || slide.type === 'default') && (
            <>
              {content.metrics && (
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-2 block">Metrics & Numbers</label>
                  <WysiwygEditor
                    content={content.metricsHtml || '<p>Add key metrics and numbers...</p>'}
                    onChange={(html) => {
                      updateEditingSlide('content.metricsHtml', html);
                    }}
                    placeholder="Add key metrics, numbers, statistics..."
                    minHeight="min-h-[100px]"
                    className="border-2 border-dashed border-purple-300"
                  />
                </div>
              )}

              {/* Additional Notes Section */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Additional Notes (Optional)</label>
                <WysiwygEditor
                  content={content.additionalNotesHtml || '<p>Add any additional information...</p>'}
                  onChange={(html) => {
                    updateEditingSlide('content.additionalNotesHtml', html);
                  }}
                  placeholder="Add any additional information..."
                  minHeight="min-h-[80px]"
                  className="border-2 border-dashed border-yellow-300"
                />
              </div>
            </>
          )}

          {/* Editing Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2">WYSIWYG Editing Instructions</h4>
            <div className="text-xs text-blue-700 space-y-1">
              <p>• Use the toolbar to format text with different fonts, colors, sizes, and styles</p>
              <p>• Each text block can have independent formatting</p>
              <p>• Click Save to apply all changes permanently</p>
              <p>• Use the Style panel for overall slide background and theme colors</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main component JSX
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{deckData.title}</h1>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
                {deckData.status}
              </Badge>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto pb-1">
              {!isEditing && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => startEditing(currentSlideData)}
                    disabled={!currentSlideData}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Slide
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowSlideManager(!showSlideManager)}
                  >
                    <Layout className="h-4 w-4 mr-2" />
                    Manage Slides
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={addCustomSlide}
                    disabled={addSlideMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Slide
                  </Button>
                </>
              )}
              {isEditing && (
                <>
                  <Button 
                    size="sm" 
                    onClick={saveSlide}
                    disabled={updateSlideMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateSlideMutation.isPending ? 'Saving...' : 'Save'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={cancelEditing}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowStylePanel(!showStylePanel)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Style
                  </Button>
                </>
              )}
              {!isEditing && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (deckData.pdfUrl) {
                      // Create a proper PDF download
                      const link = document.createElement('a');
                      link.href = deckData.pdfUrl;
                      link.download = `${deckData.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-deck.pdf`;
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      toast({
                        title: "PDF Downloaded",
                        description: "Your pitch deck PDF has been downloaded successfully."
                      });
                    } else {
                      toast({
                        title: "PDF Not Available",
                        description: "This deck was created with the old system. Please regenerate the deck to create a new PDF.",
                        variant: "destructive"
                      });
                    }
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => window.history.back()}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Slide Navigation */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-8">
              <h3 className="font-medium text-gray-900 mb-4">Slides</h3>
              <div className="space-y-2">
                {sortedSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    onClick={() => goToSlide(index)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      currentSlide === index
                        ? "bg-blue-100 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {index + 1}. {slide.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Slide Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col xl:flex-row gap-6">
              {/* Main Slide Display */}
              <div className="flex-1 min-w-0">
                <Card 
                  className="min-h-[500px] w-full" 
                  style={{ 
                    backgroundColor: (isEditing && editingSlide?.styling?.backgroundColor) || currentSlideData?.styling?.backgroundColor || '#ffffff'
                  }}
                >
                  <CardContent className="p-0">
                    {currentSlideData ? (
                      isEditing && editingSlide ? renderEditableSlideContent(editingSlide) : renderSlideContent(currentSlideData)
                    ) : (
                      <div className="text-center py-16 px-6">
                        <p className="text-gray-500">No slide content available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Style Panel */}
              {isEditing && showStylePanel && (
                <div className="w-full xl:w-80 flex-shrink-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Style Options
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Colors */}
                      <div>
                        <h4 className="font-medium mb-3">Colors</h4>
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium">Primary Color</label>
                            <Input
                              type="color"
                              value={editingSlide?.styling?.primaryColor || '#3b82f6'}
                              onChange={(e) => updateEditingSlide('styling.primaryColor', e.target.value)}
                              className="h-10"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Secondary Color</label>
                            <Input
                              type="color"
                              value={editingSlide?.styling?.secondaryColor || '#64748b'}
                              onChange={(e) => updateEditingSlide('styling.secondaryColor', e.target.value)}
                              className="h-10"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Accent Color</label>
                            <Input
                              type="color"
                              value={editingSlide?.styling?.accentColor || '#10b981'}
                              onChange={(e) => updateEditingSlide('styling.accentColor', e.target.value)}
                              className="h-10"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Text Color</label>
                            <Input
                              type="color"
                              value={editingSlide?.styling?.textColor || '#333333'}
                              onChange={(e) => updateEditingSlide('styling.textColor', e.target.value)}
                              className="h-10"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Background Color</label>
                            <Input
                              type="color"
                              value={editingSlide?.styling?.backgroundColor || '#ffffff'}
                              onChange={(e) => updateEditingSlide('styling.backgroundColor', e.target.value)}
                              className="h-10"
                            />
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Typography */}
                      <div>
                        <h4 className="font-medium mb-3">Typography</h4>
                        <div>
                          <label className="text-sm font-medium">Font Family</label>
                          <Select
                            value={editingSlide?.styling?.fontFamily || 'Inter, sans-serif'}
                            onValueChange={(value) => updateEditingSlide('styling.fontFamily', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Inter, sans-serif">Inter</SelectItem>
                              <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                              <SelectItem value="Helvetica, sans-serif">Helvetica</SelectItem>
                              <SelectItem value="Georgia, serif">Georgia</SelectItem>
                              <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
                              <SelectItem value="Courier New, monospace">Courier New</SelectItem>
                              <SelectItem value="Roboto, sans-serif">Roboto</SelectItem>
                              <SelectItem value="Open Sans, sans-serif">Open Sans</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Separator />

                      {/* Section Management */}
                      <div>
                        <h4 className="font-medium mb-3">Sections</h4>
                        <div className="space-y-3">
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addSection('title')}
                            >
                              <Type className="h-4 w-4 mr-1" />
                              Add Title
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addSection('text')}
                            >
                              <Type className="h-4 w-4 mr-1" />
                              Add Text
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addSection('bullet')}
                            >
                              <Type className="h-4 w-4 mr-1" />
                              Add Bullets
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addSection('image')}
                            >
                              <FileImage className="h-4 w-4 mr-1" />
                              Add Image
                            </Button>
                          </div>
                          
                          {/* Section List */}
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {(editingSlide?.content?.sections || [])
                              .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
                              .map((section: any) => (
                                <div key={section.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">{section.order}</span>
                                    <span className="text-sm capitalize">{section.type}</span>
                                    <span className="text-xs text-gray-600 truncate max-w-32">
                                      {section.type === 'image' ? (section.content || 'No image') : (section.content || 'Empty')}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveSectionOrder(section.id, 'up')}
                                    >
                                      <MoveUp className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveSectionOrder(section.id, 'down')}
                                    >
                                      <MoveDown className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeSection(section.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {/* Background Settings */}
                      <div>
                        <h4 className="font-medium mb-3">Background</h4>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Background Color</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={editingSlide?.styling?.backgroundColor || '#ffffff'}
                                onChange={(e) => updateEditingSlide('styling.backgroundColor', e.target.value)}
                                className="w-12 h-10 rounded border border-gray-300"
                              />
                              <Input
                                value={editingSlide?.styling?.backgroundColor || '#ffffff'}
                                onChange={(e) => updateEditingSlide('styling.backgroundColor', e.target.value)}
                                placeholder="#ffffff"
                                className="flex-1"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateEditingSlide('styling.backgroundColor', '#ffffff')}
                              >
                                Reset
                              </Button>
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-2 block">Upload Background Image</label>
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={5242880} // 5MB
                              onGetUploadParameters={async () => {
                                const response = await fetch('/api/objects/upload', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' }
                                });
                                const data = await response.json();
                                return {
                                  method: 'PUT' as const,
                                  url: data.uploadURL
                                };
                              }}
                              onComplete={(result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                                if (result.successful && result.successful[0]) {
                                  const uploadedFile = result.successful[0];
                                  const imageUrl = uploadedFile.uploadURL;
                                  
                                  // Update the background image with the uploaded URL
                                  updateEditingSlide('styling.backgroundImage', imageUrl);
                                  
                                  toast({
                                    title: "Background image uploaded",
                                    description: "Your background image has been uploaded successfully.",
                                  });
                                }
                              }}
                              buttonClassName="w-full"
                            >
                              <div className="flex items-center gap-2">
                                <Image className="h-4 w-4" />
                                <span>Upload Background Image</span>
                              </div>
                            </ObjectUploader>
                          </div>
                          
                          <div className="text-xs text-gray-500 text-center">OR</div>
                          
                          <div>
                            <label className="text-sm font-medium">Background Image URL</label>
                            <Input
                              value={editingSlide?.styling?.backgroundImage || ''}
                              onChange={(e) => updateEditingSlide('styling.backgroundImage', e.target.value)}
                              placeholder="https://example.com/image.jpg"
                            />
                          </div>
                          
                          {editingSlide?.styling?.backgroundImage && (
                            <div className="mt-3">
                              <label className="text-sm font-medium mb-2 block">Preview</label>
                              <div 
                                className="w-full h-24 rounded-lg border bg-cover bg-center bg-no-repeat"
                                style={{ 
                                  backgroundImage: `url(${editingSlide.styling.backgroundImage})`,
                                  backgroundColor: editingSlide?.styling?.backgroundColor || '#f3f4f6'
                                }}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateEditingSlide('styling.backgroundImage', '')}
                                className="mt-2 w-full"
                              >
                                Remove Background Image
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={prevSlide} 
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {currentSlide + 1} of {sortedSlides.length}
                </span>
              </div>
              
              <Button 
                variant="outline" 
                onClick={nextSlide} 
                disabled={currentSlide === sortedSlides.length - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Slide Manager Modal */}
          {showSlideManager && (
            <Dialog open={showSlideManager} onOpenChange={setShowSlideManager}>
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Manage Slides</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {sortedSlides.map((slide, index) => (
                    <div key={slide.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium">{index + 1}</span>
                        <div>
                          <h4 className="font-medium">{slide.title}</h4>
                          <p className="text-sm text-gray-600">{slide.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (index > 0) {
                              const reorderedSlides = [...sortedSlides];
                              [reorderedSlides[index], reorderedSlides[index - 1]] = 
                                [reorderedSlides[index - 1], reorderedSlides[index]];
                              const slideOrders = reorderedSlides.map((s, i) => ({ slideId: s.id, order: i }));
                              reorderSlidesMutation.mutate(slideOrders);
                            }
                          }}
                          disabled={index === 0}
                        >
                          <MoveUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (index < sortedSlides.length - 1) {
                              const reorderedSlides = [...sortedSlides];
                              [reorderedSlides[index], reorderedSlides[index + 1]] = 
                                [reorderedSlides[index + 1], reorderedSlides[index]];
                              const slideOrders = reorderedSlides.map((s, i) => ({ slideId: s.id, order: i }));
                              reorderSlidesMutation.mutate(slideOrders);
                            }
                          }}
                          disabled={index === sortedSlides.length - 1}
                        >
                          <MoveDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowSlideManager(false);
                            goToSlide(index);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this slide?')) {
                              deleteSlideMutation.mutate(slide.id);
                            }
                          }}
                          disabled={sortedSlides.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  );
}