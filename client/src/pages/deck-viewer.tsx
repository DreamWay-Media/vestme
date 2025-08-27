import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Trash2, Edit3, Save, X, Eye } from "lucide-react";
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
  // AI-generated colors (from the generate deck process)
  backgroundColor?: string;
  textColor?: string;
  styling?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    fontFamily?: string;
    fontSize?: string;
    titleFontSize?: string;
    descriptionFontSize?: string;
    bulletFontSize?: string;
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

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: deck, isLoading: deckLoading, error } = useQuery({
    queryKey: [`/api/decks/${deckId}`],
    retry: false,
    enabled: !!deckId && isAuthenticated,
  }) as { data: Deck | undefined, isLoading: boolean, error: any };

  // Fetch brand kit information for styling
  const { data: brandKits } = useQuery({
    queryKey: ["/api/projects", deck?.projectId, "brand-kits"],
    enabled: !!deck && !!deck.projectId && isAuthenticated,
  }) as { data: any[] };

  // Debug: Log brand kits and deck data
  console.log('DeckViewer - Brand kits fetched:', brandKits);
  console.log('DeckViewer - Deck data:', deck);

  // Mutation for updating slides
  const updateSlideMutation = useMutation({
    mutationFn: async (updates: { slideId: string; updates: Partial<Slide> }) => {
      return await apiRequest("PUT", `/api/decks/${deckId}/slides/${updates.slideId}`, updates.updates);
    },
    onSuccess: () => {
      // Aggressively invalidate and refetch all related queries
      console.log('Invalidating queries for slide update...');
      queryClient.invalidateQueries({ queryKey: [`/api/decks/${deckId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", deck?.projectId, "decks"] });
      
      // Also invalidate any project-specific queries that might contain deck data
      if (deck?.projectId) {
        queryClient.invalidateQueries({ queryKey: ["/api/projects", deck.projectId] });
        queryClient.invalidateQueries({ queryKey: ["/api/projects", deck.projectId, "decks"] });
        console.log('Invalidated project queries for:', deck.projectId);
      }
      
            // Force refetch to ensure immediate updates
      setTimeout(() => {
        console.log('Refetching queries for immediate updates...');
        
        // Force refetch the specific deck
      queryClient.refetchQueries({ queryKey: [`/api/decks/${deckId}`] });
        
        // Force refetch project decks with exact matching
        if (deck?.projectId) {
          console.log('Refetching project decks for project:', deck.projectId);
          queryClient.refetchQueries({ 
            queryKey: ["/api/projects", deck.projectId, "decks"],
            exact: true 
          });
          
          // Also refetch project data
          queryClient.refetchQueries({ 
            queryKey: ["/api/projects", deck.projectId],
            exact: true 
          });
        }
        
        // Additional force refresh for any cached data
        queryClient.resetQueries({ queryKey: ["/api/projects", deck?.projectId, "decks"] });
        
        // Force a complete cache clear for this project's data
        if (deck?.projectId) {
          console.log('Clearing cache for project:', deck.projectId);
          queryClient.removeQueries({ queryKey: ["/api/projects", deck.projectId, "decks"] });
          queryClient.removeQueries({ queryKey: ["/api/projects", deck.projectId] });
        }
        
        // Force a complete refresh of all related data
        queryClient.invalidateQueries({ 
          queryKey: ["/api/projects"], 
          predicate: (query) => {
            const queryKey = query.queryKey;
            return Array.isArray(queryKey) && 
                   queryKey.length >= 2 && 
                   queryKey[0] === "/api/projects" && 
                   queryKey[1] === deck?.projectId;
          }
        });
        
        // Log the current state for debugging
        console.log('Current deck data after update:', deck);
        console.log('Current editing slide data:', editingSlide);
      }, 100);
      
      // Exit editing mode
      setIsEditing(false);
      setEditingSlide(null);
      
      toast({
        title: "Slide Updated",
        description: "Slide has been updated successfully. If changes don't appear in generate deck, try refreshing that page.",
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
        title: "Update Failed",
        description: "Failed to update slide. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting slides
  const deleteSlideMutation = useMutation({
    mutationFn: async (slideId: string) => {
      return await apiRequest("DELETE", `/api/decks/${deckId}/slides/${slideId}`);
    },
    onSuccess: () => {
      // Aggressively invalidate and refetch all related queries
      queryClient.invalidateQueries({ queryKey: [`/api/decks/${deckId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", deck?.projectId, "decks"] });
      
      // Small delay to ensure server has processed the deletion
      setTimeout(() => {
        // Force refetch the deck data immediately
        queryClient.refetchQueries({ queryKey: [`/api/decks/${deckId}`] });
        
        // Also refetch the project decks to ensure generate deck preview updates
        if (deck?.projectId) {
          queryClient.refetchQueries({ queryKey: ["/api/projects", deck.projectId, "decks"] });
        }
      }, 100);
      
      // Reset to first slide after deletion to avoid index issues
      setCurrentSlide(0);
        
        toast({
        title: "Slide Deleted",
        description: "Slide has been removed successfully.",
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
        title: "Delete Failed",
        description: "Failed to delete slide. Please try again.",
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
        window.location.href = "/";
      }, 500);
    }
  }, [error, toast]);

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
  
  // Debug: Log slides data for troubleshooting
  console.log('DeckViewer - Current slides:', {
    totalSlides: slides.length,
    sortedSlides: sortedSlides.length,
    currentSlide,
    slideIds: sortedSlides.map(s => ({ id: s.id, title: s.title, order: s.order }))
  });

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

  const startEditing = (slide: Slide) => {
    // Ensure content structure exists and is properly initialized
    const slideWithContent = {
      ...slide,
      content: {
        description: slide.content?.description || slide.content?.content?.description || '',
        bullets: Array.isArray(slide.content?.bullets) 
          ? [...slide.content.bullets] 
          : Array.isArray(slide.content?.content?.bullets)
            ? [...slide.content.content.bullets]
            : []
      },
      styling: {
        // Initialize styling object with AI-generated font sizes or sensible defaults
        fontFamily: slide.styling?.fontFamily || brandKits?.[0]?.fontFamily || 'Inter',
        fontSize: slide.styling?.fontSize || 'medium',
        titleFontSize: slide.styling?.titleFontSize || '3xl', // AI default: large impact
        descriptionFontSize: slide.styling?.descriptionFontSize || 'lg', // AI default: clear readability
        bulletFontSize: slide.styling?.bulletFontSize || 'base', // AI default: comfortable reading
        // Preserve existing styling properties
        ...slide.styling
      }
    };
    
    console.log('Starting to edit slide:', {
      original: slide,
      prepared: slideWithContent,
      contentKeys: Object.keys(slide.content || {}),
      nestedContentKeys: slide.content?.content ? Object.keys(slide.content.content) : 'none',
      stylingObject: slideWithContent.styling
    });
    
    setIsEditing(true);
    setEditingSlide(slideWithContent);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditingSlide(null);
  };

  const saveSlide = () => {
    if (editingSlide) {
      console.log('Saving slide with data:', editingSlide);
      console.log('Styling being saved:', editingSlide.styling);
      console.log('Font family in styling:', editingSlide.styling?.fontFamily);
      console.log('Title font size in styling:', editingSlide.styling?.titleFontSize);
      console.log('Description font size in styling:', editingSlide.styling?.descriptionFontSize);
      console.log('Bullet font size in styling:', editingSlide.styling?.bulletFontSize);
      console.log('Background color:', editingSlide.backgroundColor);
      console.log('Text color:', editingSlide.textColor);
      
      // Log exactly what we're sending to the server
      const updatesToSend = {
        slideId: editingSlide.id,
        updates: editingSlide
      };
      
      console.log('Sending to server:', updatesToSend);
      console.log('Updates object contains:', {
        title: editingSlide.title,
        content: editingSlide.content,
        styling: editingSlide.styling,
        backgroundColor: editingSlide.backgroundColor,
        textColor: editingSlide.textColor
      });
      
      updateSlideMutation.mutate(updatesToSend);
    }
  };

  const updateEditingSlide = (field: keyof Slide, value: any) => {
    if (editingSlide) {
      let updated;
      
      // Special handling for styling updates to merge properly
      if (field === 'styling') {
        updated = {
          ...editingSlide,
          styling: {
            ...editingSlide.styling, // Preserve existing styling
            ...value // Merge new styling values
          }
        };
        console.log('Styling update - Font family:', value.fontFamily, 'Font size:', value.fontSize);
        console.log('Full styling object after merge:', updated.styling);
      } else {
        // Handle other fields normally
        updated = {
          ...editingSlide,
          [field]: value
        };
        
        // Special logging for color updates
        if (field === 'backgroundColor' || field === 'textColor') {
          console.log(`${field} updated to:`, value);
          console.log('Updated slide now has:', {
            backgroundColor: updated.backgroundColor,
            textColor: updated.textColor
          });
        }
      }
      
      console.log('Updating editing slide:', {
        field,
        value,
        before: editingSlide,
        after: updated
      });
      
      setEditingSlide(updated);
    }
  };

  const handleDeleteSlide = (slideId: string, slideIndex: number) => {
    if (sortedSlides.length <= 1) {
      toast({
        title: "Cannot Delete",
        description: "At least one slide must remain in the deck.",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete slide ${slideIndex + 1}?`)) {
      deleteSlideMutation.mutate(slideId);
    }
  };

  const currentSlideData = sortedSlides[currentSlide];

    // Render editable slide content when in editing mode
  const renderEditableSlideContent = (slide: Slide) => {
    return (
      <div className="w-full bg-white rounded-lg border shadow-sm">
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Slide Title</label>
            <input
              type="text"
              value={editingSlide?.title || ''}
              onChange={(e) => updateEditingSlide('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
              placeholder="Enter slide title..."
            />
          </div>

          {/* Content Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={editingSlide?.content?.description || ''}
              onChange={(e) => updateEditingSlide('content', {
                ...editingSlide?.content,
                description: e.target.value
              })}
              className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Enter slide description..."
            />
          </div>



          {/* Font Settings */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">Font Family</label>
              <select
                value={editingSlide?.styling?.fontFamily || brandKits?.[0]?.fontFamily || 'Inter'}
                onChange={(e) => updateEditingSlide('styling', {
                  ...editingSlide?.styling,
                  fontFamily: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Inter">Inter (Modern)</option>
                <option value="Roboto">Roboto (Clean)</option>
                <option value="Open Sans">Open Sans (Readable)</option>
                <option value="Lato">Lato (Friendly)</option>
                <option value="Poppins">Poppins (Geometric)</option>
                <option value="Montserrat">Montserrat (Elegant)</option>
                <option value="Source Sans Pro">Source Sans Pro (Professional)</option>
                <option value="Raleway">Raleway (Sleek)</option>
                <option value="Ubuntu">Ubuntu (Modern)</option>
                <option value="Nunito">Nunito (Rounded)</option>
                <option value="Arial">Arial (System)</option>
                <option value="Helvetica">Helvetica (Classic)</option>
                <option value="Georgia">Georgia (Serif)</option>
                <option value="Times New Roman">Times New Roman (Traditional)</option>
              </select>
                      </div>
            
            {/* Element-specific Font Sizes */}
            <div className="grid grid-cols-3 gap-3">
          <div>
                <label className="text-xs font-medium text-gray-600 mb-1">Title Size</label>
                <select
                  value={editingSlide?.styling?.titleFontSize || '3xl'}
                  onChange={(e) => updateEditingSlide('styling', {
                    ...editingSlide?.styling,
                    titleFontSize: e.target.value
                  })}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="lg">Large</option>
                  <option value="xl">XL</option>
                  <option value="2xl">2XL</option>
                  <option value="3xl">3XL</option>
                  <option value="4xl">4XL</option>
                  <option value="5xl">5XL</option>
                </select>
          </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1">Desc Size</label>
                <select
                  value={editingSlide?.styling?.descriptionFontSize || 'lg'}
                  onChange={(e) => updateEditingSlide('styling', {
                    ...editingSlide?.styling,
                    descriptionFontSize: e.target.value
                  })}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="sm">Small</option>
                  <option value="base">Base</option>
                  <option value="lg">Large</option>
                  <option value="xl">XL</option>
                  <option value="2xl">2XL</option>
                </select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1">Bullet Size</label>
                <select
                  value={editingSlide?.styling?.bulletFontSize || 'base'}
                  onChange={(e) => updateEditingSlide('styling', {
                    ...editingSlide?.styling,
                    bulletFontSize: e.target.value
                  })}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="sm">Small</option>
                  <option value="base">Base</option>
                  <option value="lg">Large</option>
                  <option value="xl">XL</option>
                </select>
                      </div>
                  </div>
              </div>

                    {/* Color Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Slide Colors</h4>
            
            {/* Brand Kit Colors - These control the slide appearance */}
                          <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                  <input
                    type="color"
                    value={editingSlide?.styling?.primaryColor || editingSlide?.textColor || brandKits?.[0]?.primaryColor || '#3b82f6'}
                    onChange={(e) => {
                      console.log('Primary color changed to:', e.target.value);
                      updateEditingSlide('styling', {
                        ...editingSlide?.styling,
                        primaryColor: e.target.value
                      });
                    }}
                    className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                  <input
                    type="color"
                    value={editingSlide?.styling?.secondaryColor || editingSlide?.backgroundColor || brandKits?.[0]?.secondaryColor || '#64748b'}
                    onChange={(e) => {
                      console.log('Secondary color changed to:', e.target.value);
                      updateEditingSlide('styling', {
                        ...editingSlide?.styling,
                        secondaryColor: e.target.value
                      });
                    }}
                    className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                  <input
                    type="color"
                    value={editingSlide?.styling?.accentColor || brandKits?.[0]?.accentColor || '#10b981'}
                    onChange={(e) => {
                      console.log('Accent color changed to:', e.target.value);
                      updateEditingSlide('styling', {
                        ...editingSlide?.styling,
                        accentColor: e.target.value
                      });
                    }}
                    className="w-full h-10 border border-gray-300 rounded-md cursor-pointer"
                  />
                </div>
              </div>

                        

            {/* Reset to Brand Kit Colors */}
            <div className="pt-2 border-t border-gray-200">
                  <Button
                type="button"
                    variant="outline"
                    size="sm"
                onClick={() => {
                  if (brandKits?.[0]) {
                    updateEditingSlide('styling', {
                      ...editingSlide?.styling,
                      primaryColor: brandKits[0].primaryColor,
                      secondaryColor: brandKits[0].secondaryColor,
                      accentColor: brandKits[0].accentColor
                    });
                    toast({
                      title: "Colors Reset",
                      description: "Restored original brand kit colors",
                    });
                  }
                }}
                className="w-full"
              >
                Reset to Brand Kit Colors
                  </Button>
                </div>
              </div>

          {/* Bullet Points */}
                <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bullet Points ({editingSlide?.content?.bullets?.length || 0})
            </label>
            <div className="space-y-2">
              {Array.isArray(editingSlide?.content?.bullets) && editingSlide.content.bullets.map((bullet: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={bullet}
                    onChange={(e) => {
                      const newBullets = [...(editingSlide?.content?.bullets || [])];
                      newBullets[index] = e.target.value;
                      updateEditingSlide('content', {
                        ...editingSlide?.content,
                        bullets: newBullets
                      });
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Bullet point ${index + 1}`}
                  />
                  <button
                    onClick={() => {
                      const newBullets = editingSlide?.content?.bullets?.filter((_: string, i: number) => i !== index) || [];
                      updateEditingSlide('content', {
                        ...editingSlide?.content,
                        bullets: newBullets
                      });
                    }}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              
              {/* Show message when no bullets exist */}
              {(!editingSlide?.content?.bullets || editingSlide.content.bullets.length === 0) && (
                <div className="text-sm text-gray-500 text-center py-2">
                  No bullet points yet. Click the button below to add your first one.
              </div>
              )}
              
              <button
                onClick={() => {
                  const currentBullets = editingSlide?.content?.bullets || [];
                  const newBullets = [...currentBullets, 'New bullet point'];
                  updateEditingSlide('content', {
                    ...editingSlide?.content,
                    bullets: newBullets
                  });
                  
                  console.log('Added bullet point:', {
                    before: currentBullets,
                    after: newBullets
                  });
                }}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
              >
                + Add Bullet Point
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Use shared slide renderer for exact consistency with generate deck preview
  const renderSlideContent = (slide: Slide, isEditingMode: boolean = false) => {
    // Apply the same styling enhancement as SlidePreview in generate deck
    const slideWithStyling = {
      ...slide,
      styling: {
        // Use saved styling colors first, then AI-generated colors, then fall back to brand kit colors
        backgroundColor: slide.styling?.backgroundColor || slide.backgroundColor || brandKits?.[0]?.secondaryColor || '#ffffff',
        textColor: slide.styling?.textColor || slide.textColor || brandKits?.[0]?.primaryColor || '#333333',
        
        // Brand kit colors (available for creative use) - prioritize saved styling over AI colors
        primaryColor: slide.styling?.primaryColor || slide.textColor || brandKits?.[0]?.primaryColor || '#3b82f6',
        secondaryColor: slide.styling?.secondaryColor || slide.backgroundColor || brandKits?.[0]?.secondaryColor || '#64748b',
        accentColor: slide.styling?.accentColor || brandKits?.[0]?.accentColor || '#10b981',
        
        // Additional styling - prioritize slide styling over brand kit defaults
        fontFamily: slide.styling?.fontFamily || brandKits?.[0]?.fontFamily || 'Inter',
        fontSize: slide.styling?.fontSize || 'medium',
        titleFontSize: slide.styling?.titleFontSize || '3xl', // AI default: large impact
        descriptionFontSize: slide.styling?.descriptionFontSize || 'lg', // AI default: clear readability
        bulletFontSize: slide.styling?.bulletFontSize || 'base', // AI default: comfortable reading
        logoUrl: brandKits?.[0]?.logoUrl || slide.styling?.logoUrl,
        
        // Make all brand colors available for creative use
        brandColors: {
          primary: slide.styling?.primaryColor || slide.textColor || brandKits?.[0]?.primaryColor || '#3b82f6',
          secondary: slide.styling?.secondaryColor || slide.backgroundColor || brandKits?.[0]?.secondaryColor || '#64748b',
          accent: slide.styling?.accentColor || brandKits?.[0]?.accentColor || '#10b981'
        }
      }
    };

    // Debug: Log the styling being applied
    console.log('DeckViewer - Slide styling:', {
      originalSlide: slide,
      brandKits: brandKits,
      enhancedStyling: slideWithStyling.styling,
      slideStyling: slide.styling,
      isEditingMode: isEditingMode,
      aiFontSizes: {
        titleFontSize: slide.styling?.titleFontSize,
        descriptionFontSize: slide.styling?.descriptionFontSize,
        bulletFontSize: slide.styling?.bulletFontSize
      }
    });
    
    // Additional debugging for styling properties
    if (isEditingMode) {
      console.log('Editing mode - Styling details:', {
        fontFamily: slide.styling?.fontFamily,
        titleFontSize: slide.styling?.titleFontSize,
        descriptionFontSize: slide.styling?.descriptionFontSize,
        bulletFontSize: slide.styling?.bulletFontSize,
        backgroundColor: slide.backgroundColor,
        textColor: slide.textColor
      });
    }

    // Use the exact same container structure as generate deck preview
    return (
      <div className="relative overflow-hidden rounded border w-full h-full min-h-[500px] flex items-center justify-center">
        <div className="w-full h-full flex items-center justify-center">
          <SlideRenderer slide={slideWithStyling} isCompact={false} />
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
              {!isEditing ? (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => startEditing(currentSlideData)}
                    disabled={!currentSlideData}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Slide
                  </Button>
              ) : (
                <div className="flex items-center space-x-2">
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
                </div>
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
                  <div
                    key={slide.id}
                    className={cn(
                      "flex items-center justify-between group",
                      currentSlide === index
                        ? isEditing 
                          ? "bg-green-100 border-2 border-green-300 rounded-md" // Highlight editing slide
                          : "bg-blue-100 rounded-md" // Normal current slide
                        : "hover:bg-gray-100 rounded-md"
                    )}
                  >
                    <button
                      onClick={() => !isEditing && goToSlide(index)} // Disable navigation when editing
                      disabled={isEditing} // Disable button when editing
                      className={cn(
                        "flex-1 text-left px-3 py-2 text-sm transition-colors",
                        currentSlide === index
                          ? isEditing
                            ? "text-green-800 font-bold cursor-default" // Editing slide styling
                            : "text-blue-700 font-medium" // Normal current slide
                          : isEditing
                            ? "text-gray-400 cursor-not-allowed" // Disabled when editing
                            : "text-gray-600" // Normal styling
                    )}
                  >
                    {index + 1}. {slide.title}
                      {isEditing && currentSlide === index && (
                        <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                          Editing
                        </span>
                      )}
                  </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlide(slide.id, index);
                      }}
                      className={cn(
                        "p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100",
                        currentSlide === index ? "opacity-100" : ""
                      )}
                      title="Delete slide"
                      disabled={deleteSlideMutation.isPending || isEditing} // Disable delete when editing
                    >
                      {deleteSlideMutation.isPending ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-500" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Slide Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col xl:flex-row gap-6 w-full">
              {/* Main Slide Display */}
              <div className="flex-1 min-w-0">
                <div className="w-full max-w-none">
                    {currentSlideData ? (
                    isEditing ? (
                      <div className="w-full">
                                                {/* Side-by-side editing layout */}
                        <div className="grid grid-cols-1 xl:grid-cols-8 gap-8">
                          {/* Live Preview - Takes up 4/8 of the space */}
                          <div className="xl:col-span-4">
                            <div className="p-6 bg-gray-50 rounded-lg border h-full">
                              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Eye className="h-5 w-5 text-blue-600" />
                                Live Preview
                              </h4>
                              <div className="w-full h-[500px]">
                                {editingSlide && renderSlideContent(editingSlide, true)}
                              </div>
                              <p className="text-xs text-gray-500 text-center mt-3">
                                This is how your slide will look with the current changes
                              </p>
                            </div>
                          </div>
                          
                          {/* Editing Form - Takes up 4/8 of the space */}
                          <div className="xl:col-span-4">
                            {renderEditableSlideContent(currentSlideData)}
                          </div>
                        </div>
                          </div>
                    ) : (
                      renderSlideContent(currentSlideData)
                    )
                  ) : (
                    <div className="text-center py-16 px-6">
                      <p className="text-gray-500">No slide content available</p>
                            </div>
                          )}
                        </div>
                      </div>
            </div>

            {/* Navigation Controls - Only show when not editing */}
            {!isEditing && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}