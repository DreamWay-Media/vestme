/**
 * Template Design Studio
 * Visual drag-and-drop template editor
 */

import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Save, Eye, Settings, Loader2 } from 'lucide-react';
import { DndContext, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useDesignStudioStore } from '@/stores/designStudioStore';
import { useGetTemplate, useUpdateTemplate, useCreateTemplate } from '@/hooks/useAdminTemplates';
import { useGetAdminTheme } from '@/hooks/useAdminThemes';
import { ElementLibrary } from '@/components/DesignStudio/ElementLibrary';
import { DesignCanvas } from '@/components/DesignStudio/DesignCanvas';
import { PropertiesPanel } from '@/components/DesignStudio/PropertiesPanel';
import { CanvasToolbar } from '@/components/DesignStudio/CanvasToolbar';
import { useHotkeys } from 'react-hotkeys-hook';

export default function TemplateDesignStudio() {
  const { templateId } = useParams<{ templateId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if creating new template (route is /admin/templates/new/design)
  const isNewTemplate = !templateId || templateId === 'new' || window.location.pathname.includes('/new/design');
  
  // Get themeId from query params using URLSearchParams
  const [themeId, setThemeId] = useState<string | null>(null);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const themeIdParam = urlParams.get('themeId');
    setThemeId(themeIdParam);
  }, []);
  
  // Get theme info if themeId is provided
  const { data: theme } = useGetAdminTheme(themeId);

  // Get template from API if editing existing
  const { data: existingTemplate, isLoading } = useGetTemplate(isNewTemplate ? null : templateId || null);
  const updateMutation = useUpdateTemplate(templateId || '');
  const createMutation = useCreateTemplate();

  // Design studio state
  const {
    template,
    setTemplate,
    updateTemplateInfo,
    isDirty,
    isSaving,
    setSaving,
    markClean,
    reset,
    undo,
    redo,
    copy,
    paste,
    cut,
    deleteElement,
    selectedElementIds,
    deselectAll,
    history,
  } = useDesignStudioStore();

  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Configure DnD sensors with activation constraints
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10, // 10px movement required to start drag
    },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  // Load template on mount
  useEffect(() => {
    if (existingTemplate && templateId) {
      // Convert existing template to visual format
      const visualTemplate = convertToVisualTemplate(existingTemplate);
      setTemplate(visualTemplate);
    } else {
      // New template
      reset();
    }
  }, [existingTemplate, templateId, setTemplate, reset]);

  // Auto-fit canvas to screen on mount
  useEffect(() => {
    const autoFit = () => {
      // Calculate available space (accounting for padding and sidebars)
      // Padding changed from p-8 (64px) to p-4 (32px)
      // Adding 48px buffer to ensure no overflow or sidebar overlap
      const availableHeight = window.innerHeight - 64 - 48 - 32 - 48;
      const availableWidth = window.innerWidth - 256 - 320 - 32 - 48;

      // Calculate zoom to fit
      const zoomToFitWidth = availableWidth / 1920;
      const zoomToFitHeight = availableHeight / 1080;

      // Use the smaller zoom to ensure it fits in both dimensions
      const optimalZoom = Math.min(zoomToFitWidth, zoomToFitHeight, 1);

      // Find the largest zoom level that is LESS THAN OR EQUAL to optimal (round down, not nearest)
      const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
      const fittingZoom = ZOOM_LEVELS.filter(z => z <= optimalZoom);
      const closestZoom = fittingZoom.length > 0 ? fittingZoom[fittingZoom.length - 1] : 0.25;

      // Get setZoom from store
      const { setZoom } = useDesignStudioStore.getState();
      setZoom(closestZoom);
    };

    // Run on mount with a slight delay to ensure layout is ready
    const timer = setTimeout(autoFit, 100);
    return () => clearTimeout(timer);
  }, []);


  // Keyboard shortcuts
  useHotkeys('mod+s', (e) => {
    e.preventDefault();
    handleSave();
  });

  useHotkeys('mod+z', (e) => {
    e.preventDefault();
    undo();
  });

  useHotkeys('mod+shift+z', (e) => {
    e.preventDefault();
    redo();
  });

  useHotkeys('mod+y', (e) => {
    e.preventDefault();
    redo();
  });

  useHotkeys('mod+c', (e) => {
    if (selectedElementIds.length > 0) {
      e.preventDefault();
      copy();
      toast({
        title: 'Copied',
        description: `${selectedElementIds.length} element(s) copied to clipboard`,
      });
    }
  });

  useHotkeys('mod+v', (e) => {
    e.preventDefault();
    paste();
  });

  useHotkeys('mod+x', (e) => {
    if (selectedElementIds.length > 0) {
      e.preventDefault();
      cut();
    }
  });

  useHotkeys('delete', () => {
    if (selectedElementIds.length > 0) {
      selectedElementIds.forEach(id => deleteElement(id));
      toast({
        title: 'Deleted',
        description: `${selectedElementIds.length} element(s) deleted`,
      });
    }
  });

  useHotkeys('backspace', () => {
    if (selectedElementIds.length > 0) {
      selectedElementIds.forEach(id => deleteElement(id));
    }
  });

  useHotkeys('escape', () => {
    deselectAll();
  });

  // Save template
  const handleSave = async () => {
    try {
      setSaving(true);

      // Convert visual template back to API format
      const apiTemplate = convertToAPITemplate(template);

      if (templateId) {
        // Update existing - Fixed: Use correct structure for mutation
        await updateMutation.mutateAsync({
          templateId: templateId,
          updates: apiTemplate
        });

        // Invalidate all template caches to ensure preview updates everywhere
        await queryClient.invalidateQueries({ queryKey: ['templates'] });
        await queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });

        // Refetch the template to get the updated data back into the design studio
        await queryClient.refetchQueries({
          queryKey: ['admin', 'template', templateId],
          exact: true
        });
      } else {
        // Create new template
        if (!apiTemplate.name || !apiTemplate.name.trim()) {
          toast({
            title: 'Validation Error',
            description: 'Slide name is required',
            variant: 'destructive',
          });
          setSaving(false);
          return;
        }

        // Get themeId from query params
        const urlParams = new URLSearchParams(window.location.search);
        const themeIdParam = urlParams.get('themeId');

        // Include themeId if provided
        const templateData = {
          ...apiTemplate,
          themeId: themeIdParam || undefined,
        };

        const newTemplate = await createMutation.mutateAsync(templateData);

        toast({
          title: 'Slide Created',
          description: 'Slide has been created successfully',
        });

        // Invalidate all template caches
        await queryClient.invalidateQueries({ queryKey: ['templates'] });
        await queryClient.invalidateQueries({ queryKey: ['admin', 'templates'] });

        // Redirect back to theme templates page if themeId was provided, otherwise to template management
        if (themeIdParam) {
          setLocation(`/admin/themes/${themeIdParam}/templates`);
        } else {
          setLocation('/admin/templates');
        }
        return;
      }

      markClean();
      toast({
        title: 'Saved',
        description: 'Slide saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Back to template management or theme templates page
  const handleBack = () => {
    if (isDirty) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirm) return;
    }
    
    // Navigate back to theme templates page if themeId is present, otherwise to template management
    if (themeId) {
      setLocation(`/admin/themes/${themeId}/templates`);
    } else {
      setLocation('/admin/templates');
    }
  };

  // Preview template
  const handlePreview = () => {
    setShowPreview(true);
    // We'll implement preview modal later
    toast({
      title: 'Preview',
      description: 'Preview will be implemented in Phase 2',
    });
  };


  if (isLoading && !isNewTemplate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-muted/30">
      {/* Header */}
      <header className="h-16 border-b bg-background flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Slides
          </Button>

          <div className="h-6 w-px bg-border" />

          <Input
            value={template.name}
            onChange={(e) => updateTemplateInfo({ name: e.target.value })}
            className="w-64 h-9"
            placeholder="Slide name..."
          />

          {isDirty && (
            <span className="text-xs text-muted-foreground">
              • Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mr-4">
            <kbd className="px-2 py-1 rounded bg-muted">⌘Z</kbd> Undo
            <span className="mx-1">·</span>
            <kbd className="px-2 py-1 rounded bg-muted">⌘⇧Z</kbd> Redo
            <span className="mx-1">·</span>
            <kbd className="px-2 py-1 rounded bg-muted">⌘S</kbd> Save
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="gap-2"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <DndContext sensors={sensors}>
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Element Library */}
          <div className="w-64 border-r bg-background shrink-0 overflow-y-auto">
            <ElementLibrary />
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <CanvasToolbar />
            <DesignCanvas />
          </div>

          {/* Right Sidebar - Properties */}
          <div className="w-80 border-l bg-background shrink-0 overflow-y-auto">
            <PropertiesPanel />
          </div>
        </div>
      </DndContext>
    </div>
  );
}

