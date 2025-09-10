import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Trash2, Edit3, Save, X, Eye, Sparkles, Plus, GripVertical } from "lucide-react";
import { WysiwygEditor } from "@/components/WysiwygEditor";
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
  
  // Slide reordering state
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  // Upload background image
  const uploadBackgroundImageMutation = useMutation({
    mutationFn: async (file: File) => {
      // 1) Get signed upload URL
      const res = await apiRequest("POST", "/api/objects/upload");
      const { uploadURL, publicPath, publicUrl } = await (res as any).json();

      // 2) Upload file to signed URL
      await fetch(uploadURL, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      // 3) Return both server-served path and CDN/public URL
      return { objectPath: `/objects/${publicPath}`, publicUrl };
    },
    onSuccess: (data) => {
      if (!editingSlide) return;
      updateEditingSlide('styling', {
        ...editingSlide.styling,
        backgroundImage: data.publicUrl || data.objectPath,
      });
      toast({ title: "Background Image Set", description: "Image uploaded and applied." });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => { window.location.href = "/"; }, 500);
        return;
      }
      toast({ title: "Upload Failed", description: "Could not upload image.", variant: "destructive" });
    }
  });

  // Mutation for reordering slides
  const reorderSlidesMutation = useMutation({
    mutationFn: async (slideOrders: { slideId: string; order: number }[]) => {
      return await apiRequest("PUT", `/api/decks/${deckId}/slides/reorder`, { slideOrders });
    },
    onSuccess: () => {
      // Invalidate and refetch deck data
      queryClient.invalidateQueries({ queryKey: [`/api/decks/${deckId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", deck?.projectId, "decks"] });
      
      // Force refetch to ensure immediate updates
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: [`/api/decks/${deckId}`] });
        if (deck?.projectId) {
          queryClient.refetchQueries({ queryKey: ["/api/projects", deck.projectId, "decks"] });
        }
      }, 100);
      
      toast({
        title: "Slides Reordered",
        description: "Slide order has been updated successfully.",
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
        title: "Reorder Failed",
        description: "Failed to reorder slides. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for creating a new blank slide
  const createSlideMutation = useMutation({
    mutationFn: async (newSlide: Partial<Slide>) => {
      const res = await apiRequest("POST", `/api/decks/${deckId}/slides`, newSlide);
      return res.json();
    },
    onSuccess: async (created: any) => {
      // Refresh deck
      await queryClient.invalidateQueries({ queryKey: [`/api/decks/${deckId}`] });
      await queryClient.refetchQueries({ queryKey: [`/api/decks/${deckId}`] });
      toast({ title: "Slide Added", description: "A new slide was created." });
      // Navigate to the created slide if present
      if (created?.order) {
        setTimeout(() => {
          const newIndex = (created.order - 1) >= 0 ? (created.order - 1) : 0;
          setCurrentSlide(newIndex);
        }, 150);
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => { window.location.href = "/"; }, 500);
        return;
      }
      toast({ title: "Create Failed", description: "Failed to add slide.", variant: "destructive" });
    },
  });

  const handleAddBlankSlide = () => {
    if (!deck) return;
    const nextOrder = (Array.isArray(deck.slides) ? deck.slides.length : 0) + 1;
    const blank: Partial<Slide> = {
      id: `slide-${Date.now()}`,
      type: 'content',
      title: 'New Slide',
      order: nextOrder,
      content: {
        titles: ['New Slide'],
        descriptions: [''],
        bullets: [],
        logos: [],
      },
      backgroundColor: deck.slides?.[0]?.backgroundColor || '#FFFFFF',
      textColor: deck.slides?.[0]?.textColor || '#333333',
      styling: {
        fontFamily: deck.slides?.[0]?.styling?.fontFamily || 'Inter',
        fontSize: 'medium',
        titleFontSize: '3xl',
        descriptionFontSize: 'lg',
        bulletFontSize: 'base',
        primaryColor: deck.slides?.[0]?.styling?.primaryColor,
        secondaryColor: deck.slides?.[0]?.styling?.secondaryColor,
        accentColor: deck.slides?.[0]?.styling?.accentColor,
        logoUrl: deck.slides?.[0]?.styling?.logoUrl,
      },
      positionedElements: {},
    };
    createSlideMutation.mutate(blank, {
      onSuccess: async () => {
        // After refetch, go to last slide index
        setTimeout(() => {
          const total = (deck.slides?.length || 0) + 1;
          setCurrentSlide(total - 1);
          // auto-open editing for convenience
          const updatedDeck: any = queryClient.getQueryData([`/api/decks/${deckId}`]);
          const lastSlide = updatedDeck?.slides?.sort((a: any,b: any)=> (a.order||0)-(b.order||0))[total-1] || null;
          if (lastSlide) startEditing(lastSlide);
        }, 150);
      }
    });
  };

  // AI Improvement mutations
  const improveTitleMutation = useMutation({
    mutationFn: async ({ title, index, isMainTitle }: { title: string; index: number; isMainTitle?: boolean }) => {
      if (!deck?.projectId) throw new Error('Project ID not found');
      const response = await apiRequest("POST", `/api/projects/${deck.projectId}/ai-improve-text`, {
        text: title,
        context: "slide title"
      });
      return await response.json();
    },
    onSuccess: (data: any, variables) => {
      console.log('=== AI TITLE IMPROVEMENT SUCCESS ===');
      console.log('Response data:', data);
      console.log('Variables:', variables);
      console.log('Editing slide before update:', editingSlide);
      
      if (data.improvedText && editingSlide) {
        // Remove quotes from the improved text
        const cleanedText = data.improvedText.replace(/^"(.*)"$/, '$1');
        
        console.log('Original improved text:', data.improvedText);
        console.log('Cleaned text:', cleanedText);
        console.log('Is main title:', variables.isMainTitle);
        
        if (variables.isMainTitle) {
          // Update the main title field
          updateEditingSlide('title', cleanedText);
          console.log('Updated main title field');
        } else {
          // Update the specific title in the titles array
          const titles = editingSlide.content?.titles || [];
          const newTitles = [...titles];
          newTitles[variables.index] = cleanedText;
          
          console.log('Original titles:', titles);
          console.log('New titles:', newTitles);
          console.log('Updated title at index', variables.index, ':', cleanedText);
          
          // Update the content.titles array
          updateEditingSlide('content', {
            ...editingSlide.content,
            titles: newTitles
          });
          
          // Also update the main title field to ensure display consistency
          updateEditingSlide('title', cleanedText);
        }
        
        console.log('Called updateEditingSlide with new titles and main title');
        
        // Force a re-render by updating the editing slide state directly
        setTimeout(() => {
          console.log('Force updating editing slide after AI improvement');
          setEditingSlide(prev => {
            if (prev) {
              let updated;
              if (variables.isMainTitle) {
                updated = {
                  ...prev,
                  title: cleanedText
                };
              } else {
                const titles = prev.content?.titles || [];
                const newTitles = [...titles];
                newTitles[variables.index] = cleanedText;
                updated = {
                  ...prev,
                  title: cleanedText,
                  content: {
                    ...prev.content,
                    titles: newTitles
                  }
                };
              }
              console.log('Force updated slide:', updated);
              return updated;
            }
            return prev;
          });
        }, 100);
        
        toast({
          title: "Title Improved",
          description: "AI has enhanced your title to be more compelling.",
        });
      } else {
        console.log('No improvedText in response or no editingSlide');
        console.log('data.improvedText:', data.improvedText);
        console.log('editingSlide exists:', !!editingSlide);
      }
    },
    onError: (error) => {
      console.log('=== AI TITLE IMPROVEMENT ERROR ===');
      console.log('Error:', error);
      console.log('Error type:', typeof error);
      console.log('Error message:', error?.message);
      console.log('Error response:', (error as any)?.response);
      
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
        title: "Improvement Failed",
        description: "Failed to improve title. Please try again.",
        variant: "destructive",
      });
    },
  });

  const improveDescriptionMutation = useMutation({
    mutationFn: async ({ description, index }: { description: string; index: number }) => {
      if (!deck?.projectId) throw new Error('Project ID not found');
      const response = await apiRequest("POST", `/api/projects/${deck.projectId}/ai-improve-text`, {
        text: description,
        context: "slide description"
      });
      return await response.json();
    },
    onSuccess: (data: any, variables) => {
      if (data.improvedText && editingSlide) {
        // Remove quotes from the improved text
        const cleanedText = data.improvedText.replace(/^"(.*)"$/, '$1');
        
        // Update the specific description in the descriptions array
        const descriptions = editingSlide.content?.descriptions || [];
        const newDescriptions = [...descriptions];
        newDescriptions[variables.index] = cleanedText;
        
        updateEditingSlide('content', {
          ...editingSlide.content,
          descriptions: newDescriptions
        });
        
        // Also update the main description field if it exists
        if (editingSlide.content?.description) {
          updateEditingSlide('content', {
            ...editingSlide.content,
            description: cleanedText
          });
        }
        
        toast({
          title: "Description Improved",
          description: "AI has enhanced your description to be more compelling.",
        });
      }
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
        title: "Improvement Failed",
        description: "Failed to improve description. Please try again.",
        variant: "destructive",
      });
    },
  });

  const improveBulletMutation = useMutation({
    mutationFn: async ({ bullet, index }: { bullet: string; index: number }) => {
      if (!deck?.projectId) throw new Error('Project ID not found');
      const response = await apiRequest("POST", `/api/projects/${deck.projectId}/ai-improve-text`, {
        text: bullet,
        context: "bullet point"
      });
      return await response.json();
    },
    onSuccess: (data: any, variables) => {
      if (data.improvedText && editingSlide) {
        // Remove quotes from the improved text
        const cleanedText = data.improvedText.replace(/^"(.*)"$/, '$1');
        
        // Update the specific bullet point
        const bullets = editingSlide.content?.bullets || [];
        const newBullets = [...bullets];
        newBullets[variables.index] = cleanedText;
        
        updateEditingSlide('content', {
          ...editingSlide.content,
          bullets: newBullets
        });
        
        toast({
          title: "Bullet Point Improved",
          description: "AI has enhanced your bullet point to be more compelling.",
        });
      }
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
        title: "Improvement Failed",
        description: "Failed to improve bullet point. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper functions for AI improvement
  const handleImproveTitle = (titleIndex: number = 0) => {
    console.log('=== AI TITLE IMPROVEMENT DEBUG ===');
    console.log('Title index:', titleIndex);
    console.log('Editing slide:', editingSlide);
    console.log('Editing slide content:', editingSlide?.content);
    console.log('Titles array:', editingSlide?.content?.titles);
    console.log('Main title field:', editingSlide?.title);
    
    // Check both the titles array and the main title field
    const titles = editingSlide?.content?.titles || [];
    let title = titles[titleIndex];
    let isMainTitle = false;
    
    // If no title in the array, try the main title field
    if (!title?.trim() && editingSlide?.title) {
      title = editingSlide.title;
      isMainTitle = true;
      console.log('Using main title field:', title);
    }
    
    console.log('Selected title:', title);
    console.log('Is main title:', isMainTitle);
    console.log('Project ID:', deck?.projectId);
    
    if (!title?.trim()) {
      toast({
        title: "No Title",
        description: "Please add a title first before improving it.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Calling mutation with:', { title, index: titleIndex, isMainTitle });
    improveTitleMutation.mutate({ title, index: titleIndex, isMainTitle });
  };

  const handleImproveDescription = (descriptionIndex: number = 0) => {
    // Check both the descriptions array and the main description field
    const descriptions = editingSlide?.content?.descriptions || [];
    let description = descriptions[descriptionIndex];
    
    // If no description in the array, try the main description field
    if (!description?.trim() && editingSlide?.content?.description) {
      description = editingSlide.content.description;
    }
    
    if (!description?.trim()) {
      toast({
        title: "No Description",
        description: "Please add a description first before improving it.",
        variant: "destructive",
      });
      return;
    }
    
    improveDescriptionMutation.mutate({ description, index: descriptionIndex });
  };

  const handleImproveBullet = (bulletIndex: number) => {
    const bullets = editingSlide?.content?.bullets || [];
    const bullet = bullets[bulletIndex];
    
    if (!bullet?.trim()) {
      toast({
        title: "No Bullet Point",
        description: "Please add a bullet point first before improving it.",
        variant: "destructive",
      });
      return;
    }
    
    improveBulletMutation.mutate({ bullet, index: bulletIndex });
  };

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

  // Helper to render plain text for sidebar titles (strip WYSIWYG HTML)
  const getPlainTitle = (slide: Slide): string => {
    const raw = (slide.content?.titles && Array.isArray(slide.content.titles) && slide.content.titles.length > 0)
      ? String(slide.content.titles[0])
      : String(slide.title || '');
    return raw
      .replace(/<[^>]*>/g, ' ') // strip HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Helper functions for HTML rendering consistency
  const unescapeHtml = (str: string) => {
    if (!str) return '';
    let s = str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    // Strip a single wrapping <p>...</p> to avoid invalid nesting (e.g., <p> inside <span>)
    const match = s.match(/^\s*<p[^>]*>([\s\S]*?)<\/p>\s*$/i);
    if (match) s = match[1];
    return s;
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
      
      // Ensure title consistency: keep slide.title and content.titles[0] in sync
      const titlesArr = Array.isArray(editingSlide.content?.titles) ? [...editingSlide.content.titles] : [];
      const primaryTitle = (titlesArr[0] && String(titlesArr[0]).trim())
        ? String(titlesArr[0])
        : (editingSlide.title || '');
      if (primaryTitle) {
        if (titlesArr.length === 0) titlesArr.push(primaryTitle);
        else titlesArr[0] = primaryTitle;
      }

      const syncedSlide: Slide = {
        ...editingSlide,
        title: primaryTitle,
        content: {
          ...editingSlide.content,
          titles: titlesArr
        }
      } as Slide;

      // Log exactly what we're sending to the server
      const updatesToSend = {
        slideId: syncedSlide.id,
        updates: syncedSlide
      };
      
      console.log('=== DATA BEING SENT TO SERVER ===');
      console.log('Sending to server:', updatesToSend);
      console.log('Updates object contains:', {
        title: syncedSlide.title,
        content: syncedSlide.content,
        styling: syncedSlide.styling,
        backgroundColor: syncedSlide.backgroundColor,
        textColor: syncedSlide.textColor,
        positionedElements: syncedSlide.positionedElements
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

        // Keep title and content.titles[0] synchronized
        if (field === 'content' && value && Array.isArray(value.titles)) {
          const firstTitle = (value.titles[0] && String(value.titles[0]).trim()) ? String(value.titles[0]) : editingSlide.title;
          updated = {
            ...updated,
            title: firstTitle || ''
          };
        } else if (field === 'title') {
          const titlesArr = Array.isArray(updated.content?.titles) ? [...updated.content.titles] : [];
          if (titlesArr.length === 0) titlesArr.push(value);
          else titlesArr[0] = value;
          updated = {
            ...updated,
            content: {
              ...updated.content,
              titles: titlesArr
            }
          };
        }
        
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
      
      // Debug: Log title updates specifically
      if (field === 'title' || (field === 'content' && value.titles)) {
        console.log('=== TITLE UPDATE DEBUG ===');
        console.log('Field updated:', field);
        console.log('New value:', value);
        console.log('Updated slide title:', updated.title);
        console.log('Updated slide content.titles:', updated.content?.titles);
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

  // Slide reordering handlers
  const handleSlideDragStart = (e: React.DragEvent, slideId: string, slideIndex: number) => {
    if (isEditing) return; // Don't allow reordering while editing
    
    setDraggedSlideId(slideId);
    setIsReordering(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', slideId);
  };

  const handleSlideDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(targetIndex);
  };

  const handleSlideDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleSlideDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedSlideId || !deck) return;
    
    const draggedIndex = sortedSlides.findIndex(slide => slide.id === draggedSlideId);
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedSlideId(null);
      setIsReordering(false);
      setDragOverIndex(null);
      return;
    }
    
    // Create new order array
    const newSlides = [...sortedSlides];
    const draggedSlide = newSlides[draggedIndex];
    
    // Remove dragged slide from its current position
    newSlides.splice(draggedIndex, 1);
    
    // Insert at new position
    newSlides.splice(targetIndex, 0, draggedSlide);
    
    // Create slide orders for server
    const slideOrders = newSlides.map((slide, index) => ({
      slideId: slide.id,
      order: index + 1
    }));
    
    // Update server
    reorderSlidesMutation.mutate(slideOrders);
    
    // Reset state
    setDraggedSlideId(null);
    setIsReordering(false);
    setDragOverIndex(null);
  };

  const handleSlideDragEnd = () => {
    setDraggedSlideId(null);
    setIsReordering(false);
    setDragOverIndex(null);
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
                  // Return the converted title for immediate display
                  return (
                    <div key={`title-old-${slide.id}`} className="flex items-center space-x-2">
                      <div className="flex-1">
                        <WysiwygEditor
                          content={editingSlide.title}
                          onChange={(html) => {
                            updateEditingSlide('content', {
                              ...editingSlide?.content,
                              titles: [html]
                            });
                            updateEditingSlide('title', html);
                          }}
                          className="bg-white"
                          minHeight="min-h-[60px]"
                          projectId={deck?.projectId}
                          context="slide title"
                          toolbarActions={(
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleImproveTitle(0)}
                                disabled={improveTitleMutation.isPending}
                                className="px-2 py-1 text-xs"
                                title="Improve with AI"
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                {improveTitleMutation.isPending ? '...' : 'AI'}
                              </Button>
                              <button
                                onClick={() => {
                                  updateEditingSlide('content', {
                                    ...editingSlide?.content,
                                    titles: []
                                  });
                                  updateEditingSlide('title', '');
                                }}
                                className="p-2 text-red-500 hover:text-red-700"
                                title="Delete title"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        />
                      </div>
                      
                    </div>
                  );
                }
                
                // Show multiple titles - if no titles exist, show the main title field
                if (titles.length === 0 && editingSlide?.title) {
                  return (
                    <div key={`title-main-${slide.id}`} className="flex items-center space-x-2">
                      <div className="flex-1">
                        <WysiwygEditor
                          content={editingSlide.title}
                          onChange={(html) => {
                            updateEditingSlide('title', html);
                            const titles = Array.isArray(editingSlide?.content?.titles) ? [...editingSlide!.content!.titles] : [];
                            if (titles.length === 0) titles.push(html); else titles[0] = html;
                            updateEditingSlide('content', { ...editingSlide!.content, titles });
                          }}
                          className="bg-white"
                          minHeight="min-h-[60px]"
                          projectId={deck?.projectId}
                          context="slide title"
                          toolbarActions={(
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleImproveTitle(0)}
                                disabled={improveTitleMutation.isPending}
                                className="px-2 py-1 text-xs"
                                title="Improve with AI"
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                {improveTitleMutation.isPending ? '...' : 'AI'}
                              </Button>
                              <button
                                onClick={() => {
                                  updateEditingSlide('title', '');
                                  updateEditingSlide('content', { ...editingSlide!.content, titles: [] });
                                }}
                                className="p-2 text-red-500 hover:text-red-700"
                                title="Delete title"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        />
                      </div>
                      
                    </div>
                  );
                }
                
                // Show multiple titles from the titles array
                return titles.map((title: string, index: number) => (
                  <div key={`title-${slide.id}-${index}`} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <WysiwygEditor
                        content={title}
                        onChange={(html) => {
                          const newTitles = [...titles];
                          newTitles[index] = html;
                          updateEditingSlide('content', {
                            ...editingSlide?.content,
                            titles: newTitles
                          });
                          if (index === 0) updateEditingSlide('title', html);
                        }}
                        className="bg-white"
                        minHeight="min-h-[60px]"
                        projectId={deck?.projectId}
                        context="slide title"
                        toolbarActions={(
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleImproveTitle(index)}
                              disabled={improveTitleMutation.isPending}
                              className="px-2 py-1 text-xs"
                              title="Improve with AI"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              {improveTitleMutation.isPending ? '...' : 'AI'}
                            </Button>
                            <button
                              onClick={() => {
                                const newTitles = titles.filter((_: string, i: number) => i !== index);
                                updateEditingSlide('content', {
                                  ...editingSlide?.content,
                                  titles: newTitles
                                });
                              }}
                              className="p-2 text-red-500 hover:text-red-700"
                              title="Delete title"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      />
                    </div>
                    
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
                    <div className="flex-1">
                      <WysiwygEditor
                        content={description}
                        onChange={(html) => {
                          const newDescriptions = [...descriptions];
                          newDescriptions[index] = html;
                          updateEditingSlide('content', {
                            ...editingSlide?.content,
                            descriptions: newDescriptions,
                            description: index === 0 ? html : editingSlide?.content?.description
                          });
                        }}
                        className="bg-white"
                        minHeight="min-h-[100px]"
                        projectId={deck?.projectId}
                        context="slide description"
                        toolbarActions={(
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleImproveDescription(index)}
                              disabled={improveDescriptionMutation.isPending}
                              className="px-2 py-1 text-xs"
                              title="Improve with AI"
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              {improveDescriptionMutation.isPending ? '...' : 'AI'}
                            </Button>
                            <button
                              onClick={() => {
                                const newDescriptions = descriptions.filter((_: string, i: number) => i !== index);
                                updateEditingSlide('content', {
                                  ...editingSlide?.content,
                                  descriptions: newDescriptions
                                });
                              }}
                              className="p-2 text-red-500 hover:text-red-700"
                              title="Delete description"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      />
                    </div>
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



          {/* Bullet Points */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bullet Points ({editingSlide?.content?.bullets?.length || 0})
            </label>
            <div className="space-y-2">
              {Array.isArray(editingSlide?.content?.bullets) && editingSlide.content.bullets.map((bullet: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="flex-1">
                    <WysiwygEditor
                      content={bullet}
                      onChange={(html) => {
                        const newBullets = [...(editingSlide?.content?.bullets || [])];
                        newBullets[index] = html;
                        updateEditingSlide('content', {
                          ...editingSlide?.content,
                          bullets: newBullets
                        });
                      }}
                      className="bg-white"
                      minHeight="min-h-[60px]"
                      projectId={deck?.projectId}
                      context="bullet point"
                      toolbarActions={(
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleImproveBullet(index)}
                            disabled={improveBulletMutation.isPending}
                            className="px-2 py-1 text-xs"
                            title="Improve with AI"
                          >
                            <Sparkles className="h-3 w-3 mr-1" />
                            {improveBulletMutation.isPending ? '...' : 'AI'}
                          </Button>
                          <button
                            onClick={() => {
                              const newBullets = editingSlide?.content?.bullets?.filter((_: string, i: number) => i !== index) || [];
                              updateEditingSlide('content', {
                                ...editingSlide?.content,
                                bullets: newBullets
                              });
                            }}
                            className="p-2 text-red-500 hover:text-red-700"
                            title="Delete bullet"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    />
                  </div>
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
                }}
                className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
              >
                + Add Bullet Point
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
            
            {/* Title editor inlined above within Titles section. Removed duplicate editor here. */}
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

              {/* Logo Management (moved here) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logos ({editingSlide?.content?.logos?.length || 0})
                </label>
                <div className="space-y-2">
                  {(() => {
                    const logos = editingSlide?.content?.logos || [];
                    const hasOldLogo = editingSlide?.styling?.logoUrl && logos.length === 0;
                    if (hasOldLogo) {
                      updateEditingSlide('content', {
                        ...editingSlide?.content,
                        logos: [editingSlide.styling?.logoUrl || '']
                      });
                      updateEditingSlide('styling', {
                        ...editingSlide?.styling,
                        logoUrl: undefined
                      });
                      return null;
                    }
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
                    }}
                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
                  >
                    + Add Logo
                  </button>
                </div>
              </div>

              {/* Background Image URL */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Background Image URL</label>
                <input
                  type="text"
                  value={editingSlide?.styling?.backgroundImage || ''}
                  onChange={(e) => updateEditingSlide('styling', {
                    ...editingSlide?.styling,
                    backgroundImage: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use solid background color.</p>
                <div className="mt-2 flex items-center gap-2">
                  <label className="px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50">
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadBackgroundImageMutation.mutate(file);
                      }}
                    />
                  </label>
                  {uploadBackgroundImageMutation.isPending && (
                    <span className="text-xs text-gray-500">Uploading...</span>
                  )}
                </div>
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
        // Preserve all existing styling first
        ...slide.styling,
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
    const backgroundImageUrl = (slideWithStyling.styling as any)?.backgroundImage as string | undefined;
    const backgroundStyle = backgroundImageUrl && backgroundImageUrl.trim() !== ''
      ? {
          backgroundImage: `url(${backgroundImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: backgroundColor
        }
      : {
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
                    <div 
                      key={index}
                      className="font-bold leading-tight mb-6"
                      style={{
                        color: brandColors?.primary || textColor,
                        fontFamily: fontFamily || 'Inter'
                      }}
                      dangerouslySetInnerHTML={{ __html: title }}
                    />
                  ))
                ) : (
                  // Old single title format
                  <div 
                    className="font-bold leading-tight mb-6"
                    style={{
                      color: brandColors?.primary || textColor,
                      fontFamily: fontFamily || 'Inter'
                    }}
                    dangerouslySetInnerHTML={{ __html: slide.title }}
                  />
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
                        color: brandColors?.primary || textColor,
                        fontFamily: fontFamily || 'Inter'
                      }}
                      dangerouslySetInnerHTML={{ __html: description }}
                    />
                  ))
                ) : (
                  // Old single description format
                  <div 
                    style={{
                      color: brandColors?.primary || textColor,
                      fontFamily: fontFamily || 'Inter'
                    }}
                    dangerouslySetInnerHTML={{ __html: slide.content.description || '' }}
                  />
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
                    <span>{unescapeHtml(bullet)}</span>
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
        // Preserve all existing styling first
        ...slide.styling,
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
        backgroundImage: slide.styling?.backgroundImage,
        
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">Slides</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddBlankSlide}
                  disabled={createSlideMutation.isPending}
                  title="Add new slide"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {createSlideMutation.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
              {!isEditing && (
                <p className="text-xs text-gray-500 mb-3">
                  Drag slides by the grip icon to reorder them
                </p>
              )}
              <div className="space-y-2">
                {sortedSlides.map((slide, index) => (
                  <div
                    key={slide.id}
                    draggable={!isEditing && !reorderSlidesMutation.isPending}
                    onDragStart={(e) => handleSlideDragStart(e, slide.id, index)}
                    onDragOver={(e) => handleSlideDragOver(e, index)}
                    onDragLeave={handleSlideDragLeave}
                    onDrop={(e) => handleSlideDrop(e, index)}
                    onDragEnd={handleSlideDragEnd}
                    className={cn(
                      "flex items-center justify-between group transition-all duration-200",
                      currentSlide === index
                        ? isEditing 
                          ? "bg-green-100 border-2 border-green-300 rounded-md" // Highlight editing slide
                          : "bg-blue-100 rounded-md" // Normal current slide
                        : "hover:bg-gray-100 rounded-md",
                      // Drag and drop visual feedback
                      draggedSlideId === slide.id && "opacity-50 scale-95",
                      dragOverIndex === index && draggedSlideId !== slide.id && "bg-blue-50 border-2 border-blue-300 rounded-md",
                      isReordering && draggedSlideId !== slide.id && "cursor-move"
                    )}
                  >
                    {/* Drag handle */}
                    {!isEditing && (
                      <div className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing">
                        <GripVertical className="h-4 w-4" />
                      </div>
                    )}
                    
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
                    {index + 1}. {getPlainTitle(slide)}
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