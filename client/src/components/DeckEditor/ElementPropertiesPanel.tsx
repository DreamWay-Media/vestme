/**
 * Element Properties Panel
 * Shows and edits properties of selected elements in deck viewer
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { WysiwygEditor } from "@/components/WysiwygEditor";
import { MediaLibraryPicker } from "@/components/MediaLibrary/MediaLibraryPicker";
import { useState } from "react";
import { Image, Palette, Type, Hash } from "lucide-react";

interface ElementPropertiesPanelProps {
  elementId: string;
  element: any;
  content: any;
  onUpdate: (updates: { content?: any; styling?: any; config?: any }) => void;
  projectId?: string;
  onSelectImage?: () => void; // Callback to open media library
}

export function ElementPropertiesPanel({
  elementId,
  element,
  content,
  onUpdate,
  projectId,
  onSelectImage,
}: ElementPropertiesPanelProps) {
  const [localContent, setLocalContent] = useState(content || '');
  const [localStyling, setLocalStyling] = useState(element.styling || {});
  const [localConfig, setLocalConfig] = useState(element.config || {});
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);

  const handleContentChange = (newContent: any) => {
    setLocalContent(newContent);
    onUpdate({ content: newContent });
  };

  const handleStylingChange = (key: string, value: any) => {
    const newStyling = { ...localStyling, [key]: value };
    setLocalStyling(newStyling);
    onUpdate({ styling: newStyling });
  };

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onUpdate({ config: newConfig });
  };

  return (
    <div className="flex flex-col h-full bg-white border-l">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          {element.type === 'text' && <Type className="w-5 h-5 text-blue-600" />}
          {element.type === 'image' && <Image className="w-5 h-5 text-blue-600" />}
          {element.type === 'shape' && <Palette className="w-5 h-5 text-blue-600" />}
          {element.type === 'data' && <Hash className="w-5 h-5 text-blue-600" />}
          <h2 className="text-lg font-semibold">Element Properties</h2>
        </div>
        <p className="text-sm text-muted-foreground capitalize">
          {element.type} Element
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          ID: {elementId}
        </p>
      </div>

      {/* Properties */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="layout">Layout</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              {element.type === 'text' && (
                <TextContentProperties
                  element={element}
                  content={localContent}
                  onContentChange={handleContentChange}
                  projectId={projectId}
                />
              )}

              {element.type === 'image' && (
                <ImageContentProperties
                  element={element}
                  content={localContent}
                  onContentChange={handleContentChange}
                  projectId={projectId}
                  onSelectImage={() => setMediaPickerOpen(true)}
                />
              )}

              {element.type === 'data' && (
                <DataContentProperties
                  element={element}
                  content={localContent}
                  onContentChange={handleContentChange}
                />
              )}

              {element.type === 'shape' && (
                <div className="text-sm text-muted-foreground">
                  Shapes don't have editable content. Use the Style tab to change colors.
                </div>
              )}
            </TabsContent>

            <TabsContent value="style" className="space-y-4 mt-4">
              {element.type === 'text' && (
                <TextStyleProperties
                  styling={localStyling}
                  onStylingChange={handleStylingChange}
                />
              )}

              {element.type === 'image' && (
                <ImageStyleProperties
                  config={localConfig}
                  onConfigChange={handleConfigChange}
                />
              )}

              {element.type === 'shape' && (
                <ShapeStyleProperties
                  config={localConfig}
                  content={content}
                  onConfigChange={handleConfigChange}
                  onContentChange={handleContentChange}
                />
              )}

              {element.type === 'data' && (
                <DataStyleProperties
                  styling={localStyling}
                  onStylingChange={handleStylingChange}
                />
              )}
            </TabsContent>

            <TabsContent value="layout" className="space-y-4 mt-4">
              <LayoutProperties element={element} />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
      
      {/* Media Library Picker Modal */}
      {element.type === 'image' && projectId && (
        <MediaLibraryPicker
          projectId={projectId}
          open={mediaPickerOpen}
          onClose={() => setMediaPickerOpen(false)}
          onSelect={(url) => {
            handleContentChange(url);
            setMediaPickerOpen(false);
          }}
          currentValue={typeof localContent === 'string' ? localContent : ''}
        />
      )}
    </div>
  );
}

// Text Content Properties
function TextContentProperties({
  element,
  content,
  onContentChange,
  projectId,
}: {
  element: any;
  content: any;
  onContentChange: (content: any) => void;
  projectId?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Text Content</Label>
        <div className="border rounded-md">
          <WysiwygEditor
            content={typeof content === 'string' ? content : ''}
            onChange={(html) => onContentChange(html)}
            projectId={projectId}
            context="slide element"
            minHeight="min-h-[120px]"
          />
        </div>
      </div>
    </div>
  );
}

