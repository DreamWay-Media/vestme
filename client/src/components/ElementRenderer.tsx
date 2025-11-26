/**
 * ElementRenderer Component
 * Renders individual template elements with exact positioning and styling
 * This provides 1:1 parity between Designer Studio and Slide Rendering
 */

import { cn } from "@/lib/utils";
import DOMPurify from 'isomorphic-dompurify';

interface ElementConfig {
  // Text config
  fieldId?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  
  // Image config
  mediaType?: string;
  tags?: string[];
  objectFit?: 'cover' | 'contain' | 'fill';
  fallbackUrl?: string;
  
  // Shape config
  shape?: 'rectangle' | 'circle' | 'line';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  
  // Data config
  dataPath?: string;
  format?: 'currency' | 'percentage' | 'number' | 'text';
  prefix?: string;
  suffix?: string;
}

interface LayoutElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'data';
  zone: {
    x: string | number;
    y: string | number;
    width: string | number;
    height: string | number;
  };
  styling?: Record<string, any>;
  config?: ElementConfig;
  zIndex?: number;
}

interface ElementRendererProps {
  element: LayoutElement;
  content: any;
  brandKit?: {
    logoUrl?: string;
    fontFamily?: string;
    brandColors?: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  isCompact?: boolean;
  layoutIndex?: number; // Index of this element in the layout array (for unique content lookup)
}

/**
 * Parse pixel values from strings like "100px" or numbers
 */
function parsePixelValue(val: string | number): string {
  if (typeof val === 'number') return `${val}px`;
  if (typeof val === 'string') {
    if (val === 'auto') return 'auto';
    if (val.endsWith('px') || val.endsWith('%')) return val;
    // If it's a number as string, add px
    const num = parseFloat(val);
    if (!isNaN(num)) return `${num}px`;
  }
  return String(val);
}

/**
 * Main ElementRenderer component
 */
export function ElementRenderer({ element, content, brandKit, isCompact = false, layoutIndex }: ElementRendererProps) {
  // Base positioning style
  const positionStyle: React.CSSProperties = {
    position: 'absolute',
    left: parsePixelValue(element.zone.x),
    top: parsePixelValue(element.zone.y),
    width: parsePixelValue(element.zone.width),
    height: parsePixelValue(element.zone.height),
    zIndex: element.zIndex || 0,
  };

  // Apply element-specific styling
  const combinedStyle = {
    ...positionStyle,
    ...element.styling,
  };

  // Get content for this element
  // Content can be in _elementContent (new format) or directly by ID
  // CRITICAL: If layoutIndex is provided, check indexed key FIRST to ensure uniqueness
  // This prevents duplicate element.id values from overwriting each other
  let elementContent: any = undefined;
  
  if (layoutIndex !== undefined) {
    // Check indexed key first (for elements with duplicate ids)
    const indexedKey = `${element.id}-layout-${layoutIndex}`;
    elementContent = content?._elementContent?.[indexedKey];
  }
  
  // Fall back to element.id lookup if indexed key not found or layoutIndex not provided
  if (elementContent === undefined) {
    elementContent = content?._elementContent?.[element.id] || content?.[element.id];
  }

  switch (element.type) {
    case 'text':
      return <TextElement element={element} content={elementContent} style={combinedStyle} brandKit={brandKit} />;
    
    case 'image':
      return <ImageElement element={element} content={elementContent} style={combinedStyle} brandKit={brandKit} />;
    
    case 'shape':
      return <ShapeElement element={element} content={elementContent} style={combinedStyle} />;
    
    case 'data':
      return <DataElement element={element} content={elementContent} style={combinedStyle} brandKit={brandKit} />;
    
    default:
      return null;
  }
}

/**
 * Text Element Renderer
 */
function TextElement({ element, content, style, brandKit }: any) {
  const config = element.config || {};
  const displayContent = content || config.defaultValue || config.placeholder || '';
  
  // Apply text-specific styles
  const textStyle: React.CSSProperties = {
    ...style,
    display: 'flex',
    alignItems: 'center',
    fontFamily: style.fontFamily || brandKit?.fontFamily || 'Inter',
    fontSize: style.fontSize || '16px',
    fontWeight: style.fontWeight || 'normal',
    color: style.color || brandKit?.brandColors?.primary || '#333333',
    textAlign: (style.textAlign as any) || 'left',
    lineHeight: style.lineHeight || 'normal',
    whiteSpace: config.multiline ? 'pre-wrap' : 'nowrap',
    overflow: 'hidden',
  };

  return (
    <div 
      style={textStyle}
      className="pointer-events-none"
      dangerouslySetInnerHTML={{ 
        __html: DOMPurify.sanitize(displayContent, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span', 'p', 'div'],
          ALLOWED_ATTR: ['style', 'class'],
          ALLOW_DATA_ATTR: false
        })
      }}
    />
  );
}

/**
 * Image Element Renderer
 */
function ImageElement({ element, content, style, brandKit }: any) {
  const config = element.config || {};
  const mediaType = config.mediaType || 'graphic';
  
  // Determine image source
  let imageSrc = content;
  
  // Strict check: Only use brand logo if explicitly configured as 'logo'
  if (mediaType === 'logo' && !imageSrc && brandKit?.logoUrl) {
    imageSrc = brandKit.logoUrl;
  }
  
  // Use fallback if no source
  if (!imageSrc) {
    imageSrc = config.fallbackUrl;
  }

  // Determine object-fit based on media type
  // For logos, use 'contain' to show entire image without cropping
  // For other images, also use 'contain' to prevent cropping (user can override via config)
  const defaultObjectFit = 'contain'; // Use contain for all images to prevent cropping
  const objectFit = (config.objectFit as any) || defaultObjectFit;

  // Container style: positioning and size come from the zone
  const containerStyle: React.CSSProperties = {
    position: style.position || 'absolute',
    left: style.left,
    top: style.top,
    width: style.width, // Container gets the fixed width from zone
    height: style.height, // Container gets the fixed height from zone
    zIndex: style.zIndex || 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Clip content that exceeds container bounds
  };

  // Image style: adapts to fit within the container
  // Don't set width/height - let image use natural dimensions and fit within container
  const imageStyle: React.CSSProperties = {
    maxWidth: '100%', // Constrain to container width
    maxHeight: '100%', // Constrain to container height
    width: 'auto', // Use natural width
    height: 'auto', // Use natural height
    objectFit: objectFit, // Use contain for logos, cover for others
    objectPosition: 'center',
    borderRadius: style.borderRadius || '0px',
    opacity: style.opacity !== undefined ? style.opacity : 1,
    display: 'block',
  };

  if (!imageSrc) {
    // Placeholder for missing image
    return (
      <div
        style={containerStyle}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#F3F4F6',
            border: '2px dashed #D1D5DB',
          }}
        >
          <div className="text-center text-sm text-gray-400">
            <div className="text-2xl mb-1">
              {mediaType === 'logo' ? '🏢' : '🖼️'}
            </div>
            <div>{config.label || mediaType}</div>
          </div>
        </div>
      </div>
    );
  }

  // Always wrap image in container for consistent positioning and sizing
  return (
    <div style={containerStyle}>
      <img
        src={imageSrc}
        alt={config.label || element.id}
        style={imageStyle}
        className="pointer-events-none"
        onError={(e) => {
          // Hide broken images
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}

/**
 * Shape Element Renderer
 * Supports custom colors from content (user customizations) or falls back to config
 */
function ShapeElement({ element, content, style }: any) {
  const config = element.config || {};
  const shape = config.shape || 'rectangle';
  
  // Get colors from content (user customizations) or fallback to config
  const shapeData = content || {};
  const fill = shapeData.fill || config.fill || '#E5E7EB';
  const stroke = shapeData.stroke || config.stroke;
  const strokeWidth = config.strokeWidth || 2;
  
  if (shape === 'circle') {
    const shapeStyle: React.CSSProperties = {
      ...style,
      backgroundColor: fill,
      border: stroke ? `${strokeWidth}px solid ${stroke}` : 'none',
      borderRadius: '50%',
    };
    
    return <div style={shapeStyle} className="pointer-events-none" />;
  }
  
  if (shape === 'line') {
    const shapeStyle: React.CSSProperties = {
      ...style,
      height: `${strokeWidth}px`,
      backgroundColor: stroke || '#9CA3AF',
      border: 'none',
    };
    
    return <div style={shapeStyle} className="pointer-events-none" />;
  }
  
  // Default: rectangle
  const shapeStyle: React.CSSProperties = {
    ...style,
    backgroundColor: fill,
    border: stroke ? `${strokeWidth}px solid ${stroke}` : 'none',
    borderRadius: style.borderRadius || '0px',
  };
  
  return <div style={shapeStyle} className="pointer-events-none" />;
}

/**
 * Data Element Renderer
 */
function DataElement({ element, content, style, brandKit }: any) {
  const config = element.config || {};
  
  // Get raw data value
  let dataValue = content;
  
  // If no content provided, try to extract from dataPath
  if (!dataValue && config.dataPath) {
    // Fallback: Use a subtle placeholder instead of '123'
    dataValue = null; 
  }
  
  // If still no value, render placeholder or nothing
  if (dataValue === null || dataValue === undefined || dataValue === '') {
     // Render a subtle placeholder for design mode, or nothing for final render?
     // For now, let's render a subtle dash to indicate missing data without breaking layout
     dataValue = '--';
  }
  
  // Format the data based on format type
  let formattedValue = dataValue;
  
  // Only format if it's not the placeholder
  if (dataValue !== '--') {
    switch (config.format) {
      case 'currency':
        formattedValue = `${config.prefix || '$'}${dataValue}${config.suffix || ''}`;
        break;
      case 'percentage':
        formattedValue = `${dataValue}${config.suffix || '%'}`;
        break;
      case 'number':
        formattedValue = `${config.prefix || ''}${dataValue}${config.suffix || ''}`;
        break;
      default:
        formattedValue = `${config.prefix || ''}${dataValue}${config.suffix || ''}`;
    }
  }
  
  // Apply data-specific styles (similar to text)
  const dataStyle: React.CSSProperties = {
    ...style,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: style.fontFamily || brandKit?.fontFamily || 'Inter',
    fontSize: style.fontSize || '48px',
    fontWeight: style.fontWeight || 'bold',
    color: style.color || brandKit?.brandColors?.accent || '#10B981',
    textAlign: 'center' as const,
  };
  
  return (
    <div style={dataStyle} className="pointer-events-none">
      {formattedValue}
    </div>
  );
}

/**
 * Main component that renders all elements from a template
 */
interface AllElementsRendererProps {
  layoutElements: LayoutElement[];
  content: any;
  brandKit?: {
    logoUrl?: string;
    fontFamily?: string;
    brandColors?: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  isCompact?: boolean;
}

export function AllElementsRenderer({ 
  layoutElements, 
  content, 
  brandKit,
  isCompact = false 
}: AllElementsRendererProps) {
  // Sort by z-index to render in correct order
  const sortedElements = [...layoutElements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  
  return (
    <>
      {sortedElements.map((element, index) => {
        // Find the original index in the unsorted array to maintain correct mapping
        const originalIndex = layoutElements.findIndex(el => el === element);
        return (
          <ElementRenderer
            key={`${element.id}-${originalIndex}`} // Use both id and index for unique React key
            element={element}
            content={content}
            brandKit={brandKit}
            isCompact={isCompact}
            layoutIndex={originalIndex >= 0 ? originalIndex : index} // Pass layout index for content lookup
          />
        );
      })}
    </>
  );
}

