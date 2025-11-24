import { cn } from "@/lib/utils";
import { AllElementsRenderer } from "./ElementRenderer";
import DOMPurify from 'isomorphic-dompurify';
import { useEffect, useRef, useState } from 'react';

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
  config?: any;
  zIndex?: number;
}

interface SlideRendererProps {
  slide: {
    id: string;
    type: string;
    title: string;
    content: any;
    order: number;
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
      background?: {
        gradient?: string; // Added for template-defined gradients
      };
      brandColors?: {
        primary: string;
        secondary: string;
        accent: string;
      };
      allLogos?: string[]; // Added for all logos from brand kit
    };
    // Drag and drop positioning
    positionedElements?: {
      title?: { x: number; y: number; width?: number; height?: number };
      description?: { x: number; y: number; width?: number; height?: number };
      bullets?: { x: number; y: number; width?: number; height?: number };
      logo?: { x: number; y: number; width?: number; height?: number };
      [key: string]: { x: number; y: number; width?: number; height?: number } | undefined;
    };
    // NEW: Layout elements from design studio
    layoutElements?: LayoutElement[];
  };
  isCompact?: boolean;
}

export function SlideRenderer({ slide, isCompact = false }: SlideRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  
  // Calculate scale when container size changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateScale = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const scaleX = rect.width / 1920;
      const scaleY = rect.height / 1080;
      const newScale = Math.min(scaleX, scaleY);
      setScale(newScale);
      console.log('📐 SlideRenderer scale calculated:', { width: rect.width, height: rect.height, scale: newScale });
    };
    
    updateScale();
    
    // Update on window resize
    window.addEventListener('resize', updateScale);
    
    // Use ResizeObserver for container size changes
    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(containerRef.current);
    
    return () => {
      window.removeEventListener('resize', updateScale);
      resizeObserver.disconnect();
    };
  }, []);
  
  // Sanitize HTML to prevent XSS attacks
  const sanitizeHtml = (html: string) => {
    if (!html) return '';
    
    // First unescape HTML entities
    let unescaped = html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    
    // Strip a single wrapping <p>...</p> to avoid invalid nesting
    const match = unescaped.match(/^\s*<p[^>]*>([\s\S]*?)<\/p>\s*$/i);
    if (match) unescaped = match[1];
    
    // Sanitize with DOMPurify - allow safe formatting tags only
    return DOMPurify.sanitize(unescaped, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'span', 'p', 'div', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: ['style', 'class'],
      ALLOW_DATA_ATTR: false
    });
  };
  
  // Keep backward compatibility with old function name
  const unescapeHtml = sanitizeHtml;
  const content = slide.content || {};
  const styling = slide.styling || {};
  const positionedElements = slide.positionedElements || {};
  
  // Extract styling variables
  const primaryColor = styling.primaryColor || '#3b82f6';
  const secondaryColor = styling.secondaryColor || '#64748b';
  const textColor = styling.textColor || '#333333';
  const accentColor = styling.accentColor || '#fd7e14';
  const fontFamily = styling.fontFamily || 'Inter';
  const fontSize = styling.fontSize || 'medium';
  const titleFontSize = styling.titleFontSize || '2xl';
  const descriptionFontSize = styling.descriptionFontSize || 'base';
  const bulletFontSize = styling.bulletFontSize || 'base';
  const logoUrl = styling.logoUrl;
  const backgroundColor = styling.backgroundColor || '#ffffff';
  const backgroundImage = styling.backgroundImage;
  const brandColors = styling.brandColors;

  // Background style logic - use solid colors only (no gradients)
  const backgroundStyle = backgroundImage 
    ? { 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor
      }
    : {
        // Use solid background color
        backgroundColor: backgroundColor
      };

  // Convert fontSize to actual CSS values
  const getFontSize = (size: string) => {
    switch (size) {
      case 'small': return '0.875rem'; // 14px
      case 'base': return '1rem';      // 16px
      case 'medium': return '1rem';    // 16px
      case 'large': return '1.125rem'; // 18px
      case 'lg': return '1.125rem';    // 18px
      case 'xl': return '1.25rem';     // 20px
      case '2xl': return '1.5rem';     // 24px
      case '3xl': return '1.875rem';   // 30px
      case '4xl': return '2.25rem';    // 36px
      case '5xl': return '3rem';       // 48px
      default: return '1rem';          // 16px
    }
  };

  // Style object for the entire slide content
  const slideStyle = {
    fontFamily,
    fontSize: getFontSize(fontSize),
    color: textColor,
    ...backgroundStyle
  };

  // Check if we should use positioned layout
  const usePositionedLayout = Object.keys(positionedElements).length > 0;

  // Check if template defines logo elements (only render logos if template includes them)
  const templateHasLogo = positionedElements.logo || 
                          Object.keys(positionedElements).some(key => key.startsWith('logo-'));

  // Debug: Log the styling being applied
  console.log('=== SLIDE RENDERER DEBUG ===');
  console.log('Slide ID:', slide.id);
  console.log('Slide type:', slide.type);
  console.log('Slide title:', slide.title);
  console.log('Content received:', content);
  console.log('  - Titles:', content.titles);
  console.log('  - Descriptions:', content.descriptions);
  console.log('  - Bullets:', content.bullets);
  console.log('  - Logos:', content.logos);
  console.log('Styling received:', styling);
  console.log('  - Background color:', backgroundColor);
  console.log('  - Text color:', textColor);
  console.log('  - Font family:', fontFamily);
  console.log('Positioned elements:', positionedElements);
  console.log('  - Keys:', Object.keys(positionedElements));
  console.log('  - Full data:', JSON.stringify(positionedElements, null, 2));
  console.log('Will use positioned layout?', usePositionedLayout);
  console.log('Template has logo?', templateHasLogo);
  console.log('Layout elements:', slide.layoutElements);
  console.log('Has layout elements?', !!slide.layoutElements && slide.layoutElements.length > 0);

  // NEW: Check if slide has layoutElements from design studio
  // If yes, use the new element-by-element renderer for perfect parity
  if (slide.layoutElements && slide.layoutElements.length > 0) {
    console.log('🎨 Using NEW element-by-element renderer with', slide.layoutElements.length, 'elements');
    
    // Design studio canvas dimensions
    const DESIGN_WIDTH = 1920;
    const DESIGN_HEIGHT = 1080;
    
    return (
      <div 
        ref={containerRef}
        className={`relative overflow-hidden rounded border ${isCompact ? 'h-24' : 'aspect-video'}`}
        style={slideStyle}
      >
        {/* Scaling wrapper to fit 1920x1080 canvas into container */}
        <div className="w-full h-full relative flex items-center justify-center">
          <div 
            style={{
              width: `${DESIGN_WIDTH}px`,
              height: `${DESIGN_HEIGHT}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              position: 'relative',
            }}
          >
            <AllElementsRenderer
              layoutElements={slide.layoutElements}
              content={content}
              brandKit={{
                logoUrl: styling.logoUrl,
                fontFamily: fontFamily,
                brandColors: brandColors,
              }}
              isCompact={isCompact}
            />
          </div>
        </div>
      </div>
    );
  }
  
  console.log('📋 Using LEGACY renderer (no layoutElements found)');
  
  // If using positioned layout, render with absolute positioning
  if (usePositionedLayout) {
    return (
      <div 
        className={`relative overflow-hidden rounded border ${isCompact ? 'h-24' : 'aspect-video'}`}
        style={slideStyle}
      >
        {/* Logo - positioned absolutely - ONLY if template defines logos */}
        {templateHasLogo && ((content.logos && Array.isArray(content.logos) && content.logos.length > 0) || logoUrl) && slide.type !== 'title' && (
          <>
            {content.logos && Array.isArray(content.logos) && content.logos.length > 0 ? (
              // Multiple logos format - filter out empty/null values and use template positioning
              content.logos
                .filter((url: string) => url && url.trim()) // Filter out empty/null URLs
                .map((logoUrl: string, index: number) => {
                  const logoKey = index === 0 ? 'logo' : `logo-${index}`;
                  const logoPosition = positionedElements[logoKey];
                  
                  // Only render if template has positioning for this logo
                  if (!logoPosition && index > 0) return null;
                  
                  console.log(`SlideRenderer - Logo ${index} positioning:`, {
                    logoKey,
                    logoPosition,
                    logoUrl,
                    hasPosition: !!logoPosition
                  });
                  
                  return (
                    <div 
                      key={index}
                      className={`absolute ${isCompact ? 'z-10' : 'z-20'}`}
                      style={{
                        left: logoPosition?.x || 16,
                        top: logoPosition?.y || 16
                      }}
                    >
                      <img 
                        src={logoUrl} 
                        alt={`Logo ${index + 1}`} 
                        className={`${isCompact ? 'h-6' : 'h-10'} w-auto object-contain opacity-95`} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                      />
                    </div>
                  );
                })
            ) : logoUrl && positionedElements.logo ? (
              // Single logo format - only if template defines logo position
              <div 
                className={`absolute ${isCompact ? 'z-10' : 'z-20'}`}
                style={{
                  left: positionedElements.logo.x,
                  top: positionedElements.logo.y
                }}
              >
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className={`${isCompact ? 'h-6' : 'h-10'} w-auto object-contain opacity-95`} 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
              </div>
            ) : null}
          </>
        )}

        {/* Title - positioned absolutely */}
        {((content.titles && Array.isArray(content.titles) && content.titles.length > 0) || slide.title) && (
          <div 
            className="absolute"
            style={{
              left: positionedElements.title?.x || 48,
              top: positionedElements.title?.y || 48,
              right: slide.type === 'title' ? 48 : 'auto'
            }}
          >
            <div className="space-y-2">
              {content.titles && Array.isArray(content.titles) && content.titles.length > 0 ? (
                // Render raw HTML blocks so inline font-size styles from editor apply
                content.titles.map((title: string, index: number) => (
                  <div 
                    key={index}
                    className="font-bold leading-tight"
                    style={{
                      color: brandColors?.primary || textColor,
                      fontFamily,
                      marginBottom: index < content.titles.length - 1 ? '16px' : '0'
                    }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(title) }}
                  />
                ))
              ) : (
                // Old single title format
                <div 
                  className="font-bold leading-tight"
                  style={{
                    color: brandColors?.primary || textColor,
                    fontFamily
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(slide.title) }}
                />
              )}
            </div>
          </div>
        )}

        {/* Descriptions - positioned absolutely */}
        {((content.descriptions && Array.isArray(content.descriptions) && content.descriptions.length > 0) || content.description) && (
          <div 
            className="absolute"
            style={{
              left: positionedElements.description?.x || 48,
              top: positionedElements.description?.y || 120,
              right: 48
            }}
          >
            <div className="space-y-2">
              {content.descriptions && Array.isArray(content.descriptions) && content.descriptions.length > 0 ? (
                // Render raw HTML so inline styles apply
                content.descriptions.map((description: string, index: number) => (
                  <div 
                    key={index}
                    className="leading-relaxed"
                    style={{
                      color: brandColors?.primary || textColor,
                      fontFamily
                    }}
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
                  />
                ))
              ) : (
                // Old single description format
                <div 
                  className="leading-relaxed"
                  style={{
                    color: brandColors?.primary || textColor,
                    fontFamily
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(content.description || '') }}
                />
              )}
            </div>
          </div>
        )}

        {/* Bullet Points - positioned absolutely */}
        {content.bullets && Array.isArray(content.bullets) && content.bullets.length > 0 && (
          <div 
            className="absolute"
            style={{
              left: positionedElements.bullets?.x || 48,
              top: positionedElements.bullets?.y || 200,
              right: 48
            }}
          >
            <ul className="space-y-2">
              {content.bullets.map((bullet: string, index: number) => (
                <li 
                  key={index}
                  className="flex items-start gap-2"
                  style={{
                    fontSize: getFontSize(bulletFontSize),
                    color: brandColors?.primary || textColor,
                    fontFamily
                  }}
                >
                  <span 
                    className="flex-shrink-0 mt-1"
                    style={{ color: brandColors?.accent || accentColor }}
                  >
                    •
                  </span>
                  <span>{unescapeHtml(bullet)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Centered logo for title slides - ONLY if template defines logos */}
        {templateHasLogo && ((content.logos && Array.isArray(content.logos) && content.logos.length > 0) || logoUrl) && slide.type === 'title' && (
          <>
            {content.logos && Array.isArray(content.logos) && content.logos.length > 0 ? (
              // Multiple logos format - filter out empty/null values and use template positioning
              content.logos
                .filter((url: string) => url && url.trim()) // Filter out empty/null URLs
                .map((logoUrl: string, index: number) => {
                  const logoKey = index === 0 ? 'logo' : `logo-${index}`;
                  const logoPosition = positionedElements[logoKey];
                  
                  // Only render if template has positioning for this logo
                  if (!logoPosition && index > 0) return null;
                  
                  console.log(`SlideRenderer - Title Logo ${index} positioning:`, {
                    logoKey,
                    logoPosition,
                    logoUrl,
                    hasPosition: !!logoPosition
                  });
                  
                  return (
                    <div 
                      key={index}
                      className="absolute"
                      style={{
                        left: logoPosition?.x || '50%',
                        top: logoPosition?.y || 48,
                        transform: logoPosition ? 'none' : 'translateX(-50%)'
                      }}
                    >
                      <img 
                        src={logoUrl} 
                        alt={`Logo ${index + 1}`} 
                        className={`${isCompact ? 'h-8' : 'h-16'} w-auto object-contain opacity-95`} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                      />
                    </div>
                  );
                })
            ) : logoUrl && positionedElements.logo ? (
              // Single logo format - only if template defines logo position
              <div 
                className="absolute"
                style={{
                  left: positionedElements.logo.x || '50%',
                  top: positionedElements.logo.y || 48,
                  transform: positionedElements.logo.x ? 'none' : 'translateX(-50%)'
                }}
              >
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className={`${isCompact ? 'h-8' : 'h-16'} w-auto object-contain opacity-95`} 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }

  // Original layout when no positioning is specified (templateHasLogo already defined above)
  return (
    <div 
      className={`relative overflow-hidden rounded border ${isCompact ? 'h-24' : 'aspect-video'}`}
      style={slideStyle}
    >
      {/* Logo block - ONLY render if template explicitly defines logo elements */}
      {templateHasLogo && ((content.logos && Array.isArray(content.logos) && content.logos.length > 0) || logoUrl) && (
        <>
          {content.logos && Array.isArray(content.logos) && content.logos.length > 0 ? (
            // Multiple logos format - filter out empty/null values and use template positioning
            content.logos
              .filter((url: string) => url && url.trim()) // Filter out empty/null URLs
              .map((logoUrl: string, index: number) => {
                const logoKey = index === 0 ? 'logo' : `logo-${index}`;
                const logoPosition = positionedElements[logoKey];
                
                // Only render if template has positioning for this logo
                if (!logoPosition && index > 0) return null;
                
                return (
                  <div 
                    key={index}
                    className={`absolute ${isCompact ? 'z-10' : 'z-20'}`}
                    style={{
                      left: logoPosition?.x || 16,
                      top: logoPosition?.y || 16
                    }}
                  >
                    <img 
                      src={logoUrl} 
                      alt={`Logo ${index + 1}`} 
                      className={`${isCompact ? 'h-6' : 'h-10'} w-auto object-contain opacity-95`} 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                    />
                  </div>
                );
              })
          ) : logoUrl && positionedElements.logo ? (
            // Single logo format - only if template defines logo position
            <div 
              className={`absolute ${isCompact ? 'z-10' : 'z-20'}`}
              style={{
                left: positionedElements.logo.x,
                top: positionedElements.logo.y
              }}
            >
              <img 
                src={logoUrl} 
                alt="Company Logo" 
                className={`${isCompact ? 'h-6' : 'h-10'} w-auto object-contain opacity-95`} 
                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
              />
            </div>
          ) : null}
        </>
      )}

      {/* Main content container */}
      <div className={`p-6 ${isCompact ? 'p-2' : ''}`}>
        {/* Logo for title slides (centered, larger) - ONLY if template defines logo */}
        {templateHasLogo && ((content.logos && Array.isArray(content.logos) && content.logos.length > 0) || logoUrl) && slide.type === 'title' && (
          <div className="text-center mb-6">
            {content.logos && Array.isArray(content.logos) && content.logos.length > 0 ? (
              // Multiple logos format - filter out empty/null values and use template positioning
              content.logos
                .filter((url: string) => url && url.trim()) // Filter out empty/null URLs
                .map((logoUrl: string, index: number) => {
                  const logoKey = index === 0 ? 'logo' : `logo-${index}`;
                  const logoPosition = positionedElements[logoKey];
                  
                  // Only render if template has positioning for this logo
                  if (!logoPosition && index > 0) return null;
                  
                  return (
                    <div 
                      key={index}
                      className="relative"
                      style={{
                        left: logoPosition?.x || 'auto',
                        top: logoPosition?.y || 'auto',
                        position: logoPosition ? 'absolute' : 'static'
                      }}
                    >
                      <img 
                        src={logoUrl} 
                        alt={`Logo ${index + 1}`} 
                        className={`${isCompact ? 'h-8' : 'h-16'} w-auto object-contain opacity-95 mx-auto`} 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                      />
                    </div>
                  );
                })
            ) : logoUrl && positionedElements.logo ? (
              // Single logo format - only if template defines logo position
              <div 
                className="relative"
                style={{
                  left: positionedElements.logo.x || 'auto',
                  top: positionedElements.logo.y || 'auto',
                  position: positionedElements.logo ? 'absolute' : 'static'
                }}
              >
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className={`${isCompact ? 'h-8' : 'h-16'} w-auto object-contain opacity-95 mx-auto`} 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
              </div>
            ) : null}
          </div>
        )}

        {/* Main title */}
        {((content.titles && Array.isArray(content.titles) && content.titles.length > 0) || slide.title) && (
          <div className="space-y-2">
            {content.titles && Array.isArray(content.titles) && content.titles.length > 0 ? (
              // New multiple titles format - render raw HTML so inline styles (font-size) apply
              content.titles.map((title: string, index: number) => (
                <div 
                  key={index}
                  className="font-bold leading-tight"
                  style={{
                    color: brandColors?.primary || textColor,
                    fontFamily,
                    marginBottom: index < content.titles.length - 1 ? '16px' : '0'
                  }}
                  dangerouslySetInnerHTML={{ __html: unescapeHtml(title) }}
                />
              ))
            ) : (
              // Old single title format
              <div 
                className="font-bold leading-tight"
                style={{
                  color: brandColors?.primary || textColor,
                  fontFamily
                }}
                dangerouslySetInnerHTML={{ __html: unescapeHtml(slide.title) }}
              />
            )}
          </div>
        )}

        {/* AI-generated slide content support */}
        {((content.descriptions && Array.isArray(content.descriptions) && content.descriptions.length > 0) || content.description) && (
          <div className="space-y-2">
            {content.descriptions && Array.isArray(content.descriptions) && content.descriptions.length > 0 ? (
              // New multiple descriptions format - render raw HTML
              content.descriptions.map((description: string, index: number) => (
                <div 
                  key={index}
                  className={`${isCompact ? 'text-xs' : ''} leading-relaxed ${isCompact ? 'mb-1' : 'mb-4'} pr-16`}
                  style={{ 
                    color: textColor, 
                    fontFamily,
                    borderLeft: brandColors ? `4px solid ${brandColors.accent}` : 'none',
                    paddingLeft: brandColors ? '12px' : '0'
                  }}
                  dangerouslySetInnerHTML={{ __html: unescapeHtml(description) }}
                />
              ))
            ) : (
              // Old single description format
              <div 
                className={`${isCompact ? 'text-xs' : ''} leading-relaxed ${isCompact ? 'mb-1' : 'mb-4'} pr-16`}
                style={{ 
                  color: textColor, 
                  fontFamily,
                  borderLeft: brandColors ? `4px solid ${brandColors.accent}` : 'none',
                  paddingLeft: brandColors ? '12px' : '0'
                }}
                dangerouslySetInnerHTML={{ __html: unescapeHtml(content.description || '') }}
              />
            )}
          </div>
        )}
        
        {content.bullets && Array.isArray(content.bullets) && content.bullets.length > 0 && (
          <ul className={`${isCompact ? 'space-y-0' : 'space-y-2'} pr-16`}>
            {content.bullets.slice(0, isCompact ? 3 : content.bullets.length).map((bullet: string, idx: number) => (
              <li 
                key={idx}
                style={{ 
                  color: textColor, 
                  fontFamily,
                  fontSize: isCompact ? '0.75rem' : getFontSize(bulletFontSize),
                  listStyleType: 'none'
                }}
                className={`${isCompact ? 'text-xs' : ''} flex items-start`}
              >
                <span 
                  className="mr-2 mt-1"
                  style={{ 
                    color: brandColors ? brandColors.accent : accentColor,
                    fontSize: '1.2em'
                  }}
                >
                  •
                </span>
                <span>{unescapeHtml(bullet)}</span>
              </li>
            ))}
            {isCompact && content.bullets.length > 3 && (
              <li className="text-xs text-gray-500 ml-4">...and {content.bullets.length - 3} more</li>
            )}
          </ul>
        )}

        {/* Legacy content support */}
        {(!content.description && !content.bullets) && (
          <>
            {content.title && content.title !== slide.title && (
              <div 
                className={`${isCompact ? 'text-sm' : 'text-2xl'} font-bold leading-tight ${isCompact ? 'mb-1' : 'mb-3'}`}
                style={{ color: primaryColor, fontFamily }}
              >
                {content.title}
              </div>
            )}
            
            {content.subtitle && (
              <div 
                className={`${isCompact ? 'text-xs' : 'text-lg'} leading-relaxed ${isCompact ? 'mb-1' : 'mb-3'}`}
                style={{ color: textColor, fontFamily }}
              >
                {content.subtitle}
              </div>
            )}
            
            {content.main_text && (
              <div 
                className={`${isCompact ? 'text-xs' : 'text-xl'} leading-relaxed ${isCompact ? 'mb-1' : 'mb-6'}`}
                style={{ color: textColor, fontFamily }}
              >
                {content.main_text}
              </div>
            )}
            
            {content.bullet_points && Array.isArray(content.bullet_points) && content.bullet_points.length > 0 && (
              <ul className={`${isCompact ? 'space-y-0' : 'space-y-3'}`}>
                {content.bullet_points.slice(0, isCompact ? 2 : content.bullet_points.length).map((point: string, idx: number) => (
                  <li key={idx} className={`${isCompact ? 'text-xs' : 'text-base'} flex items-start leading-relaxed`}>
                    <span 
                      className={`${isCompact ? 'text-xs' : 'text-xl'} mr-3 mt-1`}
                      style={{ color: accentColor }}
                    >
                      •
                    </span>
                    <span style={{ color: textColor, fontFamily }}>{unescapeHtml(point)}</span>
                  </li>
                ))}
                {isCompact && content.bullet_points.length > 2 && (
                  <li className="text-xs text-gray-500 ml-4">...and {content.bullet_points.length - 2} more</li>
                )}
              </ul>
            )}
            
            {/* Call to action styling */}
            {content.call_to_action && (
              <div 
                className={`${isCompact ? 'mt-2 p-2 text-center' : 'mt-8 p-4 text-center'} rounded-lg border`}
                style={{ 
                  backgroundColor: `${accentColor}20`, 
                  borderColor: accentColor,
                  fontFamily
                }}
              >
                <p className={`font-semibold ${isCompact ? 'text-xs' : 'text-lg'}`} style={{ color: accentColor }}>
                  {content.call_to_action}
                </p>
              </div>
            )}
            
            {/* Fallback for empty content */}
            {!content.title && !content.subtitle && !content.description && !content.bullets && 
             !content.main_text && !content.bullet_points && !slide.title && (
              <div className="text-center py-12 text-gray-500">
                <p>No content available for this slide.</p>
                {!isCompact && <p className="text-sm mt-2">Click "Edit Slide" to add content.</p>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}