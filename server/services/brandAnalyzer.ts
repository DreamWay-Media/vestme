import OpenAI from "openai";
import { JSDOM } from "jsdom";
import { quotaManager } from "./openaiQuotaManager";

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
    } catch (error: any) {
      console.error('Brand extraction error:', error);
      
      // Don't wrap specific API errors - pass them through as-is
      // Check for our custom error messages or OpenAI error codes
      const errorMessage = error?.message || '';
      const isApiError = errorMessage.includes('OpenAI API quota') || 
                         errorMessage.includes('quota exceeded') ||
                         errorMessage.includes('exceeded your current quota') ||
                         errorMessage.includes('API authentication') ||
                         errorMessage.includes('API service') ||
                         error?.code === 'insufficient_quota' ||
                         error?.type === 'insufficient_quota' ||
                         error?.status === 429 ||
                         error?.status === 401 ||
                         error?.name === 'RateLimitError';
      
      if (isApiError) {
        // Re-throw without wrapping - preserve the original error
        throw error;
      }
      
      // For other errors, wrap with context
      const finalErrorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to extract brand elements: ${finalErrorMessage}`);
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
      const inlineStyles: string[] = [];
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
      const computedStyles: string[] = [];
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
        extractedColors: Array.from(new Set(extractedColors)), // Remove duplicates
        extractedFonts: Array.from(new Set(extractedFonts)), // Remove duplicates
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

    if (0 <= h && h < 1 / 6) {
      r = c; g = x; b = 0;
    } else if (1 / 6 <= h && h < 1 / 3) {
      r = x; g = c; b = 0;
    } else if (1 / 3 <= h && h < 1 / 2) {
      r = 0; g = c; b = x;
    } else if (1 / 2 <= h && h < 2 / 3) {
      r = 0; g = x; b = c;
    } else if (2 / 3 <= h && h < 5 / 6) {
      r = x; g = 0; b = c;
    } else if (5 / 6 <= h && h < 1) {
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

  /**
   * Filter out generic/neutral colors and keep only brand colors
   */
  private filterBrandColors(colors: string[]): string[] {
    const genericColors = new Set([
      '#000000', '#000', '#FFFFFF', '#FFF', '#ffffff', '#fff',
      '#CCCCCC', '#CCC', '#cccccc', '#ccc',
      '#808080', '#808080', '#808080',
      '#F5F5F5', '#f5f5f5', '#EEEEEE', '#eeeeee',
      '#E0E0E0', '#e0e0e0', '#D3D3D3', '#d3d3d3'
    ]);

    return colors
      .map(color => {
        // Normalize 3-digit hex to 6-digit
        if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
          return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toUpperCase();
        }
        return color.toUpperCase();
      })
      .filter(color => {
        // Remove generic colors
        if (genericColors.has(color)) return false;
        
        // Remove very light grays (close to white)
        if (color.startsWith('#')) {
          const hex = color.substring(1);
          if (hex.length === 6) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            // Remove if all RGB values are very close (grays) and very light/dark
            const avg = (r + g + b) / 3;
            const diff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
            if (diff < 10 && (avg > 240 || avg < 20)) return false; // Very light or very dark grays
          }
        }
        
        return true;
      });
  }

  /**
   * Check if font is generic/system font
   */
  private isGenericFont(font: string): boolean {
    const genericFonts = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 
      'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia'];
    return genericFonts.some(gf => font.toLowerCase().includes(gf.toLowerCase()));
  }

  /**
   * Optimize CSS styles to reduce token usage
   */
  private optimizeStyles(styles: string[]): string {
    // Combine and limit styles
    const combined = styles.join('\n');
    
    // Remove comments and excessive whitespace
    const cleaned = combined
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .substring(0, 5000); // Limit to 5k chars
    
    // Extract only color and font-related rules
    const colorFontRules = cleaned.match(/(color|background|font)[^;]*;/gi) || [];
    
    return colorFontRules.join('\n').substring(0, 2000);
  }

  private getImagePlacement(img: Element): string {
    if (img.closest('header, .header')) return 'header';
    if (img.closest('nav, .navbar')) return 'nav';
    if (img.closest('footer, .footer')) return 'footer';
    if (img.closest('.hero, .banner')) return 'hero';
    return 'content';
  }

  private async analyzeBrandElements(websiteContent: any, websiteUrl: string): Promise<BrandExtraction> {
    // Check quota before making API call
    const quotaCheck = quotaManager.canMakeRequest(5000); // Estimate ~5k tokens
    if (!quotaCheck.allowed) {
      throw new Error(`OpenAI API quota limit reached: ${quotaCheck.reason}. Please try again later.`);
    }

    // Optimize data to reduce token usage and filter out generic colors
    const optimizedStyles = this.optimizeStyles(websiteContent.styles);
    
    // Filter out generic/neutral colors and normalize hex codes
    const filteredColors = this.filterBrandColors(websiteContent.extractedColors);
    
    // Count color frequency to help AI identify primary colors
    const colorFrequency = new Map<string, number>();
    for (const color of filteredColors) {
      const normalized = color.toUpperCase();
      colorFrequency.set(normalized, (colorFrequency.get(normalized) || 0) + 1);
    }
    
    // Sort colors by frequency (most common first) and take top 20
    const sortedColorsByFrequency = Array.from(colorFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => color)
      .slice(0, 20);
    
    const optimizedColors = sortedColorsByFrequency;
    
    const optimizedFonts = [...new Set(websiteContent.extractedFonts)]
      .filter(font => !this.isGenericFont(font))
      .slice(0, 10); // Limit to 10 unique fonts
    
    const optimizedImages = websiteContent.imageDetails
      .filter((img: any) => img.isLogo || img.placement === 'header')
      .slice(0, 10); // Limit to top 10 logo candidates

    // Create color list with frequency information to help AI identify primary colors
    const colorListWithIndices = optimizedColors.length > 0 
      ? optimizedColors.map((color, idx) => {
          const frequency = colorFrequency.get(color) || 0;
          const frequencyNote = frequency > 1 ? ` (appears ${frequency} times - more frequent colors are likely primary/secondary)` : '';
          return `${idx + 1}. ${color}${frequencyNote}`;
        }).join('\n')
      : 'NO COLORS FOUND - SET ALL COLOR VALUES TO null';

    const prompt = `You are a strict brand analyzer analyzing the website: ${websiteUrl}. You MUST ONLY use colors and fonts from the EXACT lists provided below. DO NOT invent, guess, or create any colors or fonts.

WEBSITE: ${websiteUrl}
TITLE: ${websiteContent.title || 'N/A'}

=== ALLOWED COLORS (use ONLY these exact hex codes extracted from the website) ===
${colorListWithIndices}

=== ALLOWED FONTS (use ONLY these exact font names extracted from the website) ===
${optimizedFonts.length > 0 ? optimizedFonts.map((f, i) => `${i + 1}. ${f}`).join('\n') : 'NO FONTS FOUND - SET ALL FONT VALUES TO null'}

=== LOGO CANDIDATES ===
${optimizedImages.map((img: any, i: number) => `${i + 1}. ${img.src} (logo: ${img.isLogo}, placement: ${img.placement})`).join('\n')}

=== COLOR IDENTIFICATION INSTRUCTIONS ===
Analyze the website's actual color usage to identify:
1. PRIMARY COLOR: The main brand color that appears most prominently on the website. This is typically:
   - Used in headers, navigation, main CTAs, and key brand elements
   - The most distinctive and recognizable color associated with the brand
   - Usually appears in the logo or main branding elements
   - Often one of the MOST FREQUENT colors (check frequency notes in the color list)
   - NOT a neutral gray, black, or white (unless it's the actual brand color)

2. SECONDARY COLOR: A supporting color that complements the primary. This is typically:
   - Used for secondary elements, borders, or supporting text
   - Often a neutral gray or a complementary color to the primary
   - Used consistently but less prominently than the primary color
   - Often one of the MORE FREQUENT colors (check frequency notes in the color list)

3. ACCENT COLOR: A color used for highlights, emphasis, or interactive elements. This is typically:
   - Used sparingly for CTAs, links, hover states, or important highlights
   - Provides contrast and visual interest
   - Different from both primary and secondary colors
   - May appear less frequently but is distinctive

IMPORTANT: Base your selection on the ACTUAL colors used on the website. Choose colors that are:
- Actually present and used on the website
- Representative of the brand's visual identity
- Consider color frequency: More frequent colors are more likely to be primary/secondary colors
- Not generic/neutral colors unless they are genuinely the brand colors
- Distinctive and meaningful to the brand

Return JSON in this EXACT format:
{
  "colors": {
    "primary": "EXACT hex code from ALLOWED COLORS list above that represents the main brand color OR null",
    "secondary": "EXACT hex code from ALLOWED COLORS list above that represents the secondary/supporting color OR null", 
    "accent": "EXACT hex code from ALLOWED COLORS list above that represents accent/highlight color OR null",
    "brandColors": ["EXACT hex codes from ALLOWED COLORS list above that are part of the brand palette"]
  },
  "typography": {
    "primaryFont": "EXACT font name from ALLOWED FONTS list above used for main text OR null",
    "secondaryFont": "EXACT font name from ALLOWED FONTS list above used for headings or secondary text OR null",
    "fontFamilies": ["EXACT font names from ALLOWED FONTS list above that are used on the website"]
  },
  "logo": {
    "logoUrl": "URL from LOGO CANDIDATES list above that is the main logo OR null",
    "logoDescription": "Brief description of the logo",
    "brandMark": "Description of brand mark or symbol"
  },
  "brandPersonality": {
    "tone": "Brand tone based on website analysis",
    "personality": ["Brand personality traits"],
    "brandAdjectives": ["Adjectives describing the brand"]
  },
  "reasoning": "Explanation of why these specific colors were chosen based on their actual usage on the website"
}

CRITICAL RULES - VIOLATION WILL CAUSE REJECTION:
1. For colors.primary, colors.secondary, colors.accent: Use EXACT hex code from ALLOWED COLORS list OR null. NO OTHER VALUES ALLOWED.
2. For colors.brandColors: Array of EXACT hex codes from ALLOWED COLORS list ONLY. Empty array [] if no suitable colors.
3. For typography fields: Use EXACT font name from ALLOWED FONTS list OR null. NO OTHER VALUES ALLOWED.
4. If ALLOWED COLORS list says "NO COLORS FOUND", set ALL color fields to null.
5. If ALLOWED FONTS list says "NO FONTS FOUND", set ALL font fields to null.
6. DO NOT use colors like #000000, #ffffff, #cccccc unless they are genuinely the brand colors and appear in the ALLOWED COLORS list.
7. DO NOT invent or approximate colors. If a color is not in the list, use null.
8. DO NOT use generic fonts like "sans-serif", "serif", "Arial" unless they are in the ALLOWED FONTS list.
9. Validate: Every color value must match EXACTLY (case-insensitive) a hex code from the ALLOWED COLORS list.
10. Validate: Every font value must match EXACTLY a font name from the ALLOWED FONTS list.
11. SELECT colors based on their ACTUAL USAGE on the website, not randomly. Primary should be the most prominent brand color, secondary should complement it, and accent should provide contrast.
12. DO NOT hallucinate or guess color usage. Only select colors that you can reasonably infer are the primary, secondary, or accent based on typical website design patterns.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use cheaper model to reduce costs
        messages: [
          {
            role: "system",
            content: "You are a strict brand analyzer that analyzes websites to extract their actual brand colors and fonts. You MUST use ONLY the exact colors and fonts from the provided lists that were extracted from the website. DO NOT invent, guess, approximate, or hallucinate any values. Analyze the website's actual color usage to identify primary (main brand color), secondary (supporting color), and accent (highlight color) colors. If a color/font is not in the allowed list, use null. Every color must match EXACTLY (case-insensitive) a hex code from the allowed colors list. Every font must match EXACTLY a font name from the allowed fonts list. Base your selections on actual website usage patterns, not assumptions. Return valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0,
        max_tokens: 1000, // Limit response size
      });

      // Record API usage
      const tokensUsed = response.usage?.total_tokens || 0;
      quotaManager.recordRequest(tokensUsed);

      const result = JSON.parse(response.choices[0].message.content || '{}');

      // Strict validation: normalize colors and check exact matches
      const normalizeColor = (color: string): string => {
        if (!color) return '';
        // Normalize 3-digit hex to 6-digit
        if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
          return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toUpperCase();
        }
        // Normalize to uppercase for comparison
        return color.toUpperCase();
      };

      const normalizedAllowedColors = optimizedColors.map(c => normalizeColor(c));
      
      const validatedColors = {
        primary: (() => {
          const normalized = normalizeColor(result.colors?.primary || '');
          return normalized && normalizedAllowedColors.includes(normalized) ? normalized : null;
        })(),
        secondary: (() => {
          const normalized = normalizeColor(result.colors?.secondary || '');
          return normalized && normalizedAllowedColors.includes(normalized) ? normalized : null;
        })(),
        accent: (() => {
          const normalized = normalizeColor(result.colors?.accent || '');
          return normalized && normalizedAllowedColors.includes(normalized) ? normalized : null;
        })(),
        brandColors: Array.isArray(result.colors?.brandColors) 
          ? result.colors.brandColors
              .map((color: string) => normalizeColor(color))
              .filter((color: string) => color && normalizedAllowedColors.includes(color))
          : []
      };

      // Strict font validation with case-insensitive matching
      const validatedFonts = {
        primaryFont: (() => {
          const font = result.typography?.primaryFont;
          if (!font) return null;
          const matched = optimizedFonts.find(f => f.toLowerCase() === font.toLowerCase());
          return matched || null;
        })(),
        secondaryFont: (() => {
          const font = result.typography?.secondaryFont;
          if (!font) return null;
          const matched = optimizedFonts.find(f => f.toLowerCase() === font.toLowerCase());
          return matched || null;
        })(),
        fontFamilies: Array.isArray(result.typography?.fontFamilies) 
          ? result.typography.fontFamilies
              .map((font: string) => optimizedFonts.find(f => f.toLowerCase() === font.toLowerCase()))
              .filter((font: string | undefined): font is string => !!font)
          : []
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
    } catch (error: any) {
      console.error('AI brand analysis error:', error);
      
      // Check for OpenAI API errors - handle RateLimitError and other OpenAI error types
      const isQuotaError = error?.status === 429 || 
                          error?.code === 'insufficient_quota' ||
                          error?.type === 'insufficient_quota' ||
                          error?.message?.includes('429') || 
                          error?.message?.includes('quota') ||
                          error?.message?.includes('exceeded your current quota');
      
      if (isQuotaError) {
        const quotaError = new Error('OpenAI API quota exceeded. Please check your OpenAI account billing and plan limits. The brand analysis feature requires an active OpenAI API subscription with available credits.');
        // Preserve the original error properties for better debugging
        (quotaError as any).originalError = error;
        throw quotaError;
      }
      
      if (error?.status === 401 || error?.code === 'invalid_api_key' || error?.message?.includes('401') || error?.message?.includes('Invalid API key')) {
        const authError = new Error('OpenAI API authentication failed. Please check your API key configuration.');
        (authError as any).originalError = error;
        throw authError;
      }
      
      if (error?.status === 500 || error?.status === 503) {
        const serviceError = new Error('OpenAI API service is temporarily unavailable. Please try again later.');
        (serviceError as any).originalError = error;
        throw serviceError;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Brand analysis failed: ${errorMessage}`);
    }
  }
}