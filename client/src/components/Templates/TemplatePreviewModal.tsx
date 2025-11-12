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
        
        // Map generated content to form fields
        const mappedContent: any = {};
        if (generatedContent.title) mappedContent.title = generatedContent.title;
        if (generatedContent.description) {
          mappedContent.description = generatedContent.description;
          mappedContent.tagline = generatedContent.description;
        }
        if (generatedContent.bullets && Array.isArray(generatedContent.bullets)) {
          mappedContent.bullets = generatedContent.bullets;
          mappedContent.features = generatedContent.bullets;
          mappedContent.stats = generatedContent.bullets;
        }
        
        setFormData(prev => ({ ...prev, ...mappedContent }));
        
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
  
  // Check if template defines logo elements
  const templateHasLogo = template.layout?.elements?.some((el: any) => el.type === 'logo');
  
  // Create preview slide with current form data
  const previewSlide = {
    id: "preview",
    type: template.category,
    title: formData.title || template.name,
    content: {
      titles: formData.title ? [formData.title] : [],
      descriptions: formData.description || formData.tagline 
        ? [formData.description || formData.tagline] 
        : [],
      bullets: formData.bullets || formData.features || formData.stats || formData.contact || [],
      // Only include logos if template defines them
      logos: templateHasLogo ? (
        brandKit?.brandAssets
          ?.filter((asset: any) => asset.type === 'logo')
          .map((asset: any) => asset.url) || 
          (brandKit?.logoUrl ? [brandKit.logoUrl] : [])
      ) : [],
    },
    styling: {
      // Apply processed styling (flat structure like backend does)
      backgroundColor: resolveBackgroundColor(),
      textColor: resolveTextColor(),
      primaryColor: brandKit?.primaryColor || '#3b82f6',
      secondaryColor: brandKit?.secondaryColor || '#64748b',
      accentColor: brandKit?.accentColor || '#10b981',
      fontFamily: brandKit?.fontFamily || 'Inter',
      titleFontSize: template.defaultStyling?.typography?.title?.fontSize || '3xl',
      descriptionFontSize: template.defaultStyling?.typography?.description?.fontSize || 'lg',
      bulletFontSize: template.defaultStyling?.typography?.bullets?.fontSize || 'base',
      brandColors: brandKit ? {
        primary: brandKit.primaryColor,
        secondary: brandKit.secondaryColor,
        accent: brandKit.accentColor,
      } : undefined,
    },
    positionedElements: template.positioningRules || {},
    order: 1,
  };
  
  // Debug preview styling
  console.log('🎨 Preview Slide Styling:', {
    templateName: template.name,
    backgroundColor: previewSlide.styling.backgroundColor,
    textColor: previewSlide.styling.textColor,
    templateBackgroundDef: template.defaultStyling?.background,
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
              <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: previewSlide.styling.backgroundColor }}>
                <SlideRenderer slide={previewSlide} />
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
                template.contentSchema.fields.map((field: any) => (
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

