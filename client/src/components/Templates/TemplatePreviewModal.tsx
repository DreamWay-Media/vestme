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
  businessProfile?: any;
  onClose: () => void;
  onApply?: (content: any) => void;
}

export function TemplatePreviewModal({
  template,
  brandKit,
  deckId,
  businessProfile,
  onClose,
  onApply,
}: TemplatePreviewModalProps) {
  console.log('🎭 TemplatePreviewModal Props:', {
    templateName: template?.name,
    hasBrandKit: !!brandKit,
    deckId,
    businessProfile,
    hasBusinessProfile: !!businessProfile
  });

  const { toast } = useToast();
  // Don't use mutation if onApply is provided (deck-viewer will handle it)
  const applyTemplate = (deckId && !onApply) ? useApplyTemplate(deckId) : null;

  // Initialize form state from template schema with null checks
  const initialFormState = template.contentSchema?.fields?.reduce((acc: any, field: any) => {
    acc[field.id] = field.defaultValue || "";
    return acc;
  }, {}) || {};

  const [formData, setFormData] = useState(initialFormState);
  const [isApplying, setIsApplying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  // Media library picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFieldId, setPickerFieldId] = useState<string | null>(null);
  const hasGeneratedRef = useRef(false); // Track if we've already generated content

  // Generate AI content when modal opens and businessProfile is available
  useEffect(() => {
    const generateContent = async () => {
      console.log('🤖 Checking if should generate AI content...');
      console.log('Business Profile:', businessProfile);
      console.log('Form Data:', formData);
      console.log('Has Generated Before:', hasGeneratedRef.current);

      // Skip if already generated
      if (hasGeneratedRef.current) {
        console.log('✋ Already generated content, skipping');
        return;
      }

      // Skip if no business profile
      if (!businessProfile) {
        console.log('❌ No business profile, skipping AI generation');
        return;
      }

      // Check if formData has meaningful content (not just empty strings)
      const hasMeaningfulContent = Object.values(formData).some(val => {
        if (Array.isArray(val)) {
          return val.length > 0 && val.some(v => v && String(v).trim());
        }
        return val && String(val).trim() !== '';
      });

      if (hasMeaningfulContent) {
        console.log('⚠️ Form already has content, skipping AI generation');
        return;
      }

      console.log('✅ Generating AI content...');
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
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate content');
        }

        const generatedContent = await response.json();

        console.log('📥 AI Generated Content:', generatedContent);
        console.log('📋 Template Schema Fields:', template.contentSchema?.fields);

        // Map generated content to ACTUAL form field IDs from template schema
        const mappedContent: any = {};

        // Get actual field IDs from template
        const fields = template.contentSchema?.fields || [];

        // Map title to first text field with "title" or "headline" in label
        if (generatedContent.title) {
          const titleField = fields.find((f: any) => {
            const label = f.label?.toLowerCase() || '';
            return f.type === 'text' && (label.includes('title') || label.includes('headline'));
          });
          if (titleField) {
            mappedContent[titleField.id] = generatedContent.title;
            console.log(`✅ Mapped title to field: ${titleField.id}`);
          }
        }

        // Map description to text fields with various labels
        if (generatedContent.description) {
          const descFields = fields.filter((f: any) => {
            const label = f.label?.toLowerCase() || '';
            return f.type === 'text' && (
              label.includes('description') ||
              label.includes('subtitle') ||
              label.includes('body') ||
              label.includes('content') ||
              label.includes('text')
            ) && !label.includes('title') && !label.includes('headline');
          });
          descFields.forEach((field: any) => {
            mappedContent[field.id] = generatedContent.description;
            console.log(`✅ Mapped description to field: ${field.id} (${field.label})`);
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
            console.log(`✅ Mapped tagline to field: ${field.id} (${field.label})`);
          });
        }

        // Map bullets to text fields with "bullet", "point", "feature" in label
        if (generatedContent.bullets && Array.isArray(generatedContent.bullets)) {
          const bulletFields = fields.filter((f: any) => {
            const label = f.label?.toLowerCase() || '';
            return f.type === 'text' && (label.includes('bullet') || label.includes('point') || label.includes('feature') || label.includes('stat'));
          });
          bulletFields.forEach((field: any, index: number) => {
            if (index < generatedContent.bullets.length) {
              mappedContent[field.id] = generatedContent.bullets[index];
              console.log(`✅ Mapped bullet to field: ${field.id} (${field.label})`);
            }
          });
        }

        console.log('🗺️ Final Mapped Content:', mappedContent);
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

    layoutElements.forEach((el: any) => {
      const fieldId = el.id;
      const label = el.config?.label?.toLowerCase() || fieldId.toLowerCase();

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
          if (brandKit?.logoUrl) {
            content.logos.push(brandKit.logoUrl);
            // Store in _elementContent for ElementRenderer
            content._elementContent[fieldId] = brandKit.logoUrl;
            logoIndex++;
          }
        } else {
          // For other images, store content if provided
          const imageContent = formData[fieldId];
          if (imageContent) {
            content._elementContent[fieldId] = imageContent;
          }
        }
      } else if (el.type === 'data') {
        // Data elements
        const dataContent = formData[fieldId] || el.config?.defaultValue || '123';
        content._elementContent[fieldId] = dataContent;
      } else if (el.type === 'shape') {
        // Shapes - store color customizations if provided
        const shapeData: any = { exists: true };

        // Check if user customized colors
        if (formData[`${fieldId}_fill`]) {
          shapeData.fill = formData[`${fieldId}_fill`];
        } else if (el.config?.fill) {
          shapeData.fill = el.config.fill;
        }

        if (formData[`${fieldId}_stroke`]) {
          shapeData.stroke = formData[`${fieldId}_stroke`];
        } else if (el.config?.stroke) {
          shapeData.stroke = el.config.stroke;
        }

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

  // Debug preview styling
  console.log('🎨 Template Preview Debug:', {
    templateName: template.name,
    hasLayoutElements: template.layout?.elements?.length || 0,
    layoutElements: template.layout?.elements,
    previewLayoutElements: previewLayoutElements,
    previewContent: previewContent,
    previewContentElementContent: previewContent._elementContent,
    positionedElements: previewPositionedElements,
    positionedElementsKeys: Object.keys(previewPositionedElements),
    backgroundColor: previewSlide.styling.backgroundColor,
    textColor: previewSlide.styling.textColor,
    formData,
    previewSlideHasLayoutElements: !!previewSlide.layoutElements,
  });

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleApply = async () => {
    console.log('🎬 TemplatePreviewModal handleApply called');
    console.log('Form data:', formData);
    console.log('Has onApply callback:', !!onApply);
    console.log('Has applyTemplate mutation:', !!applyTemplate);

    // If onApply callback is provided (from deck-viewer), use it
    if (onApply) {
      console.log('✅ Using onApply callback (deck-viewer will handle)');
      onApply(formData);
      // Don't call onClose() - let deck-viewer handle closing after mutation succeeds
      return;
    }

    // Otherwise, handle it directly (for standalone usage)
    if (!applyTemplate) {
      console.log('⚠️ No mutation available');
      onClose();
      return;
    }

    setIsApplying(true);

    try {
      console.log('🚀 Calling applyTemplate mutation with:', {
        templateId: template.id,
        content: formData,
      });

      await applyTemplate.mutateAsync({
        templateId: template.id,
        content: formData,
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
              {template.contentSchema?.fields && template.contentSchema.fields.length > 0 ? (
                template.contentSchema.fields
                  .filter((field: any) => {
                    // Include all image fields (including logos)
                    // Skip fields without labels
                    if (!field.label || field.label.trim() === '') return false;
                    return true;
                  })
                  .map((field: any) => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>
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
                      ) : field.type === "image" ? (
                        <div className="space-y-2">
                          {formData[field.id] && (
                            <img
                              src={formData[field.id]}
                              alt="Preview"
                              className="w-full h-32 object-cover rounded border"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}
                          <div className="flex gap-2">
                            <Input
                              id={field.id}
                              type="url"
                              placeholder={field.placeholder || "Enter image URL or select from media library"}
                              value={formData[field.id] || ""}
                              onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPickerFieldId(field.id);
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
                          {pickerOpen && pickerFieldId && (
                            <MediaLibraryPicker
                              projectId={deckId ?? ''}
                              open={pickerOpen}
                              onClose={() => setPickerOpen(false)}
                              onSelect={(url) => {
                                handleFieldChange(pickerFieldId, url);
                                setPickerOpen(false);
                                setPickerFieldId(null);
                              }}
                              currentValue={formData[pickerFieldId]}
                            />
                          )}
                        </div>
                      ) : field.type === "shape" ? (
                        <div className="space-y-3">
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
                          </div>

                          {(field.config?.strokeWidth || field.config?.stroke) && (
                            <div className="space-y-2">
                              <Label htmlFor={`${field.id}_stroke`}>Border Color</Label>
                              <div className="flex gap-2 items-center">
                                <Input
                                  id={`${field.id}_stroke`}
                                  type="color"
                                  value={formData[`${field.id}_stroke`] || field.config?.stroke || '#000000'}
                                  onChange={(e) => handleFieldChange(`${field.id}_stroke`, e.target.value)}
                                  className="w-20 h-10"
                                />
                                <Input
                                  type="text"
                                  value={formData[`${field.id}_stroke`] || field.config?.stroke || '#000000'}
                                  onChange={(e) => handleFieldChange(`${field.id}_stroke`, e.target.value)}
                                  placeholder="#000000"
                                  className="flex-1 font-mono text-sm"
                                />
                              </div>
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
                  ))
              ) : (
                <p className="text-sm text-gray-500">
                  No customization fields available for this template.
                </p>
              )}
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

