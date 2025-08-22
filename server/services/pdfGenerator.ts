import { ObjectStorageService } from "../objectStorage";
import puppeteer from "puppeteer";

interface SlideContent {
  id?: string;
  type: string;
  title: string;
  content: any;
  order?: number;
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
 * Generates HTML content for a slide
 */
function generateSlideHTML(slide: SlideContent, branding: BrandingConfig, slideNumber: number): string {
  const content = slide.content || {};
  const styling = slide.styling || branding;
  
  const primaryColor = styling.primaryColor || '#3b82f6';
  const textColor = styling.textColor || '#333333';
  const backgroundColor = styling.backgroundColor || '#ffffff';
  const fontFamily = styling.fontFamily || 'Arial, sans-serif';
  const logoUrl = styling.logoUrl;

  let slideContent = '';
  
  // Handle different slide types and content formats
  if (content.sections && Array.isArray(content.sections)) {
    // Dynamic sections format
    slideContent = content.sections
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .map((section: any) => {
        if (section.type === 'image' && section.content) {
          return `<div style="text-align: center; margin: 20px 0;">
            <img src="${section.content}" alt="Slide image" style="max-width: 100%; height: auto; border-radius: 8px;" />
          </div>`;
        } else if (section.content) {
          const fontSize = section.type === 'title' ? '28px' : '16px';
          const fontWeight = section.type === 'title' ? 'bold' : 'normal';
          const color = section.type === 'title' ? primaryColor : textColor;
          const marginLeft = section.type === 'bullet' ? '20px' : '0';
          
          return `<div style="font-size: ${fontSize}; font-weight: ${fontWeight}; color: ${color}; margin: 15px 0; margin-left: ${marginLeft}; line-height: 1.5;">
            ${section.content}
          </div>`;
        }
        return '';
      }).join('');
  } else {
    // Legacy content format
    if (slide.title) {
      slideContent += `<h1 style="color: ${primaryColor}; font-size: 32px; font-weight: bold; margin-bottom: 20px; font-family: ${fontFamily};">${slide.title}</h1>`;
    }
    
    if (content.title && content.title !== slide.title) {
      slideContent += `<h2 style="color: ${primaryColor}; font-size: 24px; font-weight: bold; margin-bottom: 15px; font-family: ${fontFamily};">${content.title}</h2>`;
    }
    
    if (content.subtitle) {
      slideContent += `<p style="color: ${textColor}; font-size: 18px; margin-bottom: 15px; line-height: 1.5; font-family: ${fontFamily};">${content.subtitle}</p>`;
    }
    
    if (content.description) {
      slideContent += `<p style="color: ${textColor}; font-size: 16px; margin-bottom: 15px; line-height: 1.6; font-family: ${fontFamily};">${content.description}</p>`;
    }
    
    if (content.bullets && Array.isArray(content.bullets)) {
      slideContent += '<ul style="margin: 20px 0; padding-left: 20px;">';
      content.bullets.forEach((bullet: string) => {
        slideContent += `<li style="color: ${textColor}; font-size: 16px; margin-bottom: 8px; line-height: 1.5; font-family: ${fontFamily};">${bullet}</li>`;
      });
      slideContent += '</ul>';
    }
    
    if (content.bullet_points && Array.isArray(content.bullet_points)) {
      content.bullet_points.forEach((point: string) => {
        slideContent += `<div style="display: flex; align-items: flex-start; margin-bottom: 12px;">
          <span style="color: ${primaryColor}; font-size: 20px; margin-right: 10px; margin-top: 2px;">•</span>
          <span style="color: ${textColor}; font-size: 16px; line-height: 1.5; font-family: ${fontFamily};">${point}</span>
        </div>`;
      });
    }
    
    if (content.main_text) {
      slideContent += `<p style="color: ${textColor}; font-size: 18px; margin-bottom: 20px; line-height: 1.6; font-family: ${fontFamily};">${content.main_text}</p>`;
    }
  }

  return `
    <div style="
      width: 800px; 
      height: 600px; 
      padding: 60px; 
      background-color: ${backgroundColor};
      font-family: ${fontFamily};
      box-sizing: border-box;
      page-break-after: always;
      display: flex;
      flex-direction: column;
      position: relative;
    ">
      ${slide.type === 'title' && logoUrl ? `
        <div style="text-align: center; margin-bottom: 40px;">
          <img src="${logoUrl}" alt="Logo" style="height: 60px; width: auto;" />
        </div>
      ` : ''}
      
      <div style="flex: 1;">
        ${slideContent}
      </div>
      
      <div style="position: absolute; bottom: 20px; right: 30px; font-size: 12px; color: #666;">
        ${slideNumber}
      </div>
    </div>
  `;
}

/**
 * Generates a PDF from pitch deck slides using Puppeteer
 */
export async function generatePitchDeckPDF(options: GeneratePDFOptions): Promise<string> {
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
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        </style>
      </head>
      <body>
        ${slidesHTML}
      </body>
      </html>
    `;

    // Find system Chromium executable
    let chromiumPath = 'chromium';
    try {
      const { execSync } = require('child_process');
      chromiumPath = execSync('which chromium').toString().trim();
    } catch (error) {
      console.log('Using default chromium path:', chromiumPath);
    }
    
    console.log('Using Chromium executable:', chromiumPath);
    
    // Launch Puppeteer and generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: chromiumPath,
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
    });
    
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Setting page content...');
    await page.setContent(fullHTML, { waitUntil: 'networkidle0', timeout: 30000 });
    
    console.log('Generating PDF buffer...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true,
      timeout: 30000
    });
    
    await browser.close();
    
    // Validate PDF buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
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