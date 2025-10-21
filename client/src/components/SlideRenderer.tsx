import { cn } from "@/lib/utils";

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
  };
  isCompact?: boolean;
}

export function SlideRenderer({ slide, isCompact = false }: SlideRendererProps) {
  const unescapeHtml = (str: string) => {
    if (!str) return '';
    let s = str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
    // Strip a single wrapping <p>...</p> to avoid invalid nesting (e.g., <p> inside <span>)
    const match = s.match(/^\s*<p[^>]*>([\s\S]*?)<\/p>\s*$/i);
    if (match) s = match[1];
    return s;
  };
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

  // Background style logic - use all brand colors creatively
  const backgroundStyle = backgroundImage 
    ? { 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor
      }
    : {
        // Create beautiful gradient backgrounds using all brand colors
        background: brandColors ? 
          `linear-gradient(135deg, ${backgroundColor} 0%, ${brandColors.primary}20 50%, ${brandColors.secondary}20 100%)` :
          backgroundColor,
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

  // Debug: Log the styling being applied
  console.log('SlideRenderer - Styling received:', styling);
  console.log('SlideRenderer - Background style:', backgroundStyle);
  console.log('SlideRenderer - Final slide style:', slideStyle);
  console.log('SlideRenderer - Positioned elements:', positionedElements);
  console.log('SlideRenderer - Content logos:', content.logos);
  console.log('SlideRenderer - Positioned elements keys:', Object.keys(positionedElements));

  // Check if we should use positioned layout
  const usePositionedLayout = Object.keys(positionedElements).length > 0;

  // If using positioned layout, render with absolute positioning
  if (usePositionedLayout) {
    return (
      <div 
        className={`relative overflow-hidden rounded border ${isCompact ? 'h-24' : 'aspect-video'}`}
        style={slideStyle}
      >
        {/* Logo - positioned absolutely with individual positioning */}
        {((content.logos && Array.isArray(content.logos) && content.logos.length > 0) || logoUrl) && slide.type !== 'title' && (
          <>
            {content.logos && Array.isArray(content.logos) && content.logos.length > 0 ? (
              // New multiple logos format - use all logos from content.logos with individual positioning
              content.logos.map((logoUrl: string, index: number) => {
                const logoKey = `logo-${index}`;
                const logoPosition = positionedElements[logoKey];
                
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
                      left: logoPosition?.x || (index === 0 ? 16 : 16 + (index * 120)),
                      top: logoPosition?.y || (index === 0 ? 16 : 16)
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
            ) : (
              // Fallback to old single logo format
              <div 
                className={`absolute ${isCompact ? 'z-10' : 'z-20'}`}
                style={{
                  left: positionedElements.logo?.x || 16,
                  top: positionedElements.logo?.y || 16
                }}
              >
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className={`${isCompact ? 'h-6' : 'h-10'} w-auto object-contain opacity-95`} 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
              </div>
            )}
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
                    dangerouslySetInnerHTML={{ __html: title }}
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
                  dangerouslySetInnerHTML={{ __html: slide.title }}
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
                    dangerouslySetInnerHTML={{ __html: description }}
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
                  dangerouslySetInnerHTML={{ __html: content.description || '' }}
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

        {/* Centered logo for title slides with individual positioning */}
        {((content.logos && Array.isArray(content.logos) && content.logos.length > 0) || logoUrl) && slide.type === 'title' && (
          <>
            {content.logos && Array.isArray(content.logos) && content.logos.length > 0 ? (
              // New multiple logos format - use all logos from content.logos with individual positioning
              content.logos.map((logoUrl: string, index: number) => {
                const logoKey = `logo-${index}`;
                const logoPosition = positionedElements[logoKey];
                
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
            ) : (
              // Fallback to old single logo format
              <div 
                className="absolute"
                style={{
                  left: positionedElements.logo?.x || '50%',
                  top: positionedElements.logo?.y || 48,
                  transform: positionedElements.logo ? 'none' : 'translateX(-50%)'
                }}
              >
                <img 
                  src={logoUrl} 
                  alt="Company Logo" 
                  className={`${isCompact ? 'h-8' : 'h-16'} w-auto object-contain opacity-95`} 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // Original layout when no positioning is specified
  return (
    <div 
      className={`relative overflow-hidden rounded border ${isCompact ? 'h-24' : 'aspect-video'}`}
      style={slideStyle}
    >
      {/* Logo block - positioned individually for non-title slides */}
      {((content.logos && Array.isArray(content.logos) && content.logos.length > 0) || slide.styling?.allLogos || logoUrl) && slide.type !== 'title' && (
        <>
          {content.logos && Array.isArray(content.logos) && content.logos.length > 0 ? (
            // New multiple logos format - use all logos from content.logos with individual positioning
            content.logos.map((logoUrl: string, index: number) => {
              const logoKey = `logo-${index}`;
              const logoPosition = positionedElements[logoKey];
              
              return (
                <div 
                  key={index}
                  className={`absolute ${isCompact ? 'z-10' : 'z-20'}`}
                  style={{
                    left: logoPosition?.x || (index === 0 ? 16 : 16 + (index * 120)),
                    top: logoPosition?.y || (index === 0 ? 16 : 16)
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
          ) : slide.styling?.allLogos && Array.isArray(slide.styling.allLogos) && slide.styling.allLogos.length > 0 ? (
            // Use all logos from brand kit styling with individual positioning
            slide.styling.allLogos.map((logoUrl: string, index: number) => {
              const logoKey = `logo-${index}`;
              const logoPosition = positionedElements[logoKey];
              
              return (
                <div 
                  key={index}
                  className={`absolute ${isCompact ? 'z-10' : 'z-20'}`}
                  style={{
                    left: logoPosition?.x || (index === 0 ? 16 : 16 + (index * 120)),
                    top: logoPosition?.y || (index === 0 ? 16 : 16)
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
          ) : (
            // Fallback to old single logo format
            <div 
              className={`absolute ${isCompact ? 'z-10' : 'z-20'}`}
              style={{
                left: positionedElements.logo?.x || 16,
                top: positionedElements.logo?.y || 16
              }}
            >
              <img 
                src={logoUrl} 
                alt="Company Logo" 
                className={`${isCompact ? 'h-6' : 'h-10'} w-auto object-contain opacity-95`} 
                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
              />
            </div>
          )}
        </>
      )}

      {/* Main content container */}
      <div className={`p-6 ${isCompact ? 'p-2' : ''}`}>
        {/* Logo for title slides (centered, larger) - only on title slides */}
        {((content.logos && Array.isArray(content.logos) && content.logos.length > 0) || slide.styling?.allLogos || logoUrl) && slide.type === 'title' && (
          <div className="text-center mb-6">
            {content.logos && Array.isArray(content.logos) && content.logos.length > 0 ? (
              // New multiple logos format - use all logos from content.logos with individual positioning
              content.logos.map((logoUrl: string, index: number) => {
                const logoKey = `logo-${index}`;
                const logoPosition = positionedElements[logoKey];
                
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
            ) : slide.styling?.allLogos && Array.isArray(slide.styling.allLogos) && slide.styling.allLogos.length > 0 ? (
              // Use all logos from brand kit styling with individual positioning
              slide.styling.allLogos.map((logoUrl: string, index: number) => {
                const logoKey = `logo-${index}`;
                const logoPosition = positionedElements[logoKey];
                
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
            ) : (
              // Fallback to old single logo format
              <div 
                className="relative"
                style={{
                  left: positionedElements.logo?.x || 'auto',
                  top: positionedElements.logo?.y || 'auto',
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
            )}
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