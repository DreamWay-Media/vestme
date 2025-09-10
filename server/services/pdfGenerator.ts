import { ObjectStorageService } from "../objectStorage";
import puppeteer from "puppeteer";

interface SlideContent {
  id?: string;
  type: string;
  title: string;
  content: any;
  order?: number;
  // AI-generated colors (from the generate deck process)
  backgroundColor?: string;
  textColor?: string;
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
  };
  // Drag and drop positioning
  positionedElements?: {
    title?: { x: number; y: number; width?: number; height?: number };
    description?: { x: number; y: number; width?: number; height?: number };
    bullets?: { x: number; y: number; width?: number; height?: number };
    logo?: { x: number; y: number; width?: number; height?: number };
    [key: string]: { x: number; y: number; width?: number; height?: number } | undefined;
  };
}

interface BrandingConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  logoUrl?: string;
  textColor?: string;
  backgroundColor?: string;
}

export interface GeneratePDFOptions {
  slides: SlideContent[];
  title: string;
  branding?: BrandingConfig;
  projectName: string;
}

/**
 * Applies the same enhanced styling logic as SlideRenderer component
 * This ensures PDF output matches deck preview exactly
 */
function applyEnhancedStyling(slide: SlideContent, branding: BrandingConfig): any {
  // Use the EXACT same styling logic as SlideRenderer in the frontend
  const enhancedStyling = {
    // Use saved styling colors first, then AI-generated colors, then fall back to brand kit colors
    backgroundColor: slide.styling?.backgroundColor || slide.backgroundColor || '#ffffff',
    textColor: slide.styling?.textColor || slide.textColor || branding.primaryColor || '#333333',
    
    // Brand kit colors (available for creative use) - prioritize saved styling over AI colors
    primaryColor: slide.styling?.primaryColor || slide.textColor || branding.primaryColor || '#3b82f6',
    secondaryColor: slide.styling?.secondaryColor || slide.backgroundColor || branding.secondaryColor || '#64748b',
    accentColor: slide.styling?.accentColor || branding.accentColor || '#10b981',
    
    // Additional styling - prioritize slide styling over brand kit defaults
    fontFamily: slide.styling?.fontFamily || branding.fontFamily || 'Inter',
    fontSize: slide.styling?.fontSize || 'medium',
    titleFontSize: slide.styling?.titleFontSize || '3xl', // AI default: large impact
    descriptionFontSize: slide.styling?.descriptionFontSize || 'lg', // AI default: clear readability
    bulletFontSize: slide.styling?.bulletFontSize || 'base', // AI default: comfortable reading
    logoUrl: branding.logoUrl || slide.styling?.logoUrl,
    backgroundImage: slide.styling?.backgroundImage,
    
    // Make all brand colors available for creative use
    brandColors: {
      primary: slide.styling?.primaryColor || slide.textColor || branding.primaryColor || '#3b82f6',
      secondary: slide.styling?.secondaryColor || slide.backgroundColor || branding.secondaryColor || '#64748b',
      accent: slide.styling?.accentColor || branding.accentColor || '#10b981'
    }
  };

  console.log('PDF Generation - Enhanced styling applied:', {
    slideTitle: slide.title,
    originalStyling: slide.styling,
    enhancedStyling: enhancedStyling,
    branding: branding,
    positionedElements: slide.positionedElements,
    logos: slide.content?.logos
  });

  // Additional detailed color logging
  console.log('PDF Generation - Color breakdown:', {
    slideBackgroundColor: slide.backgroundColor,
    slideTextColor: slide.textColor,
    slideStylingBackgroundColor: slide.styling?.backgroundColor,
    slideStylingTextColor: slide.styling?.textColor,
    slideStylingPrimaryColor: slide.styling?.primaryColor,
    slideStylingSecondaryColor: slide.styling?.secondaryColor,
    brandingPrimaryColor: branding.primaryColor,
    brandingSecondaryColor: branding.secondaryColor,
    finalBackgroundColor: enhancedStyling.backgroundColor,
    finalTextColor: enhancedStyling.textColor,
    finalPrimaryColor: enhancedStyling.primaryColor,
    finalSecondaryColor: enhancedStyling.secondaryColor
  });

  return enhancedStyling;
}