// Image Content Properties
function ImageContentProperties({
  element,
  content,
  onContentChange,
  projectId,
  onSelectImage,
}: {
  element: any;
  content: any;
  onContentChange: (content: any) => void;
  projectId?: string;
  onSelectImage?: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Image URL</Label>
        <div className="flex gap-2">
          <Input
            value={typeof content === 'string' ? content : ''}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1"
          />
        </div>
        {onSelectImage && projectId && (
          <Button
            variant="outline"
            onClick={onSelectImage}
            className="w-full"
          >
            <Image className="w-4 h-4 mr-2" />
            Select from Media Library
          </Button>
        )}
      </div>
      {content && (
        <div className="space-y-2">
          <Label>Preview</Label>
          <div className="border rounded-md p-2 bg-gray-50">
            <img
              src={content}
              alt="Preview"
              className="max-w-full max-h-48 object-contain mx-auto"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Data Content Properties
function DataContentProperties({
  element,
  content,
  onContentChange,
}: {
  element: any;
  content: any;
  onContentChange: (content: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Value</Label>
        <Input
          value={typeof content === 'string' || typeof content === 'number' ? String(content) : ''}
          onChange={(e) => {
            const value = element.config?.format === 'number' 
              ? parseFloat(e.target.value) || 0
              : e.target.value;
            onContentChange(value);
          }}
          type={element.config?.format === 'number' ? 'number' : 'text'}
          placeholder="Enter value"
        />
      </div>
    </div>
  );
}

// Text Style Properties
function TextStyleProperties({
  styling,
  onStylingChange,
}: {
  styling: any;
  onStylingChange: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Font Size</Label>
        <Input
          value={styling.fontSize || '16px'}
          onChange={(e) => onStylingChange('fontSize', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Font Weight</Label>
        <Select
          value={styling.fontWeight || 'normal'}
          onValueChange={(value) => onStylingChange('fontWeight', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="500">Medium</SelectItem>
            <SelectItem value="600">Semi-Bold</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={styling.color || '#000000'}
            onChange={(e) => onStylingChange('color', e.target.value)}
            className="w-20 h-10"
          />
          <Input
            value={styling.color || '#000000'}
            onChange={(e) => onStylingChange('color', e.target.value)}
            className="flex-1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Text Align</Label>
        <Select
          value={styling.textAlign || 'left'}
          onValueChange={(value) => onStylingChange('textAlign', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="right">Right</SelectItem>
            <SelectItem value="justify">Justify</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Image Style Properties
function ImageStyleProperties({
  config,
  onConfigChange,
}: {
  config: any;
  onConfigChange: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Object Fit</Label>
        <Select
          value={config.objectFit || 'cover'}
          onValueChange={(value) => onConfigChange('objectFit', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
            <SelectItem value="fill">Fill</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// Shape Style Properties
function ShapeStyleProperties({
  config,
  content,
  onConfigChange,
  onContentChange,
}: {
  config: any;
  content: any;
  onConfigChange: (key: string, value: any) => void;
  onContentChange: (content: any) => void;
}) {
  const shapeData = content && typeof content === 'object' ? content : { fill: config.fill || '#E5E7EB', stroke: config.stroke };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Fill Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={shapeData.fill || config.fill || '#E5E7EB'}
            onChange={(e) => {
              const newShapeData = { ...shapeData, fill: e.target.value };
              onContentChange(newShapeData);
            }}
            className="w-20 h-10"
          />
          <Input
            value={shapeData.fill || config.fill || '#E5E7EB'}
            onChange={(e) => {
              const newShapeData = { ...shapeData, fill: e.target.value };
              onContentChange(newShapeData);
            }}
            className="flex-1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Stroke Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={shapeData.stroke || config.stroke || '#9CA3AF'}
            onChange={(e) => {
              const newShapeData = { ...shapeData, stroke: e.target.value };
              onContentChange(newShapeData);
            }}
            className="w-20 h-10"
          />
          <Input
            value={shapeData.stroke || config.stroke || '#9CA3AF'}
            onChange={(e) => {
              const newShapeData = { ...shapeData, stroke: e.target.value };
              onContentChange(newShapeData);
            }}
            className="flex-1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Stroke Width</Label>
        <Input
          type="number"
          value={config.strokeWidth || 2}
          onChange={(e) => onConfigChange('strokeWidth', parseInt(e.target.value) || 0)}
          min="0"
        />
      </div>
    </div>
  );
}

// Data Style Properties
function DataStyleProperties({
  styling,
  onStylingChange,
}: {
  styling: any;
  onStylingChange: (key: string, value: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Font Size</Label>
        <Input
          value={styling.fontSize || '48px'}
          onChange={(e) => onStylingChange('fontSize', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Font Weight</Label>
        <Select
          value={styling.fontWeight || 'bold'}
          onValueChange={(value) => onStylingChange('fontWeight', value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="500">Medium</SelectItem>
            <SelectItem value="600">Semi-Bold</SelectItem>
            <SelectItem value="bold">Bold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex gap-2">
          <Input
            type="color"
            value={styling.color || '#10B981'}
            onChange={(e) => onStylingChange('color', e.target.value)}
            className="w-20 h-10"
          />
          <Input
            value={styling.color || '#10B981'}
            onChange={(e) => onStylingChange('color', e.target.value)}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}

// Layout Properties (read-only for now)
function LayoutProperties({ element }: { element: any }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Position</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">X</Label>
            <Input value={element.zone?.x || 0} disabled />
          </div>
          <div>
            <Label className="text-xs">Y</Label>
            <Input value={element.zone?.y || 0} disabled />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Size</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Width</Label>
            <Input value={element.zone?.width || 0} disabled />
          </div>
          <div>
            <Label className="text-xs">Height</Label>
            <Input value={element.zone?.height || 0} disabled />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Z-Index</Label>
        <Input value={element.zIndex || 0} disabled />
      </div>
    </div>
  );
}