// Helper functions to convert between formats
function convertToVisualTemplate(apiTemplate: any): any {
  // Convert API template format back to visual template format
  const layoutElements = apiTemplate.layout?.elements || [];
  const schemaFields = apiTemplate.contentSchema?.fields || [];

  // Create a map of field configs for quick lookup
  const fieldConfigMap = new Map(
    schemaFields.map((field: any) => [field.id, field])
  );

  // Convert layout elements to visual elements
  const visualElements = layoutElements.map((el: any, index: number) => {
    const fieldConfig = fieldConfigMap.get(el.id);

    // Parse position and size from zone strings (e.g., "100px" -> 100)
    const parsePixelValue = (val: string | number): number => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    const parseSizeValue = (val: string | number): number | 'auto' => {
      if (val === 'auto') return 'auto';
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        if (val === 'auto') return 'auto';
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // Build config based on element type
    let config: any = {};
    if (el.type === 'text') {
      config = {
        fieldId: el.id,
        label: fieldConfig?.label || '',
        placeholder: fieldConfig?.placeholder || '',
        defaultValue: '',
        maxLength: 1000,
        required: fieldConfig?.required || false,
        multiline: false,
        richText: false,
      };
    } else if (el.type === 'image') {
      config = {
        fieldId: el.id,
        mediaType: 'graphic',
        tags: [],
        objectFit: 'cover',
      };
    } else if (el.type === 'shape') {
      config = {
        shape: el.config?.shape || 'rectangle',
        fill: el.config?.fill || '#E5E7EB',
        stroke: el.config?.stroke || '#9CA3AF',
        strokeWidth: el.config?.strokeWidth !== undefined ? el.config.strokeWidth : 2,
      };
    } else if (el.type === 'data') {
      config = {
        fieldId: el.id,
        dataPath: fieldConfig?.dataPath || '',
        format: 'text',
      };
    }

    return {
      id: el.id,
      type: el.type,
      position: {
        x: parsePixelValue(el.zone?.x || 0),
        y: parsePixelValue(el.zone?.y || 0),
      },
      size: {
        width: parseSizeValue(el.zone?.width || 100),
        height: parseSizeValue(el.zone?.height || 100),
      },
      zIndex: el.zIndex !== undefined ? el.zIndex : index,  // Use actual zIndex if available
      config,
      style: el.styling || {},
      aiPrompt: el.aiPrompt || undefined, // Restore AI prompt configuration
    };
  });

  return {
    id: apiTemplate.id,
    name: apiTemplate.name,
    description: apiTemplate.description || '',
    category: apiTemplate.category,
    tags: apiTemplate.tags || [],
    accessTier: apiTemplate.themeAccessTier || apiTemplate.accessTier || 'free', // BUG FIX: Templates inherit from theme
    isEnabled: apiTemplate.isEnabled ?? true,
    displayOrder: apiTemplate.displayOrder || 0,
    canvas: {
      width: 1920,
      height: 1080,
      backgroundColor: apiTemplate.defaultStyling?.background?.fallback || '#FFFFFF',
    },
    elements: visualElements,
    thumbnail: apiTemplate.thumbnail,
  };
}

function convertToAPITemplate(visualTemplate: any): any {
  // Convert visual template back to API format
  // Fixed: Added safe property access and AI prompt support
  return {
    name: visualTemplate.name,
    description: visualTemplate.description,
    category: visualTemplate.category,
    tags: visualTemplate.tags,
    accessTier: visualTemplate.themeAccessTier || visualTemplate.accessTier, // BUG FIX: Templates inherit from theme
    isEnabled: visualTemplate.isEnabled,
    displayOrder: visualTemplate.displayOrder,
    layout: {
      type: 'absolute',
      elements: visualTemplate.elements.map((el: any) => ({
        id: el.config?.fieldId || el.id,
        type: el.type,
        zone: {
          x: `${el.position?.x || 0}px`,
          y: `${el.position?.y || 0}px`,
          width: typeof el.size?.width === 'number' ? `${el.size.width}px` : (el.size?.width || 'auto'),
          height: typeof el.size?.height === 'number' ? `${el.size.height}px` : (el.size?.height || 'auto'),
        },
        zIndex: el.zIndex !== undefined ? el.zIndex : 0,  // Save zIndex
        styling: el.style || {},
        config: el.config || {},
        aiPrompt: el.aiPrompt || null, // Include AI prompt configuration
      })),
    },
    defaultStyling: {
      background: {
        type: 'solid',
        fallback: visualTemplate.canvas?.backgroundColor || '#FFFFFF',
      },
    },
    contentSchema: {
      fields: visualTemplate.elements
        .filter((el: any) => {
          // Include text elements
          if (el.type === 'text') return true;
          // Include data elements (stats, numbers, etc.)
          if (el.type === 'data') return true;
          // For image elements, EXCLUDE logos (they come from brand kit)
          if (el.type === 'image') {
            const mediaType = el.config?.mediaType || '';
            return mediaType !== 'logo';  // Only include non-logo images
          }
          // Include shapes (allow color customization)
          if (el.type === 'shape') return true;
          return false;
        })
        .map((el: any) => ({
          id: el.config?.fieldId || el.id,
          type: el.type,
          label: el.config?.label || (el.type === 'shape' ? `Shape ${el.id}` : el.id) || 'Untitled Field', // Auto-label for shapes
          placeholder: el.config?.placeholder || '',
          required: el.config?.required || false,
          maxLength: el.config?.maxLength || undefined,
          multiline: el.config?.multiline || false,
          aiPrompt: el.aiPrompt || null, // Include AI prompt in schema
          config: el.type === 'shape' ? {
            fill: el.config?.fill || '#E5E7EB',
            stroke: el.config?.stroke || '#9CA3AF',
            strokeWidth: el.config?.strokeWidth || 2,
            shape: el.config?.shape || 'rectangle',
          } : undefined, // Include shape config for color defaults
        }))
        .filter((field: any) => {
          // Extra safety: filter out fields that still don't have valid labels
          return field.label && field.label.trim() !== '';
        }),
    },
  };
}