/**
 * Generates HTML content for a slide using enhanced styling
 */
function generateSlideHTML(slide: SlideContent, branding: BrandingConfig, slideNumber: number): string {
  const content = slide.content || {};
  
  // Apply the same enhanced styling logic as SlideRenderer
  const styling = applyEnhancedStyling(slide, branding);
  
  const primaryColor = styling.primaryColor;
  const secondaryColor = styling.secondaryColor;
  const accentColor = styling.accentColor;
  const textColor = styling.textColor;
  const backgroundColor = styling.backgroundColor;
  const fontFamily = styling.fontFamily;
  const logoUrl = styling.logoUrl;
  
  // Convert font sizes to pixels for PDF
  const toPx = (size: string) => {
    switch (size) {
      case 'small': return '14px';
      case 'base': return '16px';
      case 'medium': return '16px';
      case 'large': return '18px';
      case 'lg': return '18px';
      case 'xl': return '20px';
      case '2xl': return '24px';
      case '3xl': return '30px';
      case '4xl': return '36px';
      case '5xl': return '48px';
      default: return '16px';
    }
  };
  
  const titleSizePx = toPx(styling.titleFontSize);
  const descSizePx = toPx(styling.descriptionFontSize);
  const bulletSizePx = toPx(styling.bulletFontSize);
  
  // Check if we should use positioned layout
  const positionedElements = slide.positionedElements || {};
  const usePositionedLayout = Object.keys(positionedElements).length > 0;
  
  // Slide background: use image if provided, else solid color
  const backgroundImage = slide.styling?.backgroundImage;
  const backgroundStyle = backgroundImage && backgroundImage.trim() !== ''
    ? `background: ${backgroundColor}; background-image: url('${backgroundImage}'); background-size: cover; background-position: center; background-repeat: no-repeat;`
    : `background: ${backgroundColor};`;

  console.log('PDF Generation - Background styling:', {
    slideTitle: slide.title,
    backgroundColor: backgroundColor,
    brandColors: styling.brandColors,
    primaryColor: styling.brandColors?.primary,
    secondaryColor: styling.brandColors?.secondary,
    backgroundStyle: backgroundStyle,
    usePositionedLayout: usePositionedLayout,
    positionedElements: positionedElements
  });

  // If using positioned layout, render with absolute positioning
  if (usePositionedLayout) {
    let positionedContent = '';
    
    // Logo - positioned absolutely
    if (logoUrl && slide.type !== 'title') {
      const logoPos = positionedElements.logo || { x: 16, y: 16 };
      positionedContent += `
        <div style="position: absolute; left: ${logoPos.x}px; top: ${logoPos.y}px; z-index: 20;">
          <img src="${logoUrl}" alt="Logo" style="height: 40px; width: auto; opacity: 0.95;" />
        </div>
      `;
    }
    
    // Title - positioned absolutely
    if ((content.titles && Array.isArray(content.titles) && content.titles.length > 0) || slide.title) {
      const titlePos = positionedElements.title || { x: 48, y: 48 };
      positionedContent += `
        <div style="position: absolute; left: ${titlePos.x}px; top: ${titlePos.y}px; right: ${slide.type === 'title' ? 48 : 'auto'}px;">
      `;
      
      if (content.titles && Array.isArray(content.titles) && content.titles.length > 0) {
        // Render raw HTML to preserve inline font-size/styles
        content.titles.forEach((title: string, index: number) => {
          positionedContent += `
            <div style="color: ${styling.brandColors?.primary || textColor}; font-weight: bold; margin: 0; line-height: 1.2; font-family: ${fontFamily}; margin-bottom: ${index < content.titles.length - 1 ? '16px' : '0'};">${title}</div>
          `;
        });
      } else {
        // Old single title format
        positionedContent += `
          <div style="color: ${styling.brandColors?.primary || textColor}; font-weight: bold; margin: 0; line-height: 1.2; font-family: ${fontFamily};">${slide.title}</div>
        `;
      }
      
      positionedContent += '</div>';
    }
    
    // Descriptions - positioned absolutely
    if ((content.descriptions && Array.isArray(content.descriptions) && content.descriptions.length > 0) || content.description) {
      const descPos = positionedElements.description || { x: 48, y: 120 };
      positionedContent += `
        <div style="position: absolute; left: ${descPos.x}px; top: ${descPos.y}px; right: 48px;">
      `;
      
      if (content.descriptions && Array.isArray(content.descriptions) && content.descriptions.length > 0) {
        // Render raw HTML blocks
        content.descriptions.forEach((description: string, index: number) => {
          positionedContent += `
            <div style="margin-bottom: ${index < content.descriptions.length - 1 ? '16px' : '0'}; color: ${styling.brandColors?.primary || textColor}; line-height: 1.6; font-family: ${fontFamily};">${description}</div>
          `;
        });
      } else {
        // Old single description format
        positionedContent += `
          <div style="color: ${styling.brandColors?.primary || textColor}; line-height: 1.6; font-family: ${fontFamily};">${content.description}</div>
        `;
      }
      
      positionedContent += '</div>';
    }
    
    // Bullet Points - positioned absolutely
    if (content.bullets && Array.isArray(content.bullets)) {
      const bulletsPos = positionedElements.bullets || { x: 48, y: 200 };
      positionedContent += `
        <div style="position: absolute; left: ${bulletsPos.x}px; top: ${bulletsPos.y}px; right: 48px;">
      `;
      content.bullets.forEach((bullet: string) => {
        positionedContent += `
          <div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
            <span style="display:inline-block; width:12px; height:12px; background:${styling.brandColors?.accent || accentColor}; border-radius:50%; margin-right:12px; margin-top:8px;"></span>
            <span style="color: ${styling.brandColors?.primary || textColor}; font-size: ${bulletSizePx}; line-height: 1.5; font-family: ${fontFamily};">${bullet}</span>
          </div>
        `;
      });
      positionedContent += '</div>';
    }
    
    // Logo - positioned absolutely for non-title slides
    if (((content.logos && Array.isArray(content.logos) && content.logos.length > 0) || logoUrl) && slide.type !== 'title') {
      if (content.logos && Array.isArray(content.logos) && content.logos.length > 0) {
        // New multiple logos format - use all logos from content.logos with individual positioning
        content.logos.forEach((logoUrl: string, index: number) => {
          const logoKey = `logo-${index}`;
          const logoPosition = positionedElements[logoKey];
          const logoPos = logoPosition || { x: 16 + (index * 120), y: 16 };
          
          console.log(`PDF Generation - Non-title Logo ${index} positioning:`, {
            logoKey,
            logoPosition,
            logoPos,
            logoUrl
          });
          
          positionedContent += `
            <div style="position: absolute; left: ${logoPos.x}px; top: ${logoPos.y}px; z-index: 20;">
              <img src="${logoUrl}" alt="Logo ${index + 1}" style="height: 40px; width: auto; opacity: 0.95;" />
            </div>
          `;
        });
      } else {
        // Fallback to old single logo format
        const logoPos = positionedElements.logo || { x: 16, y: 16 };
        positionedContent += `
          <div style="position: absolute; left: ${logoPos.x}px; top: ${logoPos.y}px; z-index: 20;">
            <img src="${logoUrl}" alt="Logo" style="height: 40px; width: auto; opacity: 0.95;" />
          </div>
        `;
      }
    }
    
    // Centered logo for title slides with individual positioning
    if (((content.logos && Array.isArray(content.logos) && content.logos.length > 0) || logoUrl) && slide.type === 'title') {
      if (content.logos && Array.isArray(content.logos) && content.logos.length > 0) {
        // New multiple logos format - use all logos from content.logos with individual positioning
        content.logos.forEach((logoUrl: string, index: number) => {
          const logoKey = `logo-${index}`;
          const logoPosition = positionedElements[logoKey];
          const logoPos = logoPosition || { x: '50%', y: 48 };
          const transform = logoPosition ? 'none' : 'translateX(-50%)';
          
          console.log(`PDF Generation - Title Logo ${index} positioning:`, {
            logoKey,
            logoPosition,
            logoPos,
            transform,
            logoUrl
          });
          
          positionedContent += `
            <div style="position: absolute; left: ${logoPos.x}px; top: ${logoPos.y}px; transform: ${transform};">
              <img src="${logoUrl}" alt="Logo ${index + 1}" style="height: 64px; width: auto; opacity: 0.95;" />
            </div>
          `;
        });
      } else {
        // Fallback to old single logo format
        const logoPos = positionedElements.logo || { x: '50%', y: 48 };
        const transform = positionedElements.logo ? 'none' : 'translateX(-50%)';
        positionedContent += `
          <div style="position: absolute; left: ${logoPos.x}px; top: ${logoPos.y}px; transform: ${transform};">
            <img src="${logoUrl}" alt="Logo" style="height: 64px; width: auto; opacity: 0.95;" />
          </div>
        `;
      }
    }
    
    return `
      <div style="
        width: 100%; 
        height: 100vh; 
        padding: 24px; 
        ${backgroundStyle}
        font-family: ${fontFamily};
        box-sizing: border-box;
        page-break-after: always;
        display: flex;
        flex-direction: column;
        position: relative;
        border-radius: 0;
        overflow: hidden;
      ">
        ${positionedContent}
        <div style="position: absolute; bottom: 16px; right: 24px; font-size: 12px; color: rgba(255,255,255,0.85); background: rgba(0,0,0,0.18); padding: 4px 8px; border-radius: 8px;">
          ${slideNumber}
        </div>
      </div>
    `;
  }

  // Original layout when no positioning is specified
  let slideContent = '';
  
  // Logo for title slides with individual positioning - only on title slides
  if (((content.logos && Array.isArray(content.logos) && content.logos.length > 0) || logoUrl) && slide.type === 'title') {
    if (content.logos && Array.isArray(content.logos) && content.logos.length > 0) {
      // New multiple logos format - use all logos from content.logos with individual positioning
      content.logos.forEach((logoUrl: string, index: number) => {
        const logoKey = `logo-${index}`;
        const logoPosition = positionedElements[logoKey];
        
        if (logoPosition) {
          // Use positioned layout
          slideContent += `
            <div style="position: absolute; left: ${logoPosition.x}px; top: ${logoPosition.y}px;">
              <img src="${logoUrl}" alt="Logo ${index + 1}" style="height: 64px; width: auto; opacity: 0.95;" />
            </div>
          `;
        } else {
          // Use centered layout
          slideContent += `
            <div style="text-align: center; margin-bottom: 24px;">
              <img src="${logoUrl}" alt="Logo ${index + 1}" style="height: 64px; width: auto; opacity: 0.95;" />
            </div>
          `;
        }
      });
    } else {
      // Fallback to old single logo format
      const logoPosition = positionedElements.logo;
      
      if (logoPosition) {
        // Use positioned layout
        slideContent += `
          <div style="position: absolute; left: ${logoPosition.x}px; top: ${logoPosition.y}px;">
            <img src="${logoUrl}" alt="Logo" style="height: 64px; width: auto; opacity: 0.95;" />
          </div>
        `;
      } else {
        // Use centered layout
        slideContent += `
          <div style="text-align: center; margin-bottom: 24px;">
            <img src="${logoUrl}" alt="Logo" style="height: 64px; width: auto; opacity: 0.95;" />
          </div>
        `;
      }
    }
  }
  
  // Main title
  if ((content.titles && Array.isArray(content.titles) && content.titles.length > 0) || slide.title) {
    const rightPadding = slide.type === 'title' ? '0' : '64px';
    
    if (content.titles && Array.isArray(content.titles) && content.titles.length > 0) {
      // New multiple titles format
      content.titles.forEach((title: string, index: number) => {
        slideContent += `<h1 style="color: ${styling.brandColors?.primary || textColor}; font-size: ${titleSizePx}; font-weight: bold; margin-bottom: ${index < content.titles.length - 1 ? '16px' : '32px'}; line-height: 1.2; font-family: ${fontFamily}; padding-right: ${rightPadding};">${title}</h1>`;
      });
    } else {
      // Old single title format
      slideContent += `<h1 style="color: ${styling.brandColors?.primary || textColor}; font-size: ${titleSizePx}; font-weight: bold; margin-bottom: 32px; line-height: 1.2; font-family: ${fontFamily}; padding-right: ${rightPadding};">${slide.title}</h1>`;
    }
  }
  
  // AI-generated slide content support
  if ((content.descriptions && Array.isArray(content.descriptions) && content.descriptions.length > 0) || content.description) {
    slideContent += `<div style="border-left: 4px solid ${styling.brandColors?.accent || accentColor}; padding-left: 16px; padding-right: 64px; margin-bottom: 24px;">`;
    
    if (content.descriptions && Array.isArray(content.descriptions) && content.descriptions.length > 0) {
      // New multiple descriptions format
      content.descriptions.forEach((description: string, index: number) => {
        slideContent += `<p style="color: ${styling.brandColors?.primary || textColor}; font-size: ${descSizePx}; margin: 0; line-height: 1.6; font-family: ${fontFamily}; margin-bottom: ${index < content.descriptions.length - 1 ? '16px' : '0'};">${description}</p>`;
      });
    } else {
      // Old single description format
      slideContent += `<p style="color: ${styling.brandColors?.primary || textColor}; font-size: ${descSizePx}; margin: 0; line-height: 1.6; font-family: ${fontFamily};">${content.description}</p>`;
    }
    
    slideContent += '</div>';
  }
  
  if (content.bullets && Array.isArray(content.bullets)) {
    const rightPadding = slide.type === 'title' ? '0' : '64px';
    slideContent += `<div style="margin: 24px 0; padding-right: ${rightPadding};">`;
    content.bullets.forEach((bullet: string) => {
      slideContent += `<div style="display: flex; align-items: flex-start; margin-bottom: 16px;">
        <span style="display:inline-block; width:12px; height:12px; background:${styling.brandColors?.accent || accentColor}; border-radius:50%; margin-right:12px; margin-top:8px;"></span>
        <span style="color: ${styling.brandColors?.primary || textColor}; font-size: ${bulletSizePx}; line-height: 1.5; font-family: ${fontFamily};">${bullet}</span>
      </div>`;
    });
    slideContent += '</div>';
  }
  
  // Fallback for other content formats
  if (content.title && content.title !== slide.title) {
    slideContent += `<h2 style="color: ${primaryColor}; font-size: 32px; font-weight: bold; margin-bottom: 24px; font-family: ${fontFamily}; padding-right: 64px;">${content.title}</h2>`;
  }
  
  if (content.subtitle) {
    slideContent += `<p style="color: ${textColor}; font-size: 24px; margin-bottom: 24px; line-height: 1.5; font-family: ${fontFamily}; padding-right: 64px;">${content.subtitle}</p>`;
  }
  
  if (content.bullet_points && Array.isArray(content.bullet_points)) {
    content.bullet_points.forEach((point: string) => {
      slideContent += `<div style="display: flex; align-items: flex-start; margin-bottom: 20px; padding-right: 64px;">
        <span style="color: ${primaryColor}; font-size: 24px; margin-right: 16px; margin-top: 4px;">•</span>
        <span style="color: ${textColor}; font-size: 22px; line-height: 1.5; font-family: ${fontFamily};">${point}</span>
      </div>`;
    });
  }
  
  if (content.main_text) {
    slideContent += `<p style="color: ${textColor}; font-size: 24px; margin-bottom: 32px; line-height: 1.6; font-family: ${fontFamily}; padding-right: 64px;">${content.main_text}</p>`;
  }

    // Logo block - positioned individually for non-title slides
    if (((content.logos && Array.isArray(content.logos) && content.logos.length > 0) || logoUrl) && slide.type !== 'title') {
      if (content.logos && Array.isArray(content.logos) && content.logos.length > 0) {
        // New multiple logos format - use all logos from content.logos with individual positioning
        content.logos.forEach((logoUrl: string, index: number) => {
          const logoKey = `logo-${index}`;
          const logoPosition = positionedElements[logoKey];
          const logoPos = logoPosition || { x: 16 + (index * 120), y: 16 };
          
          slideContent += `
            <div style="position: absolute; left: ${logoPos.x}px; top: ${logoPos.y}px; z-index: 20;">
              <img src="${logoUrl}" alt="Logo ${index + 1}" style="height: 40px; width: auto; opacity: 0.95;" />
            </div>
          `;
        });
      } else {
        // Fallback to old single logo format
        const logoPos = positionedElements.logo || { x: 16, y: 16 };
        slideContent += `
          <div style="position: absolute; left: ${logoPos.x}px; top: ${logoPos.y}px; z-index: 20;">
            <img src="${logoUrl}" alt="Logo" style="height: 40px; width: auto; opacity: 0.95;" />
          </div>
        `;
      }
    }

  return `
    <div style="
      width: 100%; 
      height: 100vh; 
      padding: 24px; 
      ${backgroundStyle}
      font-family: ${fontFamily};
      box-sizing: border-box;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      position: relative;
      border-radius: 0;
      overflow: hidden;
    ">
      <div style="flex: 1;">
        ${slideContent}
      </div>
      <div style="position: absolute; bottom: 16px; right: 24px; font-size: 12px; color: rgba(255,255,255,0.85); background: rgba(0,0,0,0.18); padding: 4px 8px; border-radius: 8px;">
        ${slideNumber}
      </div>
    </div>
  `;
}

/**
 * Generates a PDF from pitch deck slides using Puppeteer
 */
export async function generatePitchDeckPDF(options: GeneratePDFOptions): Promise<string> {
  console.log('=== PDF GENERATION START ===');
  console.log('Options received:', JSON.stringify(options, null, 2));
  console.log('Branding config:', options.branding);
  console.log('First slide data:', options.slides[0]);
  console.log('First slide styling:', options.slides[0]?.styling);
  console.log('First slide backgroundColor:', options.slides[0]?.backgroundColor);
  console.log('First slide textColor:', options.slides[0]?.textColor);
  
  try {
    console.log(`Generating PDF for ${options.projectName} with ${options.slides.length} slides`);
    
    // Sort slides by order
    const sortedSlides = options.slides.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const branding: BrandingConfig = {
      primaryColor: options.branding?.primaryColor || '#3b82f6',
      secondaryColor: options.branding?.secondaryColor || '#64748b',
      accentColor: options.branding?.accentColor || '#f59e0b',
      fontFamily: options.branding?.fontFamily || 'Arial, sans-serif',
      logoUrl: options.branding?.logoUrl
    };

    // Log branding and slide styling information for debugging
    console.log('PDF Generation - Branding config:', branding);
    console.log('PDF Generation - Sample slide styling (first slide):', {
      slideTitle: sortedSlides[0]?.title,
      slideStyling: sortedSlides[0]?.styling,
      slideBackgroundColor: sortedSlides[0]?.backgroundColor,
      slideTextColor: sortedSlides[0]?.textColor,
      contentKeys: Object.keys(sortedSlides[0]?.content || {})
    });

    // Generate HTML content for all slides
    const slidesHTML = sortedSlides.map((slide, index) => 
      generateSlideHTML(slide, branding, index + 1)
    ).join('');

    const fullHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${options.title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body { 
            margin: 0; 
            padding: 0; 
            font-family: ${branding.fontFamily};
            width: 100%;
            height: 100%;
          }
          @page {
            size: A4 landscape;
            margin: 0;
            padding: 0;
          }
          .slide {
            width: 100%;
            height: 100vh;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>
        ${slidesHTML}
      </body>
      </html>
    `;

    // Log HTML content for debugging (first 500 chars)
    console.log('PDF Generation - Generated HTML preview (first 500 chars):', fullHTML.substring(0, 500));

    // Find system Chromium executable with multiple fallback options
    let chromiumPath: string | undefined;
    const possiblePaths = [
      'chromium',
      'chromium-browser',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ];
    
    try {
      const { execSync } = require('child_process');
      for (const path of possiblePaths) {
        try {
          const result = execSync(`which "${path}"`, { encoding: 'utf8' }).trim();
          if (result) {
            chromiumPath = result;
            break;
          }
        } catch (e) {
          // Try next path
        }
      }
    } catch (error) {
      console.log('Could not find Chromium via which command');
    }
    
    // If no system Chromium found, try to use Puppeteer's installed browser
    if (!chromiumPath) {
      try {
        const puppeteer = require('puppeteer');
        chromiumPath = puppeteer.executablePath();
        console.log('Using Puppeteer-installed browser:', chromiumPath);
      } catch (error) {
        console.error('Could not find Puppeteer browser path');
      }
    }
    
    console.log('Using Chromium executable:', chromiumPath || 'system default');
    
    // Launch Puppeteer and generate PDF
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    };
    
    // Only set executablePath if we found a valid Chromium path
    if (chromiumPath) {
      launchOptions.executablePath = chromiumPath;
    }
    
    console.log('Launching browser with options:', launchOptions);
    
    let browser;
    try {
      browser = await puppeteer.launch(launchOptions);
    } catch (error: any) {
      console.error('Failed to launch browser with executablePath, trying without:', error.message);
      // Try launching without executablePath as fallback
      delete launchOptions.executablePath;
      browser = await puppeteer.launch(launchOptions);
    }
    
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Setting page content...');
    await page.setContent(fullHTML, { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('Generating PDF buffer...');
    let pdfBuffer: any = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true,
      timeout: 30000
    });
    
    await browser.close();
    
    // Normalize to Node Buffer (Puppeteer can return Uint8Array in some envs)
    if (pdfBuffer && !(Buffer.isBuffer(pdfBuffer))) {
      pdfBuffer = Buffer.from(pdfBuffer);
    }

    // Validate PDF buffer
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }
    
    console.log(`PDF buffer generated successfully: ${pdfBuffer.length} bytes`);

    // Generate filename and store PDF
    const timestamp = Date.now();
    const cleanProjectName = options.projectName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileName = `${cleanProjectName}-pitch-deck-${timestamp}.pdf`;
    
    // Store PDF in object storage (mock for now - in production would use actual object storage)
    (global as any).pdfCache = (global as any).pdfCache || new Map();
    (global as any).pdfCache.set(fileName, pdfBuffer);
    
    const pdfUrl = `/api/decks/pdf/${fileName}`;
    
    console.log(`Generated PDF for ${options.projectName}:`);
    console.log(`  - Clean name: ${cleanProjectName}`);
    console.log(`  - File name: ${fileName}`);
    console.log(`  - PDF URL: ${pdfUrl}`);
    console.log(`  - Styling consistency: Enhanced styling system applied to ${sortedSlides.length} slides`);
    
    return pdfUrl;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate pitch deck PDF");
  }
}
  
  /**
   * Creates a downloadable link for a deck
   */
  export function createDeckDownloadLink(deckId: string, fileName: string): string {
    return `/api/decks/${deckId}/download/${fileName}`;
  }
  
  /**
   * Validates slide content for PDF generation
   */
  export function validateSlideContent(slides: SlideContent[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!slides || slides.length === 0) {
      errors.push("At least one slide is required");
      return { isValid: false, errors };
    }
    
    slides.forEach((slide, index) => {
      if (!slide.title || slide.title.trim().length === 0) {
        errors.push(`Slide ${index + 1}: Title is required`);
      }
      
      if (!slide.content || slide.content.trim().length === 0) {
        errors.push(`Slide ${index + 1}: Content is required`);
      }
      
      if (!slide.type || slide.type.trim().length === 0) {
        errors.push(`Slide ${index + 1}: Type is required`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }