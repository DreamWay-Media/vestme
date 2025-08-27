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
  // Drag and drop positioning
  positionedElements?: {
    title?: { x: number; y: number; width?: number; height?: number };
    description?: { x: number; y: number; width?: number; height?: number };
    bullets?: { x: number; y: number; width?: number; height?: number };
    logo?: { x: number; y: number; width?: number; height?: number };
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
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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

  // Debug: Log deck data to see if positionedElements are present
  useEffect(() => {
    if (deck) {
      console.log('=== DECK DATA RECEIVED FROM SERVER ===');
      console.log('Deck data received from server:', deck);
      console.log('Slides with positioning data:', deck.slides?.map(slide => ({
        id: slide.id,
        title: slide.title,
        hasPositioning: !!slide.positionedElements,
        positionedElements: slide.positionedElements,
        positionedElementsKeys: slide.positionedElements ? Object.keys(slide.positionedElements) : []
      })));
    }
  }, [deck]);

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
    onSuccess: (data) => {
      // Aggressively invalidate and refetch all related queries
      console.log('=== MUTATION SUCCESS DEBUG ===');
      console.log('Data returned from server:', data);
      console.log('Current editing slide data:', editingSlide);
      console.log('Positioned elements that were saved:', editingSlide?.positionedElements);
      
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
        description: "Slide content, styling, and positioning have been saved successfully. Changes will appear in both deck view and PDF export.",
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
    // Get the most current slide data from the deck to ensure we have the latest changes
    const currentSlideData = deck?.slides?.find(s => s.id === slide.id) || slide;
    
    // Ensure content structure exists and is properly initialized
    const slideWithContent = {
      ...currentSlideData,
      content: {
        // Handle both old single title and new multiple titles format
        titles: currentSlideData.content?.titles || (currentSlideData.title ? [currentSlideData.title] : []),
        // Handle both old single description and new multiple descriptions format
        descriptions: currentSlideData.content?.descriptions || (currentSlideData.content?.description ? [currentSlideData.content.description] : []),
        // Handle both old single logo and new multiple logos format
        logos: currentSlideData.content?.logos || (currentSlideData.styling?.logoUrl ? [currentSlideData.styling.logoUrl] : (brandKits?.[0]?.logoUrl ? [brandKits[0].logoUrl] : [])),
        bullets: Array.isArray(currentSlideData.content?.bullets) 
          ? [...currentSlideData.content.bullets] 
          : Array.isArray(currentSlideData.content?.content?.bullets)
            ? [...currentSlideData.content.content.bullets]
            : []
      },
      styling: {
        // Initialize styling object with AI-generated font sizes or sensible defaults
        fontFamily: currentSlideData.styling?.fontFamily || brandKits?.[0]?.fontFamily || 'Inter',
        fontSize: currentSlideData.styling?.fontSize || 'medium',
        titleFontSize: currentSlideData.styling?.titleFontSize || '3xl', // AI default: large impact
        descriptionFontSize: currentSlideData.styling?.descriptionFontSize || 'lg', // AI default: clear readability
        bulletFontSize: currentSlideData.styling?.bulletFontSize || 'base', // AI default: comfortable reading
        // Preserve existing styling properties
        ...currentSlideData.styling
      },
      // Initialize positionedElements as empty object if it doesn't exist
      positionedElements: currentSlideData.positionedElements || {}
    };
    
    console.log('Starting to edit slide:', {
      original: slide,
      currentSlideData: currentSlideData,
      prepared: slideWithContent,
      contentKeys: Object.keys(currentSlideData.content || {}),
      nestedContentKeys: currentSlideData.content?.content ? Object.keys(currentSlideData.content.content) : 'none',
      stylingObject: slideWithContent.styling,
      positionedElements: slideWithContent.positionedElements,
      titles: slideWithContent.content.titles,
      descriptions: slideWithContent.content.descriptions,
      logos: slideWithContent.content.logos,
      brandKitLogo: brandKits?.[0]?.logoUrl
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
      console.log('=== SAVE SLIDE DEBUG ===');
      console.log('Editing slide before save:', editingSlide);
      console.log('Positioned elements before save:', editingSlide.positionedElements);
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
      
      console.log('=== DATA BEING SENT TO SERVER ===');
      console.log('Sending to server:', updatesToSend);
      console.log('Updates object contains:', {
        title: editingSlide.title,
        content: editingSlide.content,
        styling: editingSlide.styling,
        backgroundColor: editingSlide.backgroundColor,
        textColor: editingSlide.textColor,
        positionedElements: editingSlide.positionedElements
      });
      console.log('Full updatesToSend object:', updatesToSend);
      
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
      } else if (field === 'positionedElements') {
        // Special handling for positioned elements to merge properly
        updated = {
          ...editingSlide,
          positionedElements: {
            ...editingSlide.positionedElements, // Preserve existing positioning
            ...value // Merge new positioning values
          }
        };
        console.log('=== POSITIONING UPDATE DEBUG ===');
        console.log('Field being updated:', field);
        console.log('New positioning value:', value);
        console.log('Existing positionedElements:', editingSlide.positionedElements);
        console.log('Merged positionedElements:', updated.positionedElements);
        console.log('Positioning update - Element positions:', value);
        console.log('Full positioned elements after merge:', updated.positionedElements);
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
      
      // Debug: Log the state update
      if (field === 'positionedElements') {
        console.log('=== STATE UPDATE DEBUG ===');
        console.log('Field updated:', field);
        console.log('New value:', value);
        console.log('Updated slide positionedElements:', updated.positionedElements);
        console.log('State will be updated to:', updated);
      }
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

  // Drag and drop handlers
  const handleMouseDown = (e: React.MouseEvent, elementType: string) => {
    if (!editingSlide) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDraggedElement(elementType);
    setIsDragging(true);
    setDragOffset({ x: offsetX, y: offsetY });
    
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedElement || !editingSlide) return;
    
    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;
    
    // Constrain to container bounds
    const constrainedX = Math.max(0, Math.min(x, rect.width - 100));
    const constrainedY = Math.max(0, Math.min(y, rect.height - 50));
    
    const newPosition = { x: constrainedX, y: constrainedY };
    
    console.log('=== DRAG UPDATE DEBUG ===');
    console.log('Dragging element:', draggedElement, 'to position:', newPosition);
    console.log('Current editingSlide positionedElements:', editingSlide.positionedElements);
    
    updateEditingSlide('positionedElements', {
      ...editingSlide.positionedElements,
      [draggedElement]: newPosition
    });
    
    console.log('After updateEditingSlide call - editingSlide positionedElements:', editingSlide.positionedElements);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedElement(null);
  };

  const handleDeleteElement = (elementType: string) => {
    if (!editingSlide) return;
    
    console.log('Deleting element:', elementType, 'from positioned elements');
    
    const newPositionedElements = { ...editingSlide.positionedElements };
    delete newPositionedElements[elementType as keyof typeof newPositionedElements];
    
    console.log('New positioned elements after deletion:', newPositionedElements);
    
    updateEditingSlide('positionedElements', newPositionedElements);
    
    toast({
      title: "Element Removed",
      description: `${elementType.charAt(0).toUpperCase() + elementType.slice(1)} has been removed from the slide.`,
    });
  };

  const currentSlideData = sortedSlides[currentSlide];

  // Debug: Log current slide data specifically
  if (currentSlideData) {
    console.log('=== CURRENT SLIDE DATA ===');
    console.log('Current slide:', currentSlideData);
    console.log('Current slide positionedElements:', currentSlideData.positionedElements);
    console.log('Current slide positionedElements keys:', currentSlideData.positionedElements ? Object.keys(currentSlideData.positionedElements) : []);
  }

    // Render editable slide content when in editing mode
  const renderEditableSlideContent = (slide: Slide) => {
    return (
      <div className="w-full bg-white rounded-lg border shadow-sm">
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Logo Management */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logos ({editingSlide?.content?.logos?.length || 0})
            </label>
            <div className="space-y-2">
              {/* Handle both old single logo and new multiple logos */}
              {(() => {
                const logos = editingSlide?.content?.logos || [];
                const hasOldLogo = editingSlide?.styling?.logoUrl && logos.length === 0;
                
                // If we have an old logo, convert it to new format automatically
                if (hasOldLogo) {
                  // Convert old single logo to new format
                  updateEditingSlide('content', {
                    ...editingSlide?.content,
                    logos: [editingSlide.styling?.logoUrl || '']
                  });
                  // Also clear the old logo field
                  updateEditingSlide('styling', {
                    ...editingSlide?.styling,
                    logoUrl: undefined
                  });
                  return null; // Don't render anything while converting
                }
                
                // Show multiple logos
                return logos.map((logoUrl: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="flex-1 flex items-center space-x-2">
                      <img 
                        src={logoUrl} 
                        alt={`Logo ${index + 1}`} 
                        className="h-8 w-8 object-contain border rounded"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <input
                        type="text"
                        value={logoUrl}
                        onChange={(e) => {
                          const newLogos = [...logos];
                          newLogos[index] = e.target.value;
                          updateEditingSlide('content', {
                            ...editingSlide?.content,
                            logos: newLogos
                          });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder={`Logo URL ${index + 1}`}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const newLogos = logos.filter((_: string, i: number) => i !== index);
                        updateEditingSlide('content', {
                          ...editingSlide?.content,
                          logos: newLogos
                        });
                      }}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ));
              })()}
              
              {/* Show message when no logos exist */}
              {(!editingSlide?.content?.logos || editingSlide.content.logos.length === 0) && (
                <div className="text-sm text-gray-500 text-center py-2">
                  No logos yet. Click the button below to add your first one.
                </div>
              )}
              
              <button
                onClick={() => {
                  const currentLogos = editingSlide?.content?.logos || [];
                  const newLogos = [...currentLogos, 'https://example.com/logo.png'];
                  updateEditingSlide('content', {
                    ...editingSlide?.content,
                    logos: newLogos
                  });
                  
                  console.log('Added logo:', {
                    before: currentLogos,
                    after: newLogos
                  });
                }}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
              >
                + Add Logo
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titles ({editingSlide?.content?.titles?.length || (editingSlide?.title ? 1 : 0)})
            </label>
            <div className="space-y-2">
              {/* Handle both old single title and new multiple titles */}
              {(() => {
                const titles = editingSlide?.content?.titles || [];
                const hasOldTitle = editingSlide?.title && titles.length === 0;
                
                // If we have an old title, convert it to new format automatically
                if (hasOldTitle) {
                  // Convert old single title to new format
                  updateEditingSlide('content', {
                    ...editingSlide?.content,
                    titles: [editingSlide.title]
                  });
                  // Also clear the old title field
                  updateEditingSlide('title', '');
                  return null; // Don't render anything while converting
                }
                
                // Show multiple titles
                return titles.map((title: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => {
                        const newTitles = [...titles];
                        newTitles[index] = e.target.value;
                        updateEditingSlide('content', {
                          ...editingSlide?.content,
                          titles: newTitles
                        });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                      placeholder={`Title ${index + 1}`}
                    />
                    <button
                      onClick={() => {
                        const newTitles = titles.filter((_: string, i: number) => i !== index);
                        updateEditingSlide('content', {
                          ...editingSlide?.content,
                          titles: newTitles
                        });
                      }}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ));
              })()}
              
              {/* Show message when no titles exist */}
              {(!editingSlide?.content?.titles || editingSlide.content.titles.length === 0) && 
               !editingSlide?.title && (
                <div className="text-sm text-gray-500 text-center py-2">
                  No titles yet. Click the button below to add your first one.
                </div>
              )}
              
              <button
                onClick={() => {
                  const currentTitles = editingSlide?.content?.titles || [];
                  const newTitles = [...currentTitles, 'New title'];
                  updateEditingSlide('content', {
                    ...editingSlide?.content,
                    titles: newTitles
                  });
                  
                  console.log('Added title:', {
                    before: currentTitles,
                    after: newTitles
                  });
                }}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
              >
                + Add Title
              </button>
            </div>
          </div>



          {/* Content Description Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descriptions ({editingSlide?.content?.descriptions?.length || (editingSlide?.content?.description ? 1 : 0)})
            </label>
            <div className="space-y-2">
              {/* Handle both old single description and new multiple descriptions */}
              {(() => {
                const descriptions = editingSlide?.content?.descriptions || [];
                const hasOldDescription = editingSlide?.content?.description && descriptions.length === 0;
                
                // If we have an old description, convert it to new format automatically
                if (hasOldDescription) {
                  // Convert old single description to new format
                  updateEditingSlide('content', {
                    ...editingSlide?.content,
                    descriptions: [editingSlide.content.description],
                    description: undefined // Remove old field
                  });
                  return null; // Don't render anything while converting
                }
                
                // Show multiple descriptions
                return descriptions.map((description: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <textarea
                      value={description}
                      onChange={(e) => {
                        const newDescriptions = [...descriptions];
                        newDescriptions[index] = e.target.value;
                        updateEditingSlide('content', {
                          ...editingSlide?.content,
                          descriptions: newDescriptions
                        });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder={`Description ${index + 1}`}
                      rows={2}
                    />
                    <button
                      onClick={() => {
                        const newDescriptions = descriptions.filter((_: string, i: number) => i !== index);
                        updateEditingSlide('content', {
                          ...editingSlide?.content,
                          descriptions: newDescriptions
                        });
                      }}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ));
              })()}
              
              {/* Show message when no descriptions exist */}
              {(!editingSlide?.content?.descriptions || editingSlide.content.descriptions.length === 0) && 
               !editingSlide?.content?.description && (
                <div className="text-sm text-gray-500 text-center py-2">
                  No descriptions yet. Click the button below to add your first one.
                </div>
              )}
              
              <button
                onClick={() => {
                  const currentDescriptions = editingSlide?.content?.descriptions || [];
                  const newDescriptions = [...currentDescriptions, 'New description'];
                  updateEditingSlide('content', {
                    ...editingSlide?.content,
                    descriptions: newDescriptions
                  });
                  
                  console.log('Added description:', {
                    before: currentDescriptions,
                    after: newDescriptions
                  });
                }}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
              >
                + Add Description
              </button>
            </div>
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
                      // Also update the textColor to match the primary color
                      updateEditingSlide('textColor', e.target.value);
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
                      // Also update the backgroundColor to match the secondary color
                      updateEditingSlide('backgroundColor', e.target.value);
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
                    // Also reset the backgroundColor and textColor fields
                    updateEditingSlide('backgroundColor', brandKits[0].secondaryColor);
                    updateEditingSlide('textColor', brandKits[0].primaryColor);
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

  // Draggable slide renderer for live preview
  const renderDraggableSlide = (slide: Slide) => {
    const slideWithStyling = {
      ...slide,
      styling: {
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
        brandColors: {
          primary: slide.styling?.primaryColor || slide.textColor || brandKits?.[0]?.primaryColor || '#3b82f6',
          secondary: slide.styling?.secondaryColor || slide.backgroundColor || brandKits?.[0]?.secondaryColor || '#64748b',
          accent: slide.styling?.accentColor || brandKits?.[0]?.accentColor || '#10b981'
        }
      }
    };

    const positionedElements = slide.positionedElements || {};
    
    // Use the EXACT same color logic as SlideRenderer
    const primaryColor = slideWithStyling.styling.primaryColor;
    const secondaryColor = slideWithStyling.styling.secondaryColor;
    const textColor = slideWithStyling.styling.textColor;
    const accentColor = slideWithStyling.styling.accentColor;
    const backgroundColor = slideWithStyling.styling.backgroundColor;
    const fontFamily = slideWithStyling.styling.fontFamily;
    const logoUrl = slideWithStyling.styling.logoUrl;
    const brandColors = slideWithStyling.styling.brandColors;
    
    // Background style logic - use solid colors instead of gradients for editing
    const backgroundStyle = {
      backgroundColor: backgroundColor
    };
    
    return (
      <div 
        className="relative w-full h-full rounded-lg overflow-hidden"
        style={backgroundStyle}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Logo - positioned absolutely (top right for non-title slides) */}
        {slide.content?.logos && slide.content.logos.length > 0 && slide.type !== 'title' && (
          <div 
            className="absolute cursor-move group"
            style={{
              left: positionedElements.logo?.x || 16,
              top: positionedElements.logo?.y || 16,
              zIndex: 20
            }}
            onMouseDown={(e) => handleMouseDown(e, 'logo')}
          >
            <div className="space-y-2">
              {/* Show multiple logos from content.logos array */}
              {slide.content.logos.map((logoUrl: string, index: number) => (
                <img 
                  key={index}
                  src={logoUrl} 
                  alt={`Company Logo ${index + 1}`} 
                  className="h-10 w-auto object-contain opacity-95" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Main content container - same structure as deck view */}
        <div className="p-6">
          {/* Centered logo for title slides */}
          {slide.content?.logos && slide.content.logos.length > 0 && slide.type === 'title' && (
            <div 
              className="text-center mb-6 cursor-move group relative"
              style={{
                left: positionedElements.logo?.x || 'auto',
                top: positionedElements.logo?.y || 'auto',
                position: positionedElements.logo ? 'absolute' : 'static'
              }}
              onMouseDown={(e) => handleMouseDown(e, 'logo')}
            >
              <div className="space-y-2">
                {/* Show multiple logos from content.logos array */}
                {slide.content.logos.map((logoUrl: string, index: number) => (
                  <img 
                    key={index}
                    src={logoUrl} 
                    alt={`Company Logo ${index + 1}`} 
                    className="h-16 w-auto object-contain opacity-95 mx-auto" 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Title - draggable but positioned like deck view initially */}
          {((slide.content?.titles && slide.content.titles.length > 0) || slide.title) && (
            <div 
              className="cursor-move group relative"
              style={{
                left: positionedElements.title?.x || 'auto',
                top: positionedElements.title?.y || 'auto',
                position: positionedElements.title ? 'absolute' : 'static',
                right: positionedElements.title ? 'auto' : (slide.type === 'title' ? 'auto' : '64px')
              }}
              onMouseDown={(e) => handleMouseDown(e, 'title')}
            >
              <div className="space-y-2">
                {/* Handle both old and new title formats */}
                {slide.content?.titles && slide.content.titles.length > 0 ? (
                  // New multiple titles format
                  slide.content.titles.map((title: string, index: number) => (
                    <h1 
                      key={index}
                      className="font-bold leading-tight mb-6"
                      style={{
                        fontSize: slideWithStyling.styling.titleFontSize === '5xl' ? '48px' :
                                 slideWithStyling.styling.titleFontSize === '4xl' ? '36px' :
                                 slideWithStyling.styling.titleFontSize === '3xl' ? '30px' :
                                 slideWithStyling.styling.titleFontSize === '2xl' ? '24px' :
                                 slideWithStyling.styling.titleFontSize === 'xl' ? '20px' : '18px',
                        color: brandColors?.primary || textColor,
                        fontFamily: fontFamily || 'Inter'
                      }}
                    >
                      {title}
                    </h1>
                  ))
                ) : (
                  // Old single title format
                  <h1 
                    className="font-bold leading-tight mb-6"
                    style={{
                      fontSize: slideWithStyling.styling.titleFontSize === '5xl' ? '48px' :
                               slideWithStyling.styling.titleFontSize === '4xl' ? '36px' :
                               slideWithStyling.styling.titleFontSize === '3xl' ? '30px' :
                               slideWithStyling.styling.titleFontSize === '2xl' ? '24px' :
                               slideWithStyling.styling.titleFontSize === 'xl' ? '20px' : '18px',
                      color: brandColors?.primary || textColor,
                      fontFamily: fontFamily || 'Inter'
                    }}
                  >
                    {slide.title}
                  </h1>
                )}
              </div>
            </div>
          )}

          {/* Descriptions - draggable but positioned like deck view initially */}
          {((slide.content?.descriptions && slide.content.descriptions.length > 0) || slide.content?.description) && (
            <div 
              className="leading-relaxed mb-4 cursor-move group relative"
              style={{
                left: positionedElements.description?.x || 'auto',
                top: positionedElements.description?.y || 'auto',
                position: positionedElements.description ? 'absolute' : 'static',
                right: positionedElements.description ? 'auto' : '64px',
                borderLeft: brandColors ? `4px solid ${brandColors.accent}` : 'none',
                paddingLeft: brandColors ? '12px' : '0'
              }}
              onMouseDown={(e) => handleMouseDown(e, 'description')}
            >
              <div className="space-y-2">
                {/* Handle both old and new description formats */}
                {slide.content?.descriptions && slide.content.descriptions.length > 0 ? (
                  // New multiple descriptions format
                  slide.content.descriptions.map((description: string, index: number) => (
                    <div 
                      key={index}
                      style={{
                        fontSize: slideWithStyling.styling.descriptionFontSize === '2xl' ? '24px' :
                                 slideWithStyling.styling.descriptionFontSize === 'xl' ? '20px' :
                                 slideWithStyling.styling.descriptionFontSize === 'lg' ? '18px' :
                                 slideWithStyling.styling.descriptionFontSize === 'base' ? '16px' : '14px',
                        color: brandColors?.primary || textColor,
                        fontFamily: fontFamily || 'Inter'
                      }}
                    >
                      {description}
                    </div>
                  ))
                ) : (
                  // Old single description format
                  <div 
                    style={{
                      fontSize: slideWithStyling.styling.descriptionFontSize === '2xl' ? '24px' :
                               slideWithStyling.styling.descriptionFontSize === 'xl' ? '20px' :
                               slideWithStyling.styling.descriptionFontSize === 'lg' ? '18px' :
                               slideWithStyling.styling.descriptionFontSize === 'base' ? '16px' : '14px',
                      color: brandColors?.primary || textColor,
                      fontFamily: fontFamily || 'Inter'
                    }}
                  >
                    {slide.content.description}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bullet Points - draggable but positioned like deck view initially */}
          {slide.content?.bullets && slide.content.bullets.length > 0 && (
            <div 
              className="cursor-move group relative"
              style={{
                left: positionedElements.bullets?.x || 'auto',
                top: positionedElements.bullets?.y || 'auto',
                position: positionedElements.bullets ? 'absolute' : 'static',
                right: positionedElements.bullets ? 'auto' : '64px'
              }}
              onMouseDown={(e) => handleMouseDown(e, 'bullets')}
            >
              <ul className="space-y-2">
                {slide.content.bullets.map((bullet: string, index: number) => (
                  <li 
                    key={index}
                    className="flex items-start"
                    style={{
                      fontSize: slideWithStyling.styling.bulletFontSize === 'xl' ? '20px' :
                               slideWithStyling.styling.bulletFontSize === 'lg' ? '18px' :
                               slideWithStyling.styling.bulletFontSize === 'base' ? '16px' : '14px',
                      color: brandColors?.primary || textColor,
                      fontFamily: fontFamily || 'Inter',
                      listStyleType: 'none'
                    }}
                  >
                    <span 
                      className="mr-2 mt-1"
                      style={{ 
                        color: brandColors?.accent || accentColor,
                        fontSize: '1.2em'
                      }}
                    >
                      •
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
    console.log('=== RENDER SLIDE CONTENT DEBUG ===');
    console.log('Original slide data:', slide);
    console.log('Slide positionedElements:', slide.positionedElements);
    console.log('Slide styling:', slide.styling);
    console.log('Brand kits:', brandKits);
    console.log('Enhanced styling:', slideWithStyling.styling);
    
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
    const slideToRender = {
      ...slideWithStyling,
      positionedElements: slide.positionedElements || {} // Initialize as empty object if undefined
    };
    
    console.log('=== FINAL SLIDE DATA FOR SLIDERENDERER ===');
    console.log('Slide data being passed to SlideRenderer:', slideToRender);
    console.log('Positioned elements in final data:', slideToRender.positionedElements);
    
    return (
      <SlideRenderer slide={slideToRender} isCompact={false} />
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
                        {/* Vertical editing layout - Live preview above, edit form below */}
                        <div className="space-y-6">
                          {/* Live Preview - Takes full width for maximum sizing */}
                          <div className="w-full">
                            <div className="p-4 bg-gray-50 rounded-lg border">
                              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Eye className="h-5 w-5 text-blue-600" />
                                Live Preview
                              </h4>
                              <div className="w-full aspect-video">
                                {editingSlide && renderDraggableSlide(editingSlide)}
                              </div>
                              <p className="text-xs text-gray-500 text-center mt-3">
                                Click and drag any elements to reposition it on the slide
                              </p>
                            </div>
                          </div>
                          
                          {/* Editing Form - Takes full width below preview */}
                          <div className="w-full">
                            {renderEditableSlideContent(currentSlideData)}
                          </div>
                        </div>
                          </div>
                    ) : (
                      <div className="w-full aspect-video">
                        {renderSlideContent(currentSlideData)}
                      </div>
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