/**
 * Element Library
 * Sidebar with draggable elements that can be added to the canvas
 */

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  Type,
  Image,
  Square,
  Circle,
  Minus,
  BarChart3,
  Hash,
  List,
  Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useState } from 'react';
import type { ElementType } from '@/stores/designStudioStore';

interface ElementDefinition {
  id: string;
  type: ElementType;
  label: string;
  icon: React.ReactNode;
  category: string;
  defaultConfig: any;
  defaultStyle: any;
  defaultSize: { width: number | 'auto'; height: number | 'auto' };
}

const ELEMENT_DEFINITIONS: ElementDefinition[] = [
  // Text Elements
  {
    id: 'text-title',
    type: 'text',
    label: 'Title',
    icon: <Type className="w-5 h-5" />,
    category: 'Text',
    defaultConfig: {
      fieldId: 'title',
      label: 'Title',
      placeholder: 'Enter title...',
      defaultValue: 'Title Text',
      maxLength: 100,
      required: true,
      multiline: false,
      richText: false,
    },
    defaultStyle: {
      fontSize: '48px',
      fontWeight: 'bold',
      color: '#000000',
      textAlign: 'center',
    },
    defaultSize: { width: 600, height: 'auto' },
  },
  {
    id: 'text-subtitle',
    type: 'text',
    label: 'Subtitle',
    icon: <Type className="w-4 h-4" />,
    category: 'Text',
    defaultConfig: {
      fieldId: 'subtitle',
      label: 'Subtitle',
      placeholder: 'Enter subtitle...',
      defaultValue: 'Subtitle Text',
      maxLength: 150,
      required: false,
      multiline: false,
      richText: false,
    },
    defaultStyle: {
      fontSize: '32px',
      fontWeight: '600',
      color: '#333333',
      textAlign: 'center',
    },
    defaultSize: { width: 500, height: 'auto' },
  },
  {
    id: 'text-body',
    type: 'text',
    label: 'Body Text',
    icon: <Type className="w-4 h-4 opacity-70" />,
    category: 'Text',
    defaultConfig: {
      fieldId: 'body',
      label: 'Body Text',
      placeholder: 'Enter body text...',
      defaultValue: 'Body text goes here',
      maxLength: 500,
      required: false,
      multiline: true,
      richText: false,
    },
    defaultStyle: {
      fontSize: '18px',
      fontWeight: 'normal',
      color: '#666666',
      textAlign: 'left',
    },
    defaultSize: { width: 400, height: 'auto' },
  },
  {
    id: 'text-list',
    type: 'text',
    label: 'Bullet List',
    icon: <List className="w-5 h-5" />,
    category: 'Text',
    defaultConfig: {
      fieldId: 'list',
      label: 'Bullet Points',
      placeholder: 'Enter list items...',
      defaultValue: '• Item 1\n• Item 2\n• Item 3',
      maxLength: 300,
      required: false,
      multiline: true,
      richText: false,
    },
    defaultStyle: {
      fontSize: '18px',
      fontWeight: 'normal',
      color: '#444444',
      textAlign: 'left',
      lineHeight: '1.8',
    },
    defaultSize: { width: 400, height: 'auto' },
  },
  
  // Media Elements
  {
    id: 'image-logo',
    type: 'image',
    label: 'Logo',
    icon: <Image className="w-5 h-5" />,
    category: 'Media',
    defaultConfig: {
      fieldId: 'logo',
      mediaType: 'logo',
      tags: ['logo', 'primary'],
      objectFit: 'contain',
      aspectRatio: 'auto',
    },
    defaultStyle: {
      borderRadius: '0px',
      opacity: 1,
    },
    defaultSize: { width: 200, height: 100 },
  },
  {
    id: 'image-photo',
    type: 'image',
    label: 'Photo',
    icon: <Image className="w-5 h-5" />,
    category: 'Media',
    defaultConfig: {
      fieldId: 'image',
      mediaType: 'product',
      tags: [],
      objectFit: 'cover',
      aspectRatio: '16:9',
    },
    defaultStyle: {
      borderRadius: '8px',
      opacity: 1,
    },
    defaultSize: { width: 400, height: 300 },
  },
  {
    id: 'image-icon',
    type: 'image',
    label: 'Icon',
    icon: <Square className="w-5 h-5" />,
    category: 'Media',
    defaultConfig: {
      fieldId: 'icon',
      mediaType: 'icon',
      tags: ['icon'],
      objectFit: 'contain',
      aspectRatio: '1:1',
    },
    defaultStyle: {
      borderRadius: '0px',
      opacity: 1,
    },
    defaultSize: { width: 64, height: 64 },
  },
  
  // Shape Elements
  {
    id: 'shape-rectangle',
    type: 'shape',
    label: 'Rectangle',
    icon: <Square className="w-5 h-5" />,
    category: 'Shapes',
    defaultConfig: {
      shape: 'rectangle',
      fill: '#E5E7EB',
      stroke: '#9CA3AF',
      strokeWidth: 2,
    },
    defaultStyle: {},
    defaultSize: { width: 300, height: 200 },
  },
  {
    id: 'shape-circle',
    type: 'shape',
    label: 'Circle',
    icon: <Circle className="w-5 h-5" />,
    category: 'Shapes',
    defaultConfig: {
      shape: 'circle',
      fill: '#E5E7EB',
      stroke: '#9CA3AF',
      strokeWidth: 2,
    },
    defaultStyle: {},
    defaultSize: { width: 150, height: 150 },
  },
  {
    id: 'shape-line',
    type: 'shape',
    label: 'Line',
    icon: <Minus className="w-5 h-5" />,
    category: 'Shapes',
    defaultConfig: {
      shape: 'line',
      fill: 'transparent',
      stroke: '#9CA3AF',
      strokeWidth: 2,
    },
    defaultStyle: {},
    defaultSize: { width: 300, height: 2 },
  },
  
  // Data Elements
  {
    id: 'data-number',
    type: 'data',
    label: 'Number/Stat',
    icon: <Hash className="w-5 h-5" />,
    category: 'Data',
    defaultConfig: {
      fieldId: 'stat',
      dataPath: 'businessProfile.revenue',
      format: 'currency',
      prefix: '$',
      suffix: 'M',
    },
    defaultStyle: {
      fontSize: '48px',
      fontWeight: 'bold',
      color: '#10B981',
      textAlign: 'center',
    },
    defaultSize: { width: 200, height: 'auto' },
  },
  {
    id: 'data-chart',
    type: 'data',
    label: 'Chart',
    icon: <BarChart3 className="w-5 h-5" />,
    category: 'Data',
    defaultConfig: {
      fieldId: 'chart',
      dataPath: '',
      format: 'text',
    },
    defaultStyle: {
      backgroundColor: '#F3F4F6',
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
    },
    defaultSize: { width: 400, height: 300 },
  },
];

interface DraggableElementProps {
  definition: ElementDefinition;
}

function DraggableElement({ definition }: DraggableElementProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: definition.id,
    data: definition,
  });
  
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-accent hover:border-accent-foreground/20 cursor-move transition-colors"
    >
      <div className="text-muted-foreground">{definition.icon}</div>
      <span className="text-sm font-medium">{definition.label}</span>
    </div>
  );
}

export function ElementLibrary() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Group elements by category
  const categories = Array.from(
    new Set(ELEMENT_DEFINITIONS.map(el => el.category))
  );
  
  // Filter elements
  const filteredElements = ELEMENT_DEFINITIONS.filter(el =>
    el.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Elements</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search elements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      
      {/* Element List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {categories.map(category => {
            const categoryElements = filteredElements.filter(
              el => el.category === category
            );
            
            if (categoryElements.length === 0) return null;
            
            return (
              <div key={category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  {category}
                </h3>
                <div className="space-y-2">
                  {categoryElements.map(element => (
                    <DraggableElement key={element.id} definition={element} />
                  ))}
                </div>
              </div>
            );
          })}
          
          {filteredElements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No elements found
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Footer Hint */}
      <div className="p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground">
          💡 Drag elements onto the canvas to add them to your template
        </p>
      </div>
    </div>
  );
}

