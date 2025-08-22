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
      logoUrl?: string;
      textColor?: string;
      backgroundColor?: string;
      backgroundImage?: string;
    };
  };
  isCompact?: boolean;
}

export function SlideRenderer({ slide, isCompact = false }: SlideRendererProps) {
  const content = slide.content || {};
  const styling = slide.styling || {};
  
  // Extract styling variables
  const primaryColor = styling.primaryColor || '#3b82f6';
  const textColor = styling.textColor || '#333333';
  const accentColor = styling.accentColor || '#fd7e14';
  const fontFamily = styling.fontFamily || 'Inter';
  const logoUrl = styling.logoUrl;
  const backgroundColor = styling.backgroundColor || '#ffffff';
  const backgroundImage = styling.backgroundImage;

  // Background style logic
  const backgroundStyle = backgroundImage 
    ? { 
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor
      }
    : { backgroundColor };

  // Style object for the entire slide content
  const slideStyle = {
    fontFamily,
    color: textColor,
    ...backgroundStyle
  };

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
      className={`relative overflow-hidden ${isCompact ? 'h-full p-2' : 'h-full p-6'}`}
      style={slideStyle}
    >
      <div className={`h-full ${isCompact ? 'text-xs' : ''} overflow-hidden`}>
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
            className={`${isCompact ? 'text-sm' : 'text-3xl'} font-bold leading-tight ${isCompact ? 'mb-1' : 'mb-6'}`}
            style={{ color: primaryColor, fontFamily }}
            dangerouslySetInnerHTML={{ __html: slide.title }}
          />
        )}
        
        {/* Render dynamic sections first */}
        {renderSections()}

        {/* Legacy content support - only render if no sections exist */}
        {(!content.sections || content.sections.length === 0) && (
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