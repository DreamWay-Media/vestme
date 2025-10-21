import OpenAI from "openai";
import { JSDOM } from "jsdom";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface BrandExtraction {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    brandColors: string[];
  };
  typography: {
    primaryFont: string;
    secondaryFont: string;
    fontFamilies: string[];
  };
  logo: {
    logoUrl?: string;
    logoDescription?: string;
    brandMark?: string;
  };
  brandPersonality: {
    tone: string;
    personality: string[];
    brandAdjectives: string[];
  };
  reasoning: string;
}

export class BrandAnalyzer {
  private ensureProtocol(url: string): string {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided: URL must be a non-empty string');
    }
    
    // Trim whitespace
    const trimmedUrl = url.trim();
    
    if (!trimmedUrl) {
      throw new Error('Invalid URL provided: URL cannot be empty');
    }
    
    // Check if URL already has a protocol
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl;
    }
    
    // Add https:// by default
    const urlWithProtocol = `https://${trimmedUrl}`;
    
    // Validate that the resulting URL is valid
    try {
      new URL(urlWithProtocol);
      return urlWithProtocol;
    } catch (error) {
      throw new Error(`Invalid URL format: "${url}" - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async extractBrandFromWebsite(websiteUrl: string): Promise<BrandExtraction> {
    try {
      console.log(`Starting brand extraction for URL: "${websiteUrl}"`);
      
      // Ensure URL has a protocol
      const fullUrl = this.ensureProtocol(websiteUrl);
      console.log(`Analyzing brand elements from: ${fullUrl}`);
      
      const websiteContent = await this.crawlWebsiteForBrandElements(fullUrl);
      const brandAnalysis = await this.analyzeBrandElements(websiteContent, fullUrl);
      return brandAnalysis;
    } catch (error) {
      console.error('Brand extraction error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to extract brand elements: ${errorMessage}`);
    }
  }

  private async crawlWebsiteForBrandElements(url: string): Promise<{
    html: string;
    styles: string[];
    images: string[];
    imageDetails: any[];
    extractedColors: string[];
    extractedFonts: string[];
    title: string;
    metaDescription: string;
  }> {
    try {
      // Ensure URL has a protocol before proceeding
      const fullUrl = this.ensureProtocol(url);
      console.log(`Crawling website: ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${fullUrl}: ${response.status}`);
      }

      const html = await response.text();
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Look for lazy loading patterns and extract real image URLs
      const realImageUrls = this.extractRealImageUrls(html, fullUrl);
      console.log(`Found ${realImageUrls.length} potential real image URLs from lazy loading patterns`);

      // Extract comprehensive CSS and style information
      const styles: string[] = [];
      const extractedColors: string[] = [];
      const extractedFonts: string[] = [];
      
      // 1. Extract and parse all style tags
      const styleTags = Array.from(document.querySelectorAll('style'));
      styleTags.forEach((tag, index) => {
        if (tag.textContent) {
          const cssContent = tag.textContent;
          styles.push(`/* Style Tag ${index + 1} */\n${cssContent}`);
          
          // Extract colors from this CSS block
          const colors = this.extractColorsFromCSS(cssContent);
          extractedColors.push(...colors);
          
          // Extract fonts from this CSS block
          const fonts = this.extractFontsFromCSS(cssContent);
          extractedFonts.push(...fonts);
        }
      });
      
      // 2. Extract inline styles with color/font analysis
      const allElements = Array.from(document.querySelectorAll('*'));
      const inlineStyles = [];
      allElements.forEach(el => {
        const style = el.getAttribute('style');
        if (style) {
          inlineStyles.push(style);
          const colors = this.extractColorsFromCSS(style);
          extractedColors.push(...colors);
          const fonts = this.extractFontsFromCSS(style);
          extractedFonts.push(...fonts);
        }
      });
      
      if (inlineStyles.length > 0) {
        styles.push(`/* Inline Styles */\n${inlineStyles.join('\n')}`);
      }
      
      // 3. Extract CSS from external stylesheets
      const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      for (const link of linkTags) {
        const href = link.getAttribute('href');
        if (href) {
          try {
            const cssUrl = href.startsWith('http') ? href : new URL(href, fullUrl).href;
            const cssResponse = await fetch(cssUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            if (cssResponse.ok) {
              const cssContent = await cssResponse.text();
              styles.push(`/* External CSS: ${cssUrl} */\n${cssContent.substring(0, 10000)}`); // Limit size
              
              const colors = this.extractColorsFromCSS(cssContent);
              extractedColors.push(...colors);
              const fonts = this.extractFontsFromCSS(cssContent);
              extractedFonts.push(...fonts);
            }
          } catch (e) {
            // Skip failed external CSS
            console.log(`Failed to fetch external CSS: ${href}`);
          }
        }
      }
      
      // 4. Extract CSS variables
      const cssVariables = this.extractCSSVariables(html);
      if (cssVariables) {
        styles.push(`/* CSS Variables */\n${cssVariables}`);
        const colors = this.extractColorsFromCSS(cssVariables);
        extractedColors.push(...colors);
      }
      
      // 5. Extract computed styles from key brand elements
      const keyElements = document.querySelectorAll('header, nav, .header, .navbar, .hero, .banner, .brand, .logo, h1, h2, .btn, button, a');
      const computedStyles = [];
      keyElements.forEach((el, index) => {
        const tagName = el.tagName.toLowerCase();
        const className = el.getAttribute('class') || '';
        const id = el.getAttribute('id') || '';
        const style = el.getAttribute('style') || '';
        
        if (style || className || id) {
          computedStyles.push(`${tagName}${id ? '#' + id : ''}${className ? '.' + className.split(' ').join('.') : ''} { ${style} }`);
        }
      });
      
      if (computedStyles.length > 0) {
        styles.push(`/* Key Element Styles */\n${computedStyles.join('\n')}`);
      }

      // Extract images with enhanced logo detection
      const imageElements = Array.from(document.querySelectorAll('img, svg'));
      const imageDetails: any[] = [];
      
      console.log(`Found ${imageElements.length} image elements on the page`);
      
      // Process DOM image elements
      imageElements.forEach((img, index) => {
        const src = img.getAttribute('src') || img.getAttribute('href') || img.getAttribute('data-src');
        const alt = img.getAttribute('alt') || '';
        const className = img.getAttribute('class') || '';
        const id = img.getAttribute('id') || '';
        
        if (src) {
          try {
            const fullSrc = new URL(src, fullUrl).href;
            const isLogo = this.isLikelyLogo(img, src, alt, className, id);
            const isPlaceholder = this.isPlaceholderImage(src);
            
            if (index < 10) { // Log first 10 images for debugging
              console.log(`Image ${index + 1}:`, {
                src: fullSrc.substring(0, 100) + (fullSrc.length > 100 ? '...' : ''),
                alt,
                className,
                id,
                isLogo,
                isPlaceholder,
                placement: this.getImagePlacement(img)
              });
            }
            
            imageDetails.push({
              src: fullSrc,
              alt,
              className,
              id,
              isLogo,
              parentContext: img.parentElement?.tagName || '',
              placement: this.getImagePlacement(img)
            });
          } catch (e) {
            // Skip invalid URLs
          }
        }
      });
      
      // Add real image URLs found from lazy loading patterns
      realImageUrls.forEach((realUrl, index) => {
        const isLogo = this.isLikelyLogoFromUrl(realUrl);
        imageDetails.push({
          src: realUrl,
          alt: `Real image ${index + 1}`,
          className: 'extracted-from-lazy-loading',
          id: '',
          isLogo,
          parentContext: 'extracted',
          placement: 'header' // Assume extracted images are important
        });
      });
      
      console.log(`Processed ${imageDetails.length} total images (${imageElements.length} DOM + ${realImageUrls.length} extracted), ${imageDetails.filter(img => img.isLogo).length} marked as logos`);

      // Sort images by logo likelihood
      imageDetails.sort((a, b) => {
        if (a.isLogo && !b.isLogo) return -1;
        if (!a.isLogo && b.isLogo) return 1;
        if (a.placement === 'header' && b.placement !== 'header') return -1;
        if (a.placement !== 'header' && b.placement === 'header') return 1;
        return 0;
      });

      return {
        html,
        styles,
        images: imageDetails.map(img => img.src),
        imageDetails,
        extractedColors: [...new Set(extractedColors)], // Remove duplicates
        extractedFonts: [...new Set(extractedFonts)], // Remove duplicates
        title: document.title || '',
        metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
      };
    } catch (error) {
      throw new Error(`Failed to crawl website: ${error}`);
    }
  }

  private extractCSSVariables(html: string): string {
    const cssVarRegex = /:root\s*{[^}]*}/g;
    const matches = html.match(cssVarRegex);
    return matches ? matches.join('\n') : '';
  }

  private extractColorsFromCSS(cssText: string): string[] {
    const colors: string[] = [];
    
    // Hex colors (#ffffff, #fff)
    const hexRegex = /#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b/g;
    let hexMatch;
    while ((hexMatch = hexRegex.exec(cssText)) !== null) {
      colors.push(hexMatch[0]);
    }
    
    // RGB/RGBA colors
    const rgbRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*[\d.]+)?\s*\)/g;
    let rgbMatch;
    while ((rgbMatch = rgbRegex.exec(cssText)) !== null) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      colors.push(hex);
    }
    
    // HSL colors
    const hslRegex = /hsla?\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%(?:\s*,\s*[\d.]+)?\s*\)/g;
    let hslMatch;
    while ((hslMatch = hslRegex.exec(cssText)) !== null) {
      const h = parseInt(hslMatch[1]) / 360;
      const s = parseInt(hslMatch[2]) / 100;
      const l = parseInt(hslMatch[3]) / 100;
      const hex = this.hslToHex(h, s, l);
      colors.push(hex);
    }
    
    // CSS Variables with color values
    const cssVarRegex = /--[\w-]+:\s*(#[a-fA-F0-9]{3,6}|rgba?\([^)]+\)|hsla?\([^)]+\))/g;
    let varMatch;
    while ((varMatch = cssVarRegex.exec(cssText)) !== null) {
      const value = varMatch[1];
      if (value.startsWith('#')) {
        colors.push(value);
      } else if (value.startsWith('rgb')) {
        const rgbValues = value.match(/\d+/g);
        if (rgbValues && rgbValues.length >= 3) {
          const hex = `#${((1 << 24) + (parseInt(rgbValues[0]) << 16) + (parseInt(rgbValues[1]) << 8) + parseInt(rgbValues[2])).toString(16).slice(1)}`;
          colors.push(hex);
        }
      }
    }
    
    return colors;
  }

  private extractFontsFromCSS(cssText: string): string[] {
    const fonts: string[] = [];
    
    // Font-family declarations
    const fontFamilyRegex = /font-family\s*:\s*([^;]+)/gi;
    let fontMatch;
    while ((fontMatch = fontFamilyRegex.exec(cssText)) !== null) {
      const fontValue = fontMatch[1].trim();
      // Clean up the font value
      const cleanFont = fontValue
        .replace(/['"]/g, '') // Remove quotes
        .split(',') // Split by comma
        .map(f => f.trim()) // Trim each font
        .filter(f => f && !f.includes('!important')); // Remove empty and !important
      
      fonts.push(...cleanFont);
    }
    
    // Google Fonts imports
    const googleFontsRegex = /@import\s+url\(['"]?https:\/\/fonts\.googleapis\.com\/css[^'"]*family=([^'"&]+)/gi;
    let googleMatch;
    while ((googleMatch = googleFontsRegex.exec(cssText)) !== null) {
      const fontName = decodeURIComponent(googleMatch[1])
        .replace(/\+/g, ' ')
        .split(':')[0]; // Remove font weights
      fonts.push(fontName);
    }
    
    return fonts;
  }

  private hslToHex(h: number, s: number, l: number): string {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 1/6) {
      r = c; g = x; b = 0;
    } else if (1/6 <= h && h < 1/3) {
      r = x; g = c; b = 0;
    } else if (1/3 <= h && h < 1/2) {
      r = 0; g = c; b = x;
    } else if (1/2 <= h && h < 2/3) {
      r = 0; g = x; b = c;
    } else if (2/3 <= h && h < 5/6) {
      r = x; g = 0; b = c;
    } else if (5/6 <= h && h < 1) {
      r = c; g = 0; b = x;
    }

    r = Math.round((r + m) * 255);
    g = Math.round((g + m) * 255);
    b = Math.round((b + m) * 255);

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  private isLikelyLogo(img: Element, src: string, alt: string, className: string, id: string): boolean {
    const logoTerms = ['logo', 'brand', 'mark', 'icon'];
    const srcLower = src.toLowerCase();
    const altLower = alt.toLowerCase();
    const classLower = className.toLowerCase();
    const idLower = id.toLowerCase();
    
    // Filter out placeholder and invalid images
    if (this.isPlaceholderImage(src)) {
      return false;
    }
    
    // Check if any logo terms appear in attributes
    const hasLogoTerms = logoTerms.some(term => 
      srcLower.includes(term) || 
      altLower.includes(term) || 
      classLower.includes(term) || 
      idLower.includes(term)
    );
    
    // Check placement context
    const isInHeader = img.closest('header, nav, .header, .navbar, .logo, .brand') !== null;
    
    // Check dimensions (logos are typically smaller and rectangular)
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    const hasReasonableDimensions = width && height ? 
      (parseInt(width) < 500 && parseInt(height) < 200) : true;
    
    return hasLogoTerms || (isInHeader && hasReasonableDimensions);
  }

  private isPlaceholderImage(src: string): boolean {
    // Filter out common placeholder patterns
    const placeholderPatterns = [
      /^data:image\/svg\+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==$/, // 1x1 SVG
      /^data:image\/svg\+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==$/, // Exact match
      /^data:image\/svg\+xml.*width="1".*height="1"/, // 1x1 SVG patterns
      /^data:image\/.*1x1/, // 1x1 data URLs
      /^data:image\/.*placeholder/, // Placeholder data URLs
      /^https?:\/\/.*placeholder/, // Placeholder URLs
      /^https?:\/.*1x1/, // 1x1 URLs
      /^https?:\/\/via\.placeholder\.com/, // Via placeholder service
      /^https?:\/\/placehold\.co/, // Placehold.co service
      /^https?:\/\/dummyimage\.com/, // Dummy image service
    ];
    
    return placeholderPatterns.some(pattern => pattern.test(src));
  }

  private isLikelyLogoFromUrl(url: string): boolean {
    const urlLower = url.toLowerCase();
    
    // Check for common logo patterns in URLs
    const logoPatterns = [
      /logo/i,
      /brand/i,
      /mark/i,
      /icon/i,
      /symbol/i,
      /emblem/i,
      /crest/i,
      /badge/i
    ];
    
    // Check if URL contains logo-related terms
    const hasLogoTerms = logoPatterns.some(pattern => pattern.test(urlLower));
    
    // Check for common logo file paths
    const logoPaths = [
      /\/logo\//i,
      /\/brand\//i,
      /\/images\/logo/i,
      /\/assets\/logo/i,
      /\/uploads\/logo/i,
      /\/wp-content\/uploads\/.*logo/i
    ];
    
    const hasLogoPath = logoPaths.some(pattern => pattern.test(urlLower));
    
    // Check for common logo file names
    const logoFileNames = [
      /logo\.(png|jpg|jpeg|gif|svg|webp)$/i,
      /brand\.(png|jpg|jpeg|gif|svg|webp)$/i,
      /mark\.(png|jpg|jpeg|gif|svg|webp)$/i,
      /icon\.(png|jpg|jpeg|gif|svg|webp)$/i
    ];
    
    const hasLogoFileName = logoFileNames.some(pattern => pattern.test(urlLower));
    
    return hasLogoTerms || hasLogoPath || hasLogoFileName;
  }

  private extractRealImageUrls(html: string, baseUrl: string): string[] {
    const realImageUrls: string[] = [];
    
    // Look for common lazy loading patterns
    const patterns = [
      // data-src attribute (common lazy loading pattern)
      /data-src=["']([^"']+)["']/gi,
      // data-lazy-src attribute
      /data-lazy-src=["']([^"']+)["']/gi,
      // data-original attribute
      /data-original=["']([^"']+)["']/gi,
      // data-srcset attribute
      /data-srcset=["']([^"']+)["']/gi,
      // srcset attribute (responsive images)
      /srcset=["']([^"']+)["']/gi,
      // Background images in CSS
      /background-image:\s*url\(["']?([^"')]+)["']?\)/gi,
      // CSS background shorthand
      /background:\s*url\(["']?([^"')]+)["']?\)/gi,
      // WordPress specific patterns
      /wp-content\/uploads\/([^"'\s]+)/gi,
      // Common image paths
      /\/images?\/([^"'\s]+)/gi,
      /\/assets?\/([^"'\s]+)/gi,
      /\/media\/([^"'\s]+)/gi,
      /\/uploads\/([^"'\s]+)/gi,
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const imageUrl = match[1];
        if (imageUrl && !this.isPlaceholderImage(imageUrl)) {
          try {
            const fullImageUrl = imageUrl.startsWith('http') ? imageUrl : new URL(imageUrl, baseUrl).href;
            if (!realImageUrls.includes(fullImageUrl)) {
              realImageUrls.push(fullImageUrl);
            }
          } catch (e) {
            // Skip invalid URLs
          }
        }
      }
    });
    
    // Also look for any URLs that contain common image extensions
    const imageExtensions = /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i;
    const urlMatches = html.match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|svg|webp|ico)/gi) || [];
    
    urlMatches.forEach(url => {
      if (!this.isPlaceholderImage(url) && !realImageUrls.includes(url)) {
        realImageUrls.push(url);
      }
    });
    
    return realImageUrls;
  }

  private getImagePlacement(img: Element): string {
    if (img.closest('header, .header')) return 'header';
    if (img.closest('nav, .navbar')) return 'nav';
    if (img.closest('footer, .footer')) return 'footer';
    if (img.closest('.hero, .banner')) return 'hero';
    return 'content';
  }

  private async analyzeBrandElements(websiteContent: any, websiteUrl: string): Promise<BrandExtraction> {
    const prompt = `Analyze the following website data and extract authentic brand elements. Be extremely precise and only extract colors, fonts, and logos that actually exist in the provided CSS and HTML.

Website URL: ${websiteUrl}
Title: ${websiteContent.title}
Meta Description: ${websiteContent.metaDescription}

CSS STYLES:
${websiteContent.styles.join('\n\n')}

HTML CONTENT (first 3000 chars):
${websiteContent.html.substring(0, 3000)}

EXTRACTED COLORS FROM CSS:
${websiteContent.extractedColors.length > 0 ? websiteContent.extractedColors.join(', ') : 'No colors found in CSS'}

EXTRACTED FONTS FROM CSS:
${websiteContent.extractedFonts.length > 0 ? websiteContent.extractedFonts.join(', ') : 'No custom fonts found'}

AVAILABLE IMAGES:
${websiteContent.imageDetails.map((img: any, index: number) => 
  `${index + 1}. ${img.src} (alt: "${img.alt}", class: "${img.className}", isLogo: ${img.isLogo}, placement: ${img.placement})`
).join('\n')}

Extract brand elements in this exact JSON format:
{
  "colors": {
    "primary": "MUST be one hex color from EXTRACTED COLORS list above, or null if none suitable",
    "secondary": "MUST be one hex color from EXTRACTED COLORS list above, or null if none suitable", 
    "accent": "MUST be one hex color from EXTRACTED COLORS list above, or null if none suitable",
    "brandColors": ["MUST be array containing ONLY colors from EXTRACTED COLORS list above"]
  },
  "typography": {
    "primaryFont": "MUST be one font from EXTRACTED FONTS list above, or null if none suitable",
    "secondaryFont": "MUST be one font from EXTRACTED FONTS list above, or null if none suitable",
    "fontFamilies": ["MUST be array containing ONLY fonts from EXTRACTED FONTS list above"]
  },
  "logo": {
    "logoUrl": "URL of the most likely logo image from the list above - prioritize images marked as isLogo:true or in header placement",
    "logoDescription": "description of the logo/brand mark",
    "brandMark": "description of visual brand elements"
  },
  "brandPersonality": {
    "tone": "overall brand tone based on visual design and content",
    "personality": ["brand personality traits"],
    "brandAdjectives": ["descriptive words that define the brand"]
  },
  "reasoning": "detailed explanation of how each brand element was identified with specific CSS evidence"
}

CRITICAL REQUIREMENTS - NO EXCEPTIONS:
1. COLORS: You MUST ONLY use colors from the "EXTRACTED COLORS FROM CSS" list above. DO NOT use any other colors.
2. If the extracted colors list is empty or contains only common colors (#000000, #ffffff, #cccccc), set all color values to null.
3. FONTS: You MUST ONLY use fonts from the "EXTRACTED FONTS FROM CSS" list above. DO NOT use any other fonts.
4. If the extracted fonts list is empty or contains only system fonts (Arial, sans-serif, serif), set all font values to null.
5. DO NOT GUESS, ASSUME, OR GENERATE any colors or fonts not in the extracted lists.
6. Primary color = choose from extracted colors list based on context (headers, navigation, buttons)
7. Secondary color = choose from extracted colors list based on context (backgrounds, sections)
8. Accent color = choose from extracted colors list based on context (links, highlights)
9. All brandColors array must contain ONLY colors from the extracted list
10. All fontFamilies array must contain ONLY fonts from the extracted list
11. If you cannot find suitable colors/fonts in the extracted lists, use null instead of making up values`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a professional brand analyst. You MUST ONLY use colors and fonts from the provided EXTRACTED lists. DO NOT generate, guess, or assume any colors or fonts not explicitly listed in the EXTRACTED COLORS FROM CSS and EXTRACTED FONTS FROM CSS sections. If no suitable colors/fonts are found in the extracted lists, use null values. This is critical - you cannot use any colors or fonts not in the extracted data."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate extracted colors and fonts against the provided lists
      const validatedColors = {
        primary: (result.colors?.primary && websiteContent.extractedColors.includes(result.colors.primary)) ? result.colors.primary : null,
        secondary: (result.colors?.secondary && websiteContent.extractedColors.includes(result.colors.secondary)) ? result.colors.secondary : null,
        accent: (result.colors?.accent && websiteContent.extractedColors.includes(result.colors.accent)) ? result.colors.accent : null,
        brandColors: Array.isArray(result.colors?.brandColors) ? 
          result.colors.brandColors.filter((color: string) => websiteContent.extractedColors.includes(color)) : []
      };

      const validatedFonts = {
        primaryFont: (result.typography?.primaryFont && websiteContent.extractedFonts.includes(result.typography.primaryFont)) ? result.typography.primaryFont : null,
        secondaryFont: (result.typography?.secondaryFont && websiteContent.extractedFonts.includes(result.typography.secondaryFont)) ? result.typography.secondaryFont : null,
        fontFamilies: Array.isArray(result.typography?.fontFamilies) ? 
          result.typography.fontFamilies.filter((font: string) => websiteContent.extractedFonts.includes(font)) : []
      };

      return {
        colors: validatedColors,
        typography: validatedFonts,
        logo: {
          logoUrl: result.logo?.logoUrl || null,
          logoDescription: result.logo?.logoDescription || null,
          brandMark: result.logo?.brandMark || null
        },
        brandPersonality: {
          tone: result.brandPersonality?.tone || "Professional",
          personality: Array.isArray(result.brandPersonality?.personality) ? result.brandPersonality.personality : [],
          brandAdjectives: Array.isArray(result.brandPersonality?.brandAdjectives) ? result.brandPersonality.brandAdjectives : []
        },
        reasoning: result.reasoning || "Brand analysis completed using AI-powered website crawling and CSS extraction."
      };
    } catch (error) {
      console.error('AI brand analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Brand analysis failed: ${errorMessage}`);
    }
  }
}