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
    };
  };
  isCompact?: boolean;
}

export function SlideRenderer({ slide, isCompact = false }: SlideRendererProps) {
  const content = slide.content || {};
  const styling = slide.styling || {};
  
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

  // Render sections (new format)
  const renderSections = () => {
    if (!content.sections || !Array.isArray(content.sections)) {
      return null;
    }

    return content.sections
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .map((section: any, index: number) => {
        const sectionKey = `${slide.id}-${section.id || index}`;
        
        if (section.type === 'image' && section.content) {
          return (
            <div key={sectionKey} className={isCompact ? "mb-2" : "mb-4"}>
              <img 
                src={section.content} 
                alt="Slide content" 
                className={`w-full object-contain rounded ${isCompact ? 'h-16 max-w-full' : 'max-h-64'}`}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          );
        }

        if (section.content) {
          const getTextStyles = () => {
            switch (section.type) {
              case 'title':
                return `${isCompact ? 'text-sm' : 'text-2xl'} font-bold mb-2`;
              case 'subtitle':
                return `${isCompact ? 'text-xs' : 'text-lg'} font-semibold mb-2`;
              case 'bullet':
                return `${isCompact ? 'text-xs' : 'text-base'} ml-4 mb-1`;
              default:
                return `${isCompact ? 'text-xs' : 'text-base'} mb-2`;
            }
          };

          return (
            <div
              key={sectionKey}
              className={`${getTextStyles()} leading-relaxed`}
              style={{ color: section.type === 'title' ? primaryColor : textColor }}
              dangerouslySetInnerHTML={{ 
                __html: section.content
              }}
            />
          );
        }

        return null;
      });
  };

  return (
    <div 
      className={`relative overflow-hidden w-full ${isCompact ? 'h-full p-2' : 'h-full p-6'}`}
      style={{
        ...slideStyle,
        // Ensure background color is applied
        backgroundColor: backgroundColor
      }}
    >
      <div className={`w-full h-full ${isCompact ? 'text-xs' : ''} overflow-hidden`}>
        {/* Logo for title slides */}
        {slide.type === 'title' && logoUrl && (
          <div className={`flex justify-center ${isCompact ? 'mb-2' : 'mb-6'}`}>
            <img 
              src={logoUrl} 
              alt="Company Logo" 
              className={`${isCompact ? 'h-8' : 'h-16'} w-auto object-contain`} 
            />
          </div>
        )}
        
        {/* Always show slide title if it exists and no title section */}
        {slide.title && !content.sections?.some((s: any) => s.type === 'title') && (
          <div 
            className={`${isCompact ? 'text-sm' : ''} font-bold leading-tight ${isCompact ? 'mb-1' : 'mb-6'}`}
            style={{ 
              color: textColor, 
              fontFamily,
              fontSize: isCompact ? '0.875rem' : getFontSize(titleFontSize),
              // Add subtle text shadow using brand colors for depth
              textShadow: brandColors ? `2px 2px 4px ${brandColors.primary}40` : 'none'
            }}
            dangerouslySetInnerHTML={{ __html: slide.title }}
          />
        )}
        
        {/* Render dynamic sections first */}
        {renderSections()}

        {/* AI-generated slide content support */}
        {content.description && (
          <div 
            className={`${isCompact ? 'text-xs' : ''} leading-relaxed ${isCompact ? 'mb-1' : 'mb-4'}`}
            style={{ 
              color: textColor, 
              fontFamily,
              fontSize: isCompact ? '0.75rem' : getFontSize(descriptionFontSize),
              // Add subtle border using brand colors
              borderLeft: brandColors ? `4px solid ${brandColors.accent}` : 'none',
              paddingLeft: brandColors ? '12px' : '0'
            }}
            dangerouslySetInnerHTML={{ __html: content.description }}
          />
        )}
        
        {content.bullets && Array.isArray(content.bullets) && content.bullets.length > 0 && (
          <ul className={`${isCompact ? 'space-y-0' : 'space-y-2'}`}>
            {content.bullets.slice(0, isCompact ? 3 : content.bullets.length).map((bullet: string, idx: number) => (
              <li 
                key={idx}
                style={{ 
                  color: textColor, 
                  fontFamily,
                  fontSize: isCompact ? '0.75rem' : getFontSize(bulletFontSize),
                  // Use brand colors for bullet points
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
                <span dangerouslySetInnerHTML={{ __html: bullet }} />
              </li>
            ))}
            {isCompact && content.bullets.length > 3 && (
              <li className="text-xs text-gray-500 ml-4">...and {content.bullets.length - 3} more</li>
            )}
          </ul>
        )}

        {/* Legacy content support - only render if no AI-generated content exists */}
        {(!content.description && !content.bullets) && (
          <>
            {content.title && content.title !== slide.title && (
              <div 
                className={`${isCompact ? 'text-sm' : 'text-2xl'} font-bold leading-tight ${isCompact ? 'mb-1' : 'mb-3'}`}
                style={{ color: primaryColor, fontFamily }}
                dangerouslySetInnerHTML={{ __html: content.title }}
              />
            )}
            
            {content.subtitle && (
              <div 
                className={`${isCompact ? 'text-xs' : 'text-lg'} leading-relaxed ${isCompact ? 'mb-1' : 'mb-3'}`}
                style={{ color: textColor, fontFamily }}
                dangerouslySetInnerHTML={{ __html: content.subtitle }}
              />
            )}
            
            {content.description && (
              <div 
                className={`leading-relaxed ${isCompact ? 'mb-1' : 'mb-3'}`}
                style={{ color: textColor, fontFamily }}
                dangerouslySetInnerHTML={{ __html: content.description }}
              />
            )}
            
            {content.bullets && Array.isArray(content.bullets) && content.bullets.length > 0 && (
              <ul className={`list-disc list-inside ${isCompact ? 'space-y-0' : 'space-y-2'}`}>
                {content.bullets.slice(0, isCompact ? 2 : content.bullets.length).map((bullet: string, idx: number) => (
                  <li 
                    key={idx}
                    style={{ color: textColor, fontFamily }}
                    dangerouslySetInnerHTML={{ __html: bullet }}
                  />
                ))}
                {isCompact && content.bullets.length > 2 && (
                  <li className="text-xs text-gray-500">...and {content.bullets.length - 2} more</li>
                )}
              </ul>
            )}
            
            {/* Handle other content formats that might exist */}
            {content.main_text && (
              <div 
                className={`${isCompact ? 'text-xs' : 'text-xl'} leading-relaxed ${isCompact ? 'mb-1' : 'mb-6'}`}
                style={{ color: textColor, fontFamily }}
                dangerouslySetInnerHTML={{ __html: content.main_text }}
              />
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
                    <span style={{ color: textColor, fontFamily }}>{point}</span>
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