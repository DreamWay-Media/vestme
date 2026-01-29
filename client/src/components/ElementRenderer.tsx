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
  type: 'text' | 'image' | 'shape' | 'data' | 'bullets' | 'logo' | 'richText';
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
  // Inline editing props
  isEditing?: boolean;
  isSelected?: boolean;
  onClick?: (elementId: string, element: LayoutElement, content: any, event: React.MouseEvent) => void;
  onUpdate?: (elementId: string, updates: { content?: any; styling?: any; config?: any }) => void;
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
export function ElementRenderer({ 
  element, 
  content, 
  brandKit, 
  isCompact = false, 
  layoutIndex,
  isEditing = false,
  isSelected = false,
  onClick,
  onUpdate
}: ElementRendererProps) {
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
  
  // Add selection and hover styles when editing
  const editingStyle: React.CSSProperties = isEditing ? {
    cursor: 'pointer',
    transition: 'all 0.2s',
  } : {};
  
  const selectionStyle: React.CSSProperties = isSelected ? {
    outline: '2px solid #3b82f6',
    outlineOffset: '2px',
    boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)',
  } : {};
  
  // Combine all styles
  const finalStyle = {
    ...combinedStyle,
    ...editingStyle,
    ...selectionStyle,
  };
  
  // Handle click
  // CRITICAL: Use selectionKey format "elementId-index" to handle duplicate IDs
  // This matches the format expected by handleElementClick in deck-viewer
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing && onClick) {
      // Create selectionKey in "elementId-index" format if layoutIndex is available
      // Otherwise fall back to just element.id
      const selectionKey = layoutIndex !== undefined 
        ? `${element.id}-${layoutIndex}`
        : element.id;
      onClick(selectionKey, element, content, e);
    }
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
  
  // Special handling for logo type - check brandKit logoUrl
  if (element.type === 'logo' && !elementContent && brandKit?.logoUrl) {
    elementContent = brandKit.logoUrl;
  }
  
  // Special handling for bullets - check content.bullets array
  if (element.type === 'bullets' && !elementContent && Array.isArray(content?.bullets)) {
    elementContent = content.bullets;
  }

  // Wrapper div for click handling and selection styling
  const wrapperProps = isEditing ? {
    onClick: handleClick,
    style: finalStyle,
    className: isSelected ? 'element-selected' : 'element-editable',
  } : {
    style: finalStyle,
  };

  switch (element.type) {
    case 'text':
    case 'richText':
      return (
        <div {...wrapperProps}>
          <TextElement 
            element={element} 
            content={elementContent} 
            style={finalStyle} 
            brandKit={brandKit}
            isEditing={isEditing}
            isSelected={isSelected}
          />
        </div>
      );
    
    case 'bullets':
      return (
        <div {...wrapperProps}>
          <BulletsElement 
            element={element} 
            content={elementContent} 
            style={finalStyle} 
            brandKit={brandKit}
            isEditing={isEditing}
            isSelected={isSelected}
          />
        </div>
      );
    
    case 'image':
    case 'logo':
      return (
        <div {...wrapperProps}>
          <ImageElement 
            element={{
              ...element,
              config: {
                ...element.config,
                // Map 'logo' type to image with mediaType: 'logo'
                mediaType: element.type === 'logo' ? 'logo' : (element.config?.mediaType || 'graphic')
              }
            }} 
            content={elementContent} 
            style={finalStyle} 
            brandKit={brandKit}
            isEditing={isEditing}
            isSelected={isSelected}
          />
        </div>
      );
    
    case 'shape':
      return (
        <div {...wrapperProps}>
          <ShapeElement 
            element={element} 
            content={elementContent} 
            style={finalStyle} 
            brandKit={brandKit}
            isEditing={isEditing}
            isSelected={isSelected}
          />
        </div>
      );
    
    case 'data':
      return (
        <div {...wrapperProps}>
          <DataElement 
            element={element} 
            content={elementContent} 
            style={finalStyle} 
            brandKit={brandKit}
            isEditing={isEditing}
            isSelected={isSelected}
          />
        </div>
      );
    
    default:
      console.warn(`[ElementRenderer] Unsupported element type: ${element.type}`, element);
      return null;
  }
}

/**
 * Bullets Element Renderer
 */
function BulletsElement({ element, content, style, brandKit, isEditing, isSelected }: any) {
  const config = element.config || {};
  
  // Content can be an array of strings or a single string (split by newlines)
  let bullets: string[] = [];
  if (Array.isArray(content)) {
    bullets = content.filter(b => b && b.trim());
  } else if (typeof content === 'string') {
    bullets = content.split('\n').filter(b => b.trim());
  } else if (config.defaultValue) {
    bullets = Array.isArray(config.defaultValue) 
      ? config.defaultValue 
      : config.defaultValue.split('\n').filter((b: string) => b.trim());
  }
  
  // Apply bullet-specific styles ONLY (no positioning - handled by wrapper)
  const bulletsStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    fontFamily: element.styling?.fontFamily || style.fontFamily || brandKit?.fontFamily || 'Inter',
    fontSize: element.styling?.fontSize || style.fontSize || '16px',
    fontWeight: element.styling?.fontWeight || style.fontWeight || 'normal',
    color: element.styling?.color || style.color || brandKit?.brandColors?.primary || '#333333',
    lineHeight: element.styling?.lineHeight || style.lineHeight || '1.5',
  };
  
  const bulletColor = brandKit?.brandColors?.accent || style.color || '#10B981';
  
  if (bullets.length === 0) {
    return (
      <div style={bulletsStyle} className={isEditing ? '' : 'pointer-events-none'}>
        <span style={{ opacity: 0.5 }}>{config.placeholder || 'No bullet points'}</span>
      </div>
    );
  }
  
  return (
    <ul style={bulletsStyle} className={`space-y-2 ${isEditing ? '' : 'pointer-events-none'}`}>
      {bullets.map((bullet: string, index: number) => (
        <li
          key={index}
          className="flex items-start gap-2"
          style={{
            fontSize: bulletsStyle.fontSize,
            color: bulletsStyle.color,
            fontFamily: bulletsStyle.fontFamily,
          }}
        >
          <span
            className="flex-shrink-0 mt-1"
            style={{ color: bulletColor }}
          >
            •
          </span>
          <span
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(bullet, {
                ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span', 'p'],
                ALLOWED_ATTR: ['style', 'class'],
                ALLOW_DATA_ATTR: false
              })
            }}
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Text Element Renderer
 */
function TextElement({ element, content, style, brandKit, isEditing, isSelected, onUpdate }: any) {
  const config = element.config || {};
  const displayContent = content || config.defaultValue || config.placeholder || '';
  
  // Apply text-specific styles ONLY (no positioning - that's handled by wrapper)
  // Extract only content-related styles, not positioning
  const textStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    fontFamily: element.styling?.fontFamily || style.fontFamily || brandKit?.fontFamily || 'Inter',
    fontSize: element.styling?.fontSize || style.fontSize || '16px',
    fontWeight: element.styling?.fontWeight || style.fontWeight || 'normal',
    color: element.styling?.color || style.color || brandKit?.brandColors?.primary || '#333333',
    textAlign: (element.styling?.textAlign || style.textAlign as any) || 'left',
    lineHeight: element.styling?.lineHeight || style.lineHeight || 'normal',
    whiteSpace: config.multiline ? 'pre-wrap' : 'nowrap',
    overflow: 'hidden',
  };

  return (
    <div 
      style={textStyle}
      className={isEditing ? '' : 'pointer-events-none'}
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
function ImageElement({ element, content, style, brandKit, isEditing, isSelected }: any) {
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

  // Container style: NO positioning (handled by wrapper) - only layout styles
  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
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
      <div style={containerStyle}>
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

  // Image container - no positioning (handled by wrapper)
  return (
    <div style={containerStyle}>
      <img
        src={imageSrc}
        alt={config.label || element.id}
        style={imageStyle}
        className={isEditing ? '' : 'pointer-events-none'}
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
function ShapeElement({ element, content, style, brandKit, isEditing, isSelected, onUpdate }: any) {
  const config = element.config || {};
  const shape = config.shape || 'rectangle';
  
  // Get colors from content (user customizations) or fallback to config
  const shapeData = content || {};
  
  // Check if shape should use brand kit colors (from config or aiPrompt context)
  const hasContextInclude = config.contextInclude === true || config.contextInclude === 'brandKit';
  const hasBrandKitInContext = element.aiPrompt?.context?.includes('brandKit') || false;
  // usesBrandColor can be a boolean or a string (color type)
  const usesBrandColorFlag = config.usesBrandColor === true || (typeof config.usesBrandColor === 'string' && config.usesBrandColor);
  const shouldUseBrandColor = usesBrandColorFlag || hasContextInclude || hasBrandKitInContext;
  // If usesBrandColor is a string, use it as the color type, otherwise use brandColorType or default to 'primary'
  const brandColorType = (typeof config.usesBrandColor === 'string' ? config.usesBrandColor : null) || config.brandColorType || 'primary';
  
  // Determine brand color to use if needed
  let brandColor = null;
  if (shouldUseBrandColor && brandKit?.brandColors) {
    if (brandColorType === 'primary') {
      brandColor = brandKit.brandColors.primary;
    } else if (brandColorType === 'secondary') {
      brandColor = brandKit.brandColors.secondary;
    } else if (brandColorType === 'accent') {
      brandColor = brandKit.brandColors.accent;
    } else {
      brandColor = brandKit.brandColors.primary;
    }
  }
  
  // Use brand color if available, otherwise use content fill, then config fill
  const fill = brandColor || shapeData.fill || config.fill || '#E5E7EB';
  const stroke = shapeData.stroke || config.stroke;
  const strokeWidth = config.strokeWidth || 2;
  
  if (shape === 'circle') {
    const shapeStyle: React.CSSProperties = {
      width: '100%',
      height: '100%',
      backgroundColor: fill,
      border: stroke ? `${strokeWidth}px solid ${stroke}` : 'none',
      borderRadius: '50%',
    };
    
    return <div style={shapeStyle} className={isEditing ? '' : 'pointer-events-none'} />;
  }
  
  if (shape === 'line') {
    const shapeStyle: React.CSSProperties = {
      width: '100%',
      height: `${strokeWidth}px`,
      backgroundColor: stroke || '#9CA3AF',
      border: 'none',
    };
    
    return <div style={shapeStyle} className={isEditing ? '' : 'pointer-events-none'} />;
  }
  
  // Default: rectangle
  const shapeStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: fill,
    border: stroke ? `${strokeWidth}px solid ${stroke}` : 'none',
    borderRadius: element.styling?.borderRadius || style.borderRadius || '0px',
  };
  
  return <div style={shapeStyle} className={isEditing ? '' : 'pointer-events-none'} />;
}

/**
 * Data Element Renderer
 */
function DataElement({ element, content, style, brandKit, isEditing, isSelected, onUpdate }: any) {
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
  
  // Apply data-specific styles ONLY (no positioning - handled by wrapper)
  const dataStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: element.styling?.fontFamily || style.fontFamily || brandKit?.fontFamily || 'Inter',
    fontSize: element.styling?.fontSize || style.fontSize || '48px',
    fontWeight: element.styling?.fontWeight || style.fontWeight || 'bold',
    color: element.styling?.color || style.color || brandKit?.brandColors?.accent || '#10B981',
    textAlign: 'center' as const,
  };
  
  return (
    <div style={dataStyle} className={isEditing ? '' : 'pointer-events-none'}>
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
  // Inline editing props
  isEditing?: boolean;
  selectedElementId?: string | null;
  onElementClick?: (elementId: string, element: LayoutElement, content: any, event: React.MouseEvent) => void;
  onElementUpdate?: (elementId: string, updates: { content?: any; styling?: any; config?: any }) => void;
}

export function AllElementsRenderer({ 
  layoutElements, 
  content, 
  brandKit,
  isCompact = false,
  isEditing = false,
  selectedElementId = null,
  onElementClick,
  onElementUpdate
}: AllElementsRendererProps) {
  // Sort by z-index to render in correct order
  const sortedElements = [...layoutElements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
  
  return (
    <>
      {sortedElements.map((element, index) => {
        // Find the original index in the unsorted array to maintain correct mapping
        const originalIndex = layoutElements.findIndex(el => el === element);
        const layoutIdx = originalIndex >= 0 ? originalIndex : index;
        
        // CRITICAL: Create selectionKey in "elementId-index" format to match handleElementClick
        // This ensures unique selection when multiple elements share the same ID
        const selectionKey = `${element.id}-${layoutIdx}`;
        
        return (
          <ElementRenderer
            key={`${element.id}-${layoutIdx}`} // Use both id and index for unique React key
            element={element}
            content={content}
            brandKit={brandKit}
            isCompact={isCompact}
            layoutIndex={layoutIdx} // Pass layout index for content lookup
            isEditing={isEditing}
            isSelected={selectedElementId === selectionKey}
            onClick={onElementClick}
            onUpdate={onElementUpdate}
          />
        );
      })}
    </>
  );
}

