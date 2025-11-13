/**
 * Properties Panel
 * Shows and edits properties of selected elements
 */

import { useDesignStudioStore } from '@/stores/designStudioStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Trash2, Copy, Lock, Unlock } from 'lucide-react';

export function PropertiesPanel() {
  const { selectedElementIds, template, getElementById, deleteElement, duplicateElement } = useDesignStudioStore();
  
  // Get first selected element
  const selectedElement = selectedElementIds.length === 1 
    ? getElementById(selectedElementIds[0])
    : null;
  
  if (!selectedElement) {
    return <NoSelection />;
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Properties</h2>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => duplicateElement(selectedElement.id)}
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteElement(selectedElement.id)}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground capitalize">
          {selectedElement.type} Element
        </p>
      </div>
      
      {/* Properties */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <Tabs defaultValue="layout" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="layout">Layout</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
            </TabsList>
            
            <TabsContent value="layout" className="space-y-4 mt-4">
              <LayoutProperties element={selectedElement} />
            </TabsContent>
            
            <TabsContent value="style" className="space-y-4 mt-4">
              <StyleProperties element={selectedElement} />
            </TabsContent>
            
            <TabsContent value="content" className="space-y-4 mt-4">
              <ContentProperties element={selectedElement} />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}

function NoSelection() {
  const { template, updateTemplateInfo } = useDesignStudioStore();
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Canvas Settings</h2>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Background Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={template.canvas.backgroundColor}
                onChange={(e) => updateTemplateInfo({
                  canvas: { ...template.canvas, backgroundColor: e.target.value }
                })}
                className="w-20 h-10"
              />
              <Input
                value={template.canvas.backgroundColor}
                onChange={(e) => updateTemplateInfo({
                  canvas: { ...template.canvas, backgroundColor: e.target.value }
                })}
                className="flex-1"
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="text-center text-sm text-muted-foreground py-8">
            Select an element to edit its properties
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function LayoutProperties({ element }: { element: any }) {
  const { updateElement } = useDesignStudioStore();
  
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>X Position</Label>
          <Input
            type="number"
            value={element.position.x}
            onChange={(e) => updateElement(element.id, {
              position: { ...element.position, x: parseFloat(e.target.value) || 0 }
            })}
          />
        </div>
        <div className="space-y-2">
          <Label>Y Position</Label>
          <Input
            type="number"
            value={element.position.y}
            onChange={(e) => updateElement(element.id, {
              position: { ...element.position, y: parseFloat(e.target.value) || 0 }
            })}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Width</Label>
          <Input
            type={element.size.width === 'auto' ? 'text' : 'number'}
            value={element.size.width}
            onChange={(e) => {
              const value = e.target.value === 'auto' ? 'auto' : parseFloat(e.target.value) || 0;
              updateElement(element.id, {
                size: { ...element.size, width: value }
              });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Height</Label>
          <Input
            type={element.size.height === 'auto' ? 'text' : 'number'}
            value={element.size.height}
            onChange={(e) => {
              const value = e.target.value === 'auto' ? 'auto' : parseFloat(e.target.value) || 0;
              updateElement(element.id, {
                size: { ...element.size, height: value }
              });
            }}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Z-Index (Layer)</Label>
        <Input
          type="number"
          value={element.zIndex}
          onChange={(e) => updateElement(element.id, {
            zIndex: parseInt(e.target.value) || 0
          })}
        />
      </div>
    </>
  );
}

function StyleProperties({ element }: { element: any }) {
  const { updateElementStyle } = useDesignStudioStore();
  
  if (element.type === 'text') {
    return (
      <>
        <div className="space-y-2">
          <Label>Font Size</Label>
          <Input
            value={element.style.fontSize || '16px'}
            onChange={(e) => updateElementStyle(element.id, { fontSize: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Font Weight</Label>
          <Select
            value={element.style.fontWeight || 'normal'}
            onValueChange={(value) => updateElementStyle(element.id, { fontWeight: value })}
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
              value={element.style.color || '#000000'}
              onChange={(e) => updateElementStyle(element.id, { color: e.target.value })}
              className="w-20 h-10"
            />
            <Input
              value={element.style.color || '#000000'}
              onChange={(e) => updateElementStyle(element.id, { color: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Text Align</Label>
          <Select
            value={element.style.textAlign || 'left'}
            onValueChange={(value) => updateElementStyle(element.id, { textAlign: value })}
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
      </>
    );
  }
  
  if (element.type === 'shape') {
    return (
      <>
        <div className="space-y-2">
          <Label>Fill Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={element.config.fill || '#E5E7EB'}
              onChange={(e) => updateElementStyle(element.id, { fill: e.target.value })}
              className="w-20 h-10"
            />
            <Input
              value={element.config.fill || '#E5E7EB'}
              onChange={(e) => updateElementStyle(element.id, { fill: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Stroke Color</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={element.config.stroke || '#9CA3AF'}
              onChange={(e) => updateElementStyle(element.id, { stroke: e.target.value })}
              className="w-20 h-10"
            />
            <Input
              value={element.config.stroke || '#9CA3AF'}
              onChange={(e) => updateElementStyle(element.id, { stroke: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Stroke Width</Label>
          <Input
            type="number"
            value={element.config.strokeWidth || 2}
            onChange={(e) => updateElementStyle(element.id, { strokeWidth: parseInt(e.target.value) || 0 })}
          />
        </div>
      </>
    );
  }
  
  if (element.type === 'image') {
    return (
      <>
        <div className="space-y-2">
          <Label>Border Radius</Label>
          <Input
            value={element.style.borderRadius || '0px'}
            onChange={(e) => updateElementStyle(element.id, { borderRadius: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Opacity</Label>
          <Input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={element.style.opacity || 1}
            onChange={(e) => updateElementStyle(element.id, { opacity: parseFloat(e.target.value) })}
          />
        </div>
      </>
    );
  }
  
  return (
    <div className="text-sm text-muted-foreground">
      No style properties available
    </div>
  );
}

function ContentProperties({ element }: { element: any }) {
  const { updateElementConfig } = useDesignStudioStore();
  
  if (element.type === 'text') {
    return (
      <>
        <div className="space-y-2">
          <Label>Field ID</Label>
          <Input
            value={element.config.fieldId}
            onChange={(e) => updateElementConfig(element.id, { fieldId: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Label</Label>
          <Input
            value={element.config.label}
            onChange={(e) => updateElementConfig(element.id, { label: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Placeholder</Label>
          <Input
            value={element.config.placeholder}
            onChange={(e) => updateElementConfig(element.id, { placeholder: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Default Value</Label>
          {element.config.multiline ? (
            <Textarea
              value={element.config.defaultValue}
              onChange={(e) => updateElementConfig(element.id, { defaultValue: e.target.value })}
              rows={4}
            />
          ) : (
            <Input
              value={element.config.defaultValue}
              onChange={(e) => updateElementConfig(element.id, { defaultValue: e.target.value })}
            />
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <Label>Required</Label>
          <Switch
            checked={element.config.required}
            onCheckedChange={(checked) => updateElementConfig(element.id, { required: checked })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Max Length</Label>
          <Input
            type="number"
            value={element.config.maxLength}
            onChange={(e) => updateElementConfig(element.id, { maxLength: parseInt(e.target.value) || 100 })}
          />
        </div>
      </>
    );
  }
  
  if (element.type === 'image') {
    return (
      <>
        <div className="space-y-2">
          <Label>Field ID</Label>
          <Input
            value={element.config.fieldId}
            onChange={(e) => updateElementConfig(element.id, { fieldId: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Media Type</Label>
          <Select
            value={element.config.mediaType}
            onValueChange={(value) => updateElementConfig(element.id, { mediaType: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="logo">Logo</SelectItem>
              <SelectItem value="product">Product</SelectItem>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="office">Office</SelectItem>
              <SelectItem value="hero">Hero Image</SelectItem>
              <SelectItem value="icon">Icon</SelectItem>
              <SelectItem value="screenshot">Screenshot</SelectItem>
              <SelectItem value="graphic">Graphic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Tags (comma-separated)</Label>
          <Input
            value={element.config.tags?.join(', ') || ''}
            onChange={(e) => updateElementConfig(element.id, {
              tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
            })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Object Fit</Label>
          <Select
            value={element.config.objectFit}
            onValueChange={(value) => updateElementConfig(element.id, { objectFit: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contain">Contain</SelectItem>
              <SelectItem value="cover">Cover</SelectItem>
              <SelectItem value="fill">Fill</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Fallback URL</Label>
          <Input
            value={element.config.fallbackUrl || ''}
            onChange={(e) => updateElementConfig(element.id, { fallbackUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
      </>
    );
  }
  
  if (element.type === 'data') {
    return (
      <>
        <div className="space-y-2">
          <Label>Field ID</Label>
          <Input
            value={element.config.fieldId}
            onChange={(e) => updateElementConfig(element.id, { fieldId: e.target.value })}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Data Path</Label>
          <Input
            value={element.config.dataPath}
            onChange={(e) => updateElementConfig(element.id, { dataPath: e.target.value })}
            placeholder="businessProfile.revenue"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Format</Label>
          <Select
            value={element.config.format}
            onValueChange={(value) => updateElementConfig(element.id, { format: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="currency">Currency</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Prefix</Label>
            <Input
              value={element.config.prefix || ''}
              onChange={(e) => updateElementConfig(element.id, { prefix: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Suffix</Label>
            <Input
              value={element.config.suffix || ''}
              onChange={(e) => updateElementConfig(element.id, { suffix: e.target.value })}
            />
          </div>
        </div>
      </>
    );
  }
  
  return (
    <div className="text-sm text-muted-foreground">
      No content properties available
    </div>
  );
}

