import { useState, useEffect, useRef } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaLibraryPicker } from "@/components/MediaLibrary/MediaLibraryPicker";
import { useToast } from "@/hooks/use-toast";
import { useApplyTemplate } from "@/hooks/useTemplates";
import { SlideRenderer } from "@/components/SlideRenderer";
import type { Template } from "@/hooks/useTemplates";
import { supabase } from "@/lib/supabase";

interface TemplatePreviewModalProps {
  template: Template;
  brandKit?: any;
  deckId?: string;
  projectId?: string;
  businessProfile?: any;
  onClose: () => void;
  onApply?: (content: any) => void;
}

export function TemplatePreviewModal({
  template,
  brandKit,
  deckId,
  projectId,
  businessProfile,
  onClose,
  onApply,
}: TemplatePreviewModalProps) {

  const { toast } = useToast();
  // Don't use mutation if onApply is provided (deck-viewer will handle it)
  const applyTemplate = (deckId && !onApply) ? useApplyTemplate(deckId) : null;

  // Initialize form state from template schema with null checks
  // For image fields, use unique IDs (field.id-filteredIndex) to ensure each field has its own entry
  // IMPORTANT: Use the same filtering logic as the form rendering
  const initialFormState = (() => {
    const schemaFields = template.contentSchema?.fields || [];
    const layoutElements = template.layout?.elements || [];
    
    // Find shapes in layout that aren't in schema (for backward compatibility)
    const shapeElements = layoutElements.filter((el: any) => el.type === 'shape');
    const schemaShapeIds = new Set(schemaFields.filter((f: any) => f.type === 'shape').map((f: any) => f.id));
    const missingShapes = shapeElements.filter((shape: any) => !schemaShapeIds.has(shape.id));
    
    // Combine schema fields with missing shapes
    const enhancedFields = [
      ...schemaFields,
      ...missingShapes.map((shape: any, idx: number) => ({
        id: shape.id,
        type: 'shape',
        label: `Shape ${idx + 1}`,
        config: {
          fill: shape.config?.fill || shape.styling?.backgroundColor || '#E5E7EB',
          stroke: shape.config?.stroke || shape.styling?.borderColor || '#9CA3AF',
          strokeWidth: shape.config?.strokeWidth || 2,
        },
      })),
    ];
    
    // Filter fields the same way as the form does (only fields with labels, or shapes)
    const filteredFields = enhancedFields.filter((field: any) => {
      if (field.type === 'shape') return true; // Always include shapes
      if (!field.label || field.label.trim() === '') return false;
      return true;
    });
    
    // Initialize with filtered index (matches form rendering)
    return filteredFields.reduce((acc: any, field: any, filteredIndex: number) => {
      if (field.type === 'shape') {
        // Initialize shape fill color only (border color removed from UI)
        acc[`${field.id}_fill`] = field.config?.fill || '#3b82f6';
      } else {
        // For image/logo fields, use unique ID with filtered index (matches form rendering)
        const isImageField = field.type === 'image' || field.type === 'logo';
        const fieldKey = isImageField ? `${field.id}-${filteredIndex}` : field.id;
        acc[fieldKey] = field.defaultValue || "";
      }
      return acc;
    }, {});
  })();

  const [formData, setFormData] = useState(initialFormState);
  const [isApplying, setIsApplying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // Media library picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFieldId, setPickerFieldId] = useState<string | null>(null);
  const hasGeneratedRef = useRef(false); // Track if we've already generated content

  // Reset generation flag when template changes
  useEffect(() => {
    hasGeneratedRef.current = false;
  }, [template.id]);

  // Generate AI content when modal opens and businessProfile is available
  useEffect(() => {
    const generateContent = async () => {
      // Skip if already generated for this template
      if (hasGeneratedRef.current) {
        return;
      }

      // Skip if no business profile
      if (!businessProfile) {
        return;
      }

      // Check if formData has meaningful content (excluding shape color defaults and empty strings)
      const hasMeaningfulContent = Object.entries(formData).some(([key, val]) => {
        // Skip shape color fields (they're just defaults)
        if (key.endsWith('_fill') || key.endsWith('_stroke')) {
          return false;
        }
        if (Array.isArray(val)) {
          return val.length > 0 && val.some(v => v && String(v).trim());
        }
        return val && String(val).trim() !== '';
      });

      if (hasMeaningfulContent) {
        return;
      }

      hasGeneratedRef.current = true; // Mark as generated
      setIsGenerating(true);
      try {
        // Get auth headers
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          const { data: refreshData } = await supabase.auth.refreshSession();
          if (!refreshData.session) {
            throw new Error('Not authenticated');
          }
        }

        const authSession = session || (await supabase.auth.getSession()).data.session;
        const headers = {
          'Authorization': `Bearer ${authSession?.access_token}`,
          'Content-Type': 'application/json',
        };

        // Call AI generation endpoint
        const response = await fetch('/api/generate-template-content', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            templateCategory: template.category,
            templateName: template.name,
            businessProfile,
            projectId, // Pass projectId for media library access
            templateSchema: template.contentSchema, // Pass schema for backward compatibility
            layoutElements: template.layout?.elements || [], // Pass layout elements with element-specific prompts
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate content');
        }

        const generatedContent = await response.json();

        // Map generated content to ACTUAL form field IDs from template schema
        const mappedContent: any = {};

        // Get actual field IDs from template - use SAME enhancement logic as form
        const schemaFields = template.contentSchema?.fields || [];
        const layoutElements = template.layout?.elements || [];
        
        // Find shapes in layout that aren't in schema (same as form rendering)
        const shapeElements = layoutElements.filter((el: any) => el.type === 'shape');
        const schemaShapeIds = new Set(schemaFields.filter((f: any) => f.type === 'shape').map((f: any) => f.id));
        const missingShapes = shapeElements.filter((shape: any) => !schemaShapeIds.has(shape.id));
        
        // Add missing shapes to schema dynamically (same as form rendering)
        const enhancedFields = [
          ...schemaFields,
          ...missingShapes.map((shape: any, idx: number) => ({
            id: shape.id,
            type: 'shape',
            label: `Shape ${idx + 1}`,
            config: {
              fill: shape.config?.fill || shape.styling?.backgroundColor || '#E5E7EB',
              stroke: shape.config?.stroke || shape.styling?.borderColor || '#9CA3AF',
              strokeWidth: shape.config?.strokeWidth || 2,
            },
          })),
        ];
        
        const fields = enhancedFields;

        // PRIORITY 1: Use elementContent if provided (element-specific content from AI)
        // This ensures each element gets content that matches its specific prompt
        if (generatedContent.elementContent && typeof generatedContent.elementContent === 'object') {
          console.log('🎯 Using element-specific content from AI:', generatedContent.elementContent);
          
          // Filter layout elements the same way as form rendering
          const filteredLayoutElements = layoutElements.filter((el: any) => {
            if (el.type === 'shape') return true;
            const label = el.config?.label || '';
            return label && label.trim() !== '';
          });
          
          // Map element content by element ID
          filteredLayoutElements.forEach((el: any, filteredIndex: number) => {
            const elementId = el.id;
            const elementContent = generatedContent.elementContent[elementId];
            
            if (elementContent !== undefined && elementContent !== null) {
              // For image/logo fields, use unique ID with filtered index (matches form rendering)
              if (el.type === 'image' || el.type === 'logo') {
                const uniqueId = `${elementId}-${filteredIndex}`;
                mappedContent[uniqueId] = elementContent;
                console.log(`  ✅ Mapped element "${elementId}" to form field "${uniqueId}":`, elementContent);
              } else {
                // For other fields, use element ID directly
                mappedContent[elementId] = elementContent;
                console.log(`  ✅ Mapped element "${elementId}":`, elementContent);
              }
            }
          });
        }

        // PRIORITY 2: Fallback to legacy mapping if elementContent not provided
        // Map title to first text field with "title" or "headline" in label
        // Only map if not already mapped from elementContent
        if (generatedContent.title && !mappedContent[fields.find((f: any) => {
          const label = f.label?.toLowerCase() || '';
          return f.type === 'text' && (label.includes('title') || label.includes('headline'));
        })?.id]) {
          const titleField = fields.find((f: any) => {
            const label = f.label?.toLowerCase() || '';
            return f.type === 'text' && (label.includes('title') || label.includes('headline'));
          });
          if (titleField) {
            mappedContent[titleField.id] = generatedContent.title;
          }
        }

        // Map description to text fields with various labels (only if not already mapped)
        if (generatedContent.description) {
          const descFields = fields.filter((f: any) => {
            const label = f.label?.toLowerCase() || '';
            return f.type === 'text' && (
              label.includes('description') ||
              label.includes('subtitle') ||
              label.includes('body') ||
              label.includes('content') ||
              label.includes('text')
            ) && !label.includes('title') && !label.includes('headline') && !mappedContent[f.id];
          });
          descFields.forEach((field: any) => {
            mappedContent[field.id] = generatedContent.description;
          });
        }

        // Map tagline separately if available
        if (generatedContent.tagline) {
          const taglineFields = fields.filter((f: any) => {
            const label = f.label?.toLowerCase() || '';
            return f.type === 'text' && label.includes('tagline');
          });
          taglineFields.forEach((field: any) => {
            mappedContent[field.id] = generatedContent.tagline;
          });
        }

        // Map bullets to text fields with "bullet", "point", "feature" in label (only if not already mapped)
        if (generatedContent.bullets && Array.isArray(generatedContent.bullets)) {
          const bulletFields = fields.filter((f: any) => {
            const label = f.label?.toLowerCase() || '';
            return f.type === 'text' && 
              (label.includes('bullet') || label.includes('point') || label.includes('feature') || label.includes('stat')) &&
              !mappedContent[f.id];
          });
          bulletFields.forEach((field: any, index: number) => {
            if (index < generatedContent.bullets.length) {
              mappedContent[field.id] = generatedContent.bullets[index];
            }
          });
        }

        // Map stats to data/number fields (only if not already mapped)
        if (generatedContent.stats && Array.isArray(generatedContent.stats)) {
          const dataFields = fields.filter((f: any) => f.type === 'data' && !mappedContent[f.id]);
          dataFields.forEach((field: any, index: number) => {
            if (index < generatedContent.stats.length) {
              mappedContent[field.id] = generatedContent.stats[index];
            }
          });
        }

        // Map AI-selected images to image fields
        if (generatedContent.images && Array.isArray(generatedContent.images) && generatedContent.images.length > 0) {
          // Filter fields the EXACT same way as form rendering
          const filteredFields = fields.filter((field: any) => {
            // Include all shapes (they get auto-labeled)
            if (field.type === 'shape') return true;
            // Skip fields without labels
            if (!field.label || field.label.trim() === '') return false;
            return true;
          });

          // Get image fields with their filtered indices
          const imageFields = filteredFields
            .map((f: any, filteredIndex: number) => ({ 
              field: f, 
              filteredIndex,
              uniqueId: (f.type === 'image' || f.type === 'logo') ? `${f.id}-${filteredIndex}` : f.id
            }))
            .filter(({ field }) => field.type === 'image' || field.type === 'logo');

          // Map AI-selected images to image fields (up to the number of available image fields)
          generatedContent.images.forEach((imageUrl: string, index: number) => {
            if (index < imageFields.length) {
              const { uniqueId } = imageFields[index];
              mappedContent[uniqueId] = imageUrl;
            }
          });
        }

        // Apply brand colors to shapes automatically (fill color only)
        if (brandKit) {
          // Find shapes in layout elements
          const layoutElements = template.layout?.elements || [];
          const shapeElements = layoutElements.filter((el: any) => el.type === 'shape');
          
          // Apply brand colors to shape fills
          shapeElements.forEach((shape: any, index: number) => {
            // Alternate between brand colors
            if (index === 0) {
              mappedContent[`${shape.id}_fill`] = brandKit.primaryColor || '#3b82f6';
            } else if (index === 1) {
              mappedContent[`${shape.id}_fill`] = brandKit.secondaryColor || brandKit.primaryColor || '#64748b';
            } else if (index === 2) {
              mappedContent[`${shape.id}_fill`] = brandKit.accentColor || brandKit.primaryColor || '#93c5fd';
            } else {
              // Alternate between brand colors for additional shapes
              const colors = [brandKit.primaryColor, brandKit.secondaryColor, brandKit.accentColor].filter(Boolean);
              mappedContent[`${shape.id}_fill`] = colors[index % colors.length] || '#3b82f6';
            }
          });
        }

        setFormData((prev: any) => ({ ...prev, ...mappedContent }));

        toast({
          title: "Content Generated",
          description: "AI has pre-populated the fields based on your business profile.",
        });
      } catch (error) {
        console.error('Error generating content:', error);
        // Silently fail - user can still manually enter content
      } finally {
        setIsGenerating(false);
      }
    };

    generateContent();
  }, [businessProfile]); // Run when businessProfile becomes available

  // Helper to resolve background color from template styling
  const resolveBackgroundColor = () => {
    const styling = template.defaultStyling;

    // Check if template has background definition
    if (styling?.background) {
      if (styling.background.type === 'solid') {
        // Use fallback color for solid backgrounds
        return styling.background.fallback || '#FFFFFF';
      } else if (styling.background.type === 'gradient') {
        // For gradients (now converted to solid), use brand color
        if (styling.background.usesBrandColor === 'primary') {
          return brandKit?.primaryColor || '#FFFFFF';
        } else if (styling.background.usesBrandColor === 'secondary') {
          return brandKit?.secondaryColor || '#FFFFFF';
        }
        return '#FFFFFF';
      }
    }

    return '#FFFFFF'; // Default to white
  };

  // Helper to resolve text color from template styling
  const resolveTextColor = () => {
    const styling = template.defaultStyling;

    if (styling?.colorScheme?.titleColor) {
      const titleColor = styling.colorScheme.titleColor;
      if (titleColor.usesBrandColor === 'primary') {
        return brandKit?.primaryColor || titleColor.fallback || '#333333';
      } else if (titleColor.usesBrandColor === 'contrast') {
        // Contrast means white on dark, dark on white
        const bgColor = resolveBackgroundColor();
        return bgColor === '#FFFFFF' || bgColor === '#ffffff' ? '#333333' : '#FFFFFF';
      }
      return titleColor.fallback || '#333333';
    }

    return '#333333';
  };

  // Convert layout.elements to positioned elements and content (same logic as server)
  const convertLayoutToPreview = () => {
    const layoutElements = template.layout?.elements || [];

    // If no layout elements, use old format
    if (layoutElements.length === 0) {
      return {
        content: {
          titles: formData.title ? [formData.title] : [],
          descriptions: formData.description || formData.tagline
            ? [formData.description || formData.tagline]
            : [],
          bullets: formData.bullets || formData.features || formData.stats || formData.contact || [],
          logos: brandKit?.logoUrl ? [brandKit.logoUrl] : [],
        },
        positionedElements: template.positioningRules || {},
      };
    }

    // Create a map to track which schema field and filtered index each layout element should use
    // Match layout image elements to contentSchema image fields by simple order
    // IMPORTANT: Use the EXACT SAME field enhancement logic as the form
    const layoutToSchemaMap = new Map<number, { fieldId: string; filteredIndex: number }>();
    if (template.contentSchema?.fields) {
      // Enhance fields the SAME way as the form (add shapes from layout)
      const schemaFields = template.contentSchema.fields;
      const shapeElements = layoutElements.filter((el: any) => el.type === 'shape');
      const schemaShapeIds = new Set(schemaFields.filter((f: any) => f.type === 'shape').map((f: any) => f.id));
      const missingShapes = shapeElements.filter((shape: any) => !schemaShapeIds.has(shape.id));
      
      // Add missing shapes to schema dynamically (same as form)
      const enhancedFields = [
        ...schemaFields,
        ...missingShapes.map((shape: any, idx: number) => ({
          id: shape.id,
          type: 'shape',
          label: `Shape ${idx + 1}`,
          config: {
            fill: shape.config?.fill || shape.styling?.backgroundColor || '#E5E7EB',
            stroke: shape.config?.stroke || shape.styling?.borderColor || '#9CA3AF',
            strokeWidth: shape.config?.strokeWidth || 2,
          },
        })),
      ];
      
      // Filter fields the EXACT same way as the form
      const filteredFields = enhancedFields.filter((field: any) => {
        // Include all shapes (they get auto-labeled)
        if (field.type === 'shape') return true;
        // Skip fields without labels
        if (!field.label || field.label.trim() === '') return false;
        return true;
      });
      
      // Get all image fields from filtered fields in order (using filtered index)
      // This matches exactly how the form creates unique IDs
      const imageSchemaFields: Array<{ field: any; filteredIndex: number }> = [];
      filteredFields.forEach((f: any, filteredIdx: number) => {
        if (f.type === 'image' || f.type === 'logo') {
          imageSchemaFields.push({ field: f, filteredIndex: filteredIdx });
        }
      });
      
      // Get all image layout elements in order (preserving their original indices)
      const imageLayoutElements: Array<{ element: any; originalIndex: number }> = [];
      layoutElements.forEach((el: any, idx: number) => {
        if (el.type === 'image' || el.type === 'logo') {
          imageLayoutElements.push({ element: el, originalIndex: idx });
        }
      });
      
      // Simple 1-to-1 matching by order: first layout image -> first schema image
      // Store both the schema fieldId and filteredIndex so we can create the correct uniqueFieldId
      imageLayoutElements.forEach(({ originalIndex: layoutIndex }, imageOrderIndex: number) => {
        if (imageOrderIndex < imageSchemaFields.length) {
          const { field, filteredIndex } = imageSchemaFields[imageOrderIndex];
          layoutToSchemaMap.set(layoutIndex, { fieldId: field.id, filteredIndex });
        }
      });
    }

    // NEW FORMAT: Process layout.elements
    const positionedElements: any = {};
    const content: any = {
      titles: [],
      descriptions: [],
      bullets: [],
      logos: [],
      // NEW: Add _elementContent for ElementRenderer
      _elementContent: {},
    };

    let titleIndex = 0;
    let descriptionIndex = 0;
    let bulletIndex = 0;
    let logoIndex = 0;

    layoutElements.forEach((el: any, layoutIndex: number) => {
      const fieldId = el.id;
      const label = el.config?.label?.toLowerCase() || fieldId.toLowerCase();
      
      // For image elements, get the unique field ID from the mapping
      // Use the schema field's fieldId and filtered index (which matches what the form uses)
      let uniqueFieldId = fieldId;
      if ((el.type === 'image' || el.type === 'logo') && layoutToSchemaMap.has(layoutIndex)) {
        const { fieldId: schemaFieldId, filteredIndex } = layoutToSchemaMap.get(layoutIndex)!;
        // Use the schema field's fieldId, not the layout element's fieldId
        // This ensures the key matches what the form creates
        uniqueFieldId = `${schemaFieldId}-${filteredIndex}`;
      }

      // Parse pixel values from zone
      const parsePixelValue = (val: string | number): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') {
          const parsed = parseFloat(val);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      // Map positioning
      let positionKey = fieldId;
      if (el.type === 'text') {
        const fieldContent = formData[fieldId] || el.config?.placeholder || el.config?.defaultValue || '';
        // Store in _elementContent for ElementRenderer
        content._elementContent[fieldId] = fieldContent;

        if (label.includes('title') || label.includes('headline')) {
          positionKey = titleIndex === 0 ? 'title' : `title-${titleIndex}`;
          content.titles.push(fieldContent);
          titleIndex++;
        } else if (label.includes('bullet') || label.includes('point')) {
          positionKey = bulletIndex === 0 ? 'bullets' : `bullet-${bulletIndex}`;
          content.bullets.push(fieldContent);
          bulletIndex++;
        } else {
          positionKey = descriptionIndex === 0 ? 'description' : `description-${descriptionIndex}`;
          content.descriptions.push(fieldContent);
          descriptionIndex++;
        }
      } else if (el.type === 'image') {
        const mediaType = el.config?.mediaType || '';
        if (mediaType === 'logo' || fieldId.includes('logo')) {
          positionKey = logoIndex === 0 ? 'logo' : `logo-${logoIndex}`;
          // For logos, use unique field ID to lookup formData
          // Prioritize user-selected image from formData, fall back to brandKit logo
          const logoUrl = formData[uniqueFieldId] || brandKit?.logoUrl;
          if (logoUrl) {
            content.logos.push(logoUrl);
            // CRITICAL FIX: Store content ONLY using layout index to ensure uniqueness
            // Do NOT store under non-indexed key to prevent overwrites
            const indexedContentKey = `${fieldId}-layout-${layoutIndex}`;
            content._elementContent[indexedContentKey] = logoUrl;
            logoIndex++;
          }
        } else {
          // For other images, use unique field ID to lookup formData
          const imageContent = formData[uniqueFieldId];
          if (imageContent) {
            // CRITICAL FIX: Store content ONLY using layout index to ensure uniqueness
            // Do NOT store under non-indexed key to prevent all images showing the same content
            const indexedContentKey = `${fieldId}-layout-${layoutIndex}`;
            content._elementContent[indexedContentKey] = imageContent;
          }
        }
      } else if (el.type === 'data') {
        // Data elements
        const dataContent = formData[fieldId] || el.config?.defaultValue || '123';
        content._elementContent[fieldId] = dataContent;
      } else if (el.type === 'shape') {
        // Shapes - store color customizations if provided
        const shapeData: any = { exists: true };

        // Check if user customized fill color
        if (formData[`${fieldId}_fill`]) {
          shapeData.fill = formData[`${fieldId}_fill`];
        } else if (el.config?.fill) {
          shapeData.fill = el.config.fill;
        }

        // Check if user customized stroke color (even though UI only shows fill)
        if (formData[`${fieldId}_stroke`]) {
          shapeData.stroke = formData[`${fieldId}_stroke`];
        } else if (el.config?.stroke) {
          shapeData.stroke = el.config.stroke;
        }

        // Store shape data for ElementRenderer
        content._elementContent[fieldId] = shapeData;
      }

      // Add positioned element
      if (el.zone) {
        positionedElements[positionKey] = {
          x: parsePixelValue(el.zone.x || 0),
          y: parsePixelValue(el.zone.y || 0),
          width: parsePixelValue(el.zone.width || 100),
          height: parsePixelValue(el.zone.height || 100),
        };
      }
    });

    return { content, positionedElements, layoutElements };
  };

  const { content: previewContent, positionedElements: previewPositionedElements, layoutElements: previewLayoutElements } = convertLayoutToPreview();

  // Create preview slide with current form data
  const previewSlide = {
    id: "preview",
    type: template.category,
    title: previewContent.titles[0] || formData.title || template.name,
    content: previewContent,
    styling: {
      // Apply processed styling (flat structure like backend does)
      backgroundColor: template.canvas?.backgroundColor || resolveBackgroundColor(),
      textColor: resolveTextColor(),
      primaryColor: brandKit?.primaryColor || '#3b82f6',
      secondaryColor: brandKit?.secondaryColor || '#64748b',
      accentColor: brandKit?.accentColor || '#10b981',
      fontFamily: brandKit?.fontFamily || 'Inter',
      titleFontSize: template.defaultStyling?.typography?.title?.fontSize || '2xl',
      descriptionFontSize: template.defaultStyling?.typography?.description?.fontSize || 'base',
      bulletFontSize: template.defaultStyling?.typography?.bullets?.fontSize || 'base',
      brandColors: brandKit ? {
        primary: brandKit.primaryColor,
        secondary: brandKit.secondaryColor,
        accent: brandKit.accentColor,
      } : undefined,
      logoUrl: brandKit?.logoUrl,
    },
    positionedElements: previewPositionedElements,
    // NEW: Include layoutElements for element-by-element rendering
    layoutElements: previewLayoutElements && previewLayoutElements.length > 0 ? previewLayoutElements : undefined,
    order: 1,
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleApply = async () => {
    // Convert formData to proper slide content format with _elementContent
    const { content: convertedContent } = convertLayoutToPreview();
    
    console.log('🚀 Applying template with converted content:', convertedContent);
    console.log('📝 Form data:', formData);
    
    // If onApply callback is provided (from deck-viewer), use it
    if (onApply) {
      // Pass converted content, not raw formData!
      onApply(convertedContent);
      // Don't call onClose() - let deck-viewer handle closing after mutation succeeds
      return;
    }

    // Otherwise, handle it directly (for standalone usage)
    if (!applyTemplate) {
      onClose();
      return;
    }

    setIsApplying(true);

    try {
      await applyTemplate.mutateAsync({
        templateId: template.id,
        content: convertedContent,
      });

      toast({
        title: "Template Applied",
        description: `${template.name} has been added to your deck`,
      });

      onClose();
    } catch (error: any) {
      console.error('❌ Error applying template:', error);

      if (error.upgradeRequired) {
        toast({
          title: "Premium Template",
          description: "This template requires a premium subscription",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to apply template",
          variant: "destructive",
        });
      }
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            {template.name}
          </DialogTitle>
          <DialogDescription>
            {template.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Left: Preview */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Preview</h3>
              <div className="border rounded-lg overflow-hidden w-full relative" style={{ paddingBottom: '56.25%', backgroundColor: previewSlide.styling.backgroundColor }}>
                <div className="absolute inset-0">
                  <SlideRenderer slide={previewSlide} />
                </div>
              </div>
            </div>

            {brandKit ? (
              <div className="text-xs text-gray-500 flex items-center gap-4">
                <span>Using your brand colors:</span>
                <div className="flex gap-1">
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: brandKit.primaryColor }}
                    title="Primary"
                  />
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: brandKit.secondaryColor }}
                    title="Secondary"
                  />
                  <div
                    className="w-4 h-4 rounded border"
                    style={{ backgroundColor: brandKit.accentColor }}
                    title="Accent"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-amber-600">
                ⚠️ No brand kit selected - using default colors
              </p>
            )}
          </div>

          {/* Right: Content Form */}
          <div className="space-y-4 relative">
            <h3 className="text-sm font-medium flex items-center gap-2">
              Customize Content
              {isGenerating && (
                <span className="text-xs text-blue-600 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Generating with AI...
                </span>
              )}
            </h3>

            <div className="space-y-4">
              {(() => {
                const schemaFields = template.contentSchema?.fields || [];
                const layoutElements = template.layout?.elements || [];
                
                // Find shapes in layout that aren't in schema
                const shapeElements = layoutElements.filter((el: any) => el.type === 'shape');
                const schemaShapeIds = new Set(schemaFields.filter((f: any) => f.type === 'shape').map((f: any) => f.id));
                const missingShapes = shapeElements.filter((shape: any) => !schemaShapeIds.has(shape.id));
                
                // Add missing shapes to schema dynamically
                const enhancedFields = [
                  ...schemaFields,
                  ...missingShapes.map((shape: any, idx: number) => ({
                    id: shape.id,
                    type: 'shape',
                    label: `Shape ${idx + 1}`,
                    config: {
                      fill: shape.config?.fill || shape.styling?.backgroundColor || '#E5E7EB',
                      stroke: shape.config?.stroke || shape.styling?.borderColor || '#9CA3AF',
                      strokeWidth: shape.config?.strokeWidth || 2,
                      shape: shape.config?.shape || 'rectangle',
                    },
                  })),
                ];
                
                const filteredFields = enhancedFields.filter((field: any) => {
                  // Skip fields without labels (except shapes which we auto-label)
                  if (field.type === 'shape') return true;
                  if (!field.label || field.label.trim() === '') return false;
                  return true;
                });
                
                if (filteredFields.length === 0) {
                  return (
                    <p className="text-sm text-gray-500">
                      No customization fields available for this template.
                    </p>
                  );
                }
                
                return filteredFields.map((field: any, index: number) => {
                    // For image/logo fields, create a unique ID by combining field.id with index
                    // This ensures each image field has its own formData entry even if field.id is duplicated
                    const isImageField = field.type === 'image' || field.type === 'logo';
                    const uniqueFieldId = isImageField ? `${field.id}-${index}` : field.id;
                    
                    return (
                      <div key={`${uniqueFieldId}-${index}`} className="space-y-2">
                      <Label htmlFor={uniqueFieldId}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>

                      {field.type === "bullets" ? (
                        <Textarea
                          id={field.id}
                          placeholder={field.placeholder || "Enter one item per line"}
                          value={
                            Array.isArray(formData[field.id])
                              ? formData[field.id].join("\n")
                              : formData[field.id] || ""
                          }
                          onChange={(e) =>
                            handleFieldChange(
                              field.id,
                              e.target.value.split("\n").filter((line) => line.trim())
                            )
                          }
                          rows={4}
                        />
                      ) : field.type === "data" ? (
                        <Input
                          id={field.id}
                          type="text"
                          placeholder={field.placeholder || "Enter value (e.g., 1000, 50, 2024)"}
                          value={formData[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="font-mono"
                        />
                      ) : field.type === "richText" || field.type === "text" ? (
                        field.maxLength && field.maxLength > 100 ? (
                          <Textarea
                            id={field.id}
                            placeholder={field.placeholder}
                            value={formData[field.id] || ""}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            maxLength={field.maxLength}
                            rows={3}
                          />
                        ) : (
                          <Input
                            id={field.id}
                            type="text"
                            placeholder={field.placeholder}
                            value={formData[field.id] || ""}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            maxLength={field.maxLength}
                          />
                        )
                      ) : field.type === "image" || field.type === "logo" ? (() => {
                        // Use uniqueFieldId for image fields to ensure each has its own formData entry
                        const currentFieldId = uniqueFieldId;
                        return (
                          <div key={currentFieldId} className="space-y-2">
                            {formData[currentFieldId] && (
                              <div className="w-full h-32 rounded border overflow-hidden bg-gray-50 flex items-center justify-center">
                                <img
                                  src={formData[currentFieldId]}
                                  alt="Preview"
                                  className="max-w-full max-h-full object-contain"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              </div>
                            )}
                            <div className="flex gap-2">
                              <Input
                                id={currentFieldId}
                                type="url"
                                placeholder={field.placeholder || "Enter image URL or select from media library"}
                                value={formData[currentFieldId] || ""}
                                onChange={(e) => handleFieldChange(currentFieldId, e.target.value)}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPickerFieldId(currentFieldId);
                                  setPickerOpen(true);
                                }}
                                className="ml-2"
                              >
                                Choose Image
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                              💡 Tip: Paste an image URL or select from your media library
                            </p>
                            {pickerOpen && pickerFieldId === currentFieldId && !projectId && (
                              <p className="text-xs text-amber-600 mt-2">
                                ⚠️ Media library requires a project ID. Please enter image URL manually.
                              </p>
                            )}
                            {/* Render picker for this specific field only - with key to ensure uniqueness */}
                            {pickerOpen && pickerFieldId === currentFieldId && projectId && (
                              <MediaLibraryPicker
                                key={`picker-${currentFieldId}`}
                                projectId={projectId}
                                open={pickerOpen && pickerFieldId === currentFieldId}
                                onClose={() => {
                                  setPickerOpen(false);
                                  setPickerFieldId(null);
                                }}
                                onSelect={(url) => {
                                  // Explicitly use captured currentFieldId to ensure correct field
                                  handleFieldChange(currentFieldId, url);
                                  setPickerOpen(false);
                                  setPickerFieldId(null);
                                }}
                                currentValue={formData[currentFieldId]}
                              />
                            )}
                          </div>
                        );
                      })() : field.type === "shape" ? (
                        <div className="space-y-2">
                          <Label htmlFor={`${field.id}_fill`}>Fill Color</Label>
                          <div className="flex gap-2 items-center">
                            <Input
                              id={`${field.id}_fill`}
                              type="color"
                              value={formData[`${field.id}_fill`] || field.config?.fill || '#3b82f6'}
                              onChange={(e) => handleFieldChange(`${field.id}_fill`, e.target.value)}
                              className="w-20 h-10"
                            />
                            <Input
                              type="text"
                              value={formData[`${field.id}_fill`] || field.config?.fill || '#3b82f6'}
                              onChange={(e) => handleFieldChange(`${field.id}_fill`, e.target.value)}
                              placeholder="#3b82f6"
                              className="flex-1 font-mono text-sm"
                            />
                          </div>
                          {brandKit && (
                            <div className="flex gap-1 items-center mt-2">
                              <span className="text-xs text-gray-500 mr-1">Brand colors:</span>
                              <button
                                type="button"
                                onClick={() => handleFieldChange(`${field.id}_fill`, brandKit.primaryColor)}
                                className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                                style={{ backgroundColor: brandKit.primaryColor }}
                                title={`Primary: ${brandKit.primaryColor}`}
                              />
                              <button
                                type="button"
                                onClick={() => handleFieldChange(`${field.id}_fill`, brandKit.secondaryColor)}
                                className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                                style={{ backgroundColor: brandKit.secondaryColor }}
                                title={`Secondary: ${brandKit.secondaryColor}`}
                              />
                              <button
                                type="button"
                                onClick={() => handleFieldChange(`${field.id}_fill`, brandKit.accentColor)}
                                className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500 transition-colors"
                                style={{ backgroundColor: brandKit.accentColor }}
                                title={`Accent: ${brandKit.accentColor}`}
                              />
                            </div>
                          )}
                        </div>
                      ) : field.type === "logo" ? (
                        <p className="text-sm text-gray-500">
                          {brandKit
                            ? `Using ${brandKit.brandAssets?.filter((a: any) => a.type === 'logo').length || 0} logo(s) from your brand kit`
                            : "No brand kit selected"}
                        </p>
                      ) : (
                        <Input
                          id={field.id}
                          type="text"
                          placeholder={field.placeholder}
                          value={formData[field.id] || ""}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        />
                      )}

                      {field.maxLength && (
                        <p className="text-xs text-gray-500">
                          {(formData[field.id]?.length || 0)} / {field.maxLength} characters
                        </p>
                      )}
                      </div>
                    );
                });
              })()}
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                disabled={isApplying}
                className="flex-1"
              >
                {isApplying ? "Applying..." : "Apply Template"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

