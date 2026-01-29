import OpenAI from "openai";
import { JSDOM } from "jsdom";
import { quotaManager } from "./openaiQuotaManager";

// Allow the app to start without OpenAI credentials
const hasOpenAIConfig = !!process.env.OPENAI_API_KEY;

const openai = hasOpenAIConfig
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface BrandExtraction {
  colors: {
    primary: string | null;
    secondary: string | null;
    accent: string | null;
    brandColors: string[];
  };
  typography: {
    primaryFont: string | null;
    secondaryFont: string | null;
    fontFamilies: string[];
  };
  logo: {
    logoUrl?: string | null;
    logoDescription?: string | null;
    brandMark?: string | null;
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

      // 5. Extract colors from meta tags (theme-color)
      const themeColor = document.querySelector('meta[name="theme-color"]')?.getAttribute('content');
      if (themeColor) {
        const colors = this.extractColorsFromCSS(`color: ${themeColor}`);
        extractedColors.push(...colors);
        console.log('Found theme-color:', themeColor);
      }

      // 6. Extract colors from inline SVG elements
      const svgElements = Array.from(document.querySelectorAll('svg'));
      svgElements.forEach(svg => {
        const svgHtml = svg.outerHTML;
        const svgColors = this.extractColorsFromCSS(svgHtml);
        extractedColors.push(...svgColors);
      });

      // 7. Extract computed styles from key brand elements
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

      // Extract logos from meta tags and structured data FIRST (these are most reliable)
      const metaLogos: string[] = [];
      
      // Check Open Graph image
      const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
      if (ogImage) {
        try {
          const fullOgImage = new URL(ogImage, fullUrl).href;
          if (!this.isPlaceholderImage(fullOgImage)) {
            metaLogos.push(fullOgImage);
            imageDetails.push({
              src: fullOgImage,
              alt: 'Open Graph image',
              className: 'og-image',
              id: '',
              isLogo: true,
              parentContext: 'meta',
              placement: 'header'
            });
            console.log('Found Open Graph image:', fullOgImage);
          }
        } catch (e) {
          // Skip invalid URLs
        }
      }

      // Check favicon and icon links
      const iconLinks = document.querySelectorAll('link[rel*="icon"], link[rel*="apple-touch-icon"]');
      iconLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.includes('favicon.ico')) { // Skip default favicon.ico
          try {
            const fullIconUrl = new URL(href, fullUrl).href;
            if (!this.isPlaceholderImage(fullIconUrl) && !metaLogos.includes(fullIconUrl)) {
              metaLogos.push(fullIconUrl);
              imageDetails.push({
                src: fullIconUrl,
                alt: 'Icon/Favicon',
                className: link.getAttribute('rel') || 'icon',
                id: '',
                isLogo: true,
                parentContext: 'link',
                placement: 'header'
              });
              console.log('Found icon/favicon:', fullIconUrl);
            }
          } catch (e) {
            // Skip invalid URLs
          }
        }
      });

      // Check JSON-LD structured data for logo
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
      jsonLdScripts.forEach(script => {
        try {
          const jsonLd = JSON.parse(script.textContent || '{}');
          // Check various JSON-LD types for logo
          const logoUrl = jsonLd.logo?.url || 
                         jsonLd.image?.url || 
                         jsonLd['@graph']?.find((item: any) => item.logo?.url)?.logo?.url;
          
          if (logoUrl) {
            try {
              const fullLogoUrl = logoUrl.startsWith('http') ? logoUrl : new URL(logoUrl, fullUrl).href;
              if (!this.isPlaceholderImage(fullLogoUrl) && !metaLogos.includes(fullLogoUrl)) {
                metaLogos.push(fullLogoUrl);
                imageDetails.push({
                  src: fullLogoUrl,
                  alt: 'Structured data logo',
                  className: 'json-ld-logo',
                  id: '',
                  isLogo: true,
                  parentContext: 'json-ld',
                  placement: 'header'
                });
                console.log('Found JSON-LD logo:', fullLogoUrl);
              }
            } catch (e) {
              // Skip invalid URLs
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      });

      // Process DOM image elements
      imageElements.forEach((img, index) => {
        const src = img.getAttribute('src') || img.getAttribute('href') || img.getAttribute('data-src') || 
                   img.getAttribute('data-lazy-src') || img.getAttribute('data-original');
        const alt = img.getAttribute('alt') || '';
        const className = img.getAttribute('class') || '';
        const id = img.getAttribute('id') || '';

        if (src) {
          try {
            const fullSrc = new URL(src, fullUrl).href;
            const isPlaceholder = this.isPlaceholderImage(src);
            
            if (isPlaceholder) {
              return; // Skip placeholders
            }

            // Enhanced logo detection
            const isLogo = this.isLikelyLogo(img, src, alt, className, id) || 
                          this.isLikelyLogoFromUrl(fullSrc) ||
                          metaLogos.includes(fullSrc);

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

      // Filter out generic/utility colors that don't represent brand identity
      const genericColors = [
        '#000000', '#000', '#ffffff', '#fff', '#f5f5f5', '#fafafa',
        '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040',
        '#262626', '#171717', '#0a0a0a', '#f4f4f5', '#e4e4e7', '#d4d4d8',
        '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b',
        '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b',
        '#475569', '#334155', '#1e293b', '#0f172a', '#fef2f2', '#fee2e2',
        '#cccccc', '#ccc', '#999999', '#999', '#666666', '#666', '#333333', '#333',
        'transparent', 'inherit', 'initial', 'currentcolor'
      ];
      
      const isGenericColor = (color: string): boolean => {
        const lower = color.toLowerCase().trim();
        return genericColors.includes(lower);
      };
      
      const filteredColors = [...new Set(extractedColors)]
        .filter(color => !isGenericColor(color));
      
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
    const logoTerms = ['logo', 'brand', 'mark', 'icon', 'emblem', 'symbol', 'badge'];
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

    // Check placement context (logos are often in header/nav/first section)
    const isInHeader = img.closest('header, nav, .header, .navbar, .logo, .brand, .site-header, .main-header') !== null;
    const isInFirstSection = img.closest('section:first-of-type, .hero, .banner, .intro') !== null;
    const isFirstImage = img.parentElement?.querySelector('img') === img; // First image in its container

    // Check dimensions (logos are typically smaller and often wider than tall)
    const width = img.getAttribute('width');
    const height = img.getAttribute('height');
    let hasReasonableDimensions = true;
    if (width && height) {
      const w = parseInt(width);
      const h = parseInt(height);
      // Logo is typically: smaller than 500px width, and often wider than tall (or square)
      hasReasonableDimensions = w < 500 && h < 300 && (w >= h || w / h > 0.7);
    }

    // Check if it's an SVG (many logos are SVG)
    const isSvg = img.tagName.toLowerCase() === 'svg' || srcLower.endsWith('.svg');

    // Multiple indicators increase logo likelihood
    const indicators = [
      hasLogoTerms,
      (isInHeader || isInFirstSection) && hasReasonableDimensions,
      isFirstImage && hasReasonableDimensions,
      isSvg && (isInHeader || hasLogoTerms)
    ];

    // Return true if at least 2 indicators are true, or if it's clearly a logo (has terms + good placement)
    return indicators.filter(Boolean).length >= 2 || (hasLogoTerms && (isInHeader || isInFirstSection));
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
   * Less aggressive filtering to preserve legitimate brand colors
   */
  private filterBrandColors(colors: string[]): string[] {
    const genericColors = new Set([
      '#000000', '#000', '#FFFFFF', '#FFF', '#ffffff', '#fff',
      // Only filter out pure black and white, not light grays (some brands use them)
    ]);

    return colors
      .map(color => {
        if (!color || typeof color !== 'string') return null;
        // Normalize 3-digit hex to 6-digit
        if (/^#[0-9A-Fa-f]{3}$/i.test(color)) {
          return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toUpperCase();
        }
        if (/^#[0-9A-Fa-f]{6}$/i.test(color)) {
          return color.toUpperCase();
        }
        return null;
      })
      .filter((color): color is string => {
        if (!color) return false;
        
        // Remove only pure black and white
        if (genericColors.has(color)) return false;
        
        // Only filter out extremely light/dark grays (almost pure white/black)
        // Keep light grays as they might be brand colors
        if (color.startsWith('#')) {
          const hex = color.substring(1);
          if (hex.length === 6) {
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            
            // Only filter if it's almost pure white (RGB > 250) or almost pure black (RGB < 5)
            // AND it's a true gray (all RGB values very close)
            const avg = (r + g + b) / 3;
            const diff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
            
            // More lenient: only filter near-pure colors that are grays
            if (diff < 5 && (avg > 250 || avg < 5)) {
              return false; // Almost pure white or black gray
            }
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
    
    // IMPORTANT: Count color frequency BEFORE filtering to get accurate usage patterns
    // Normalize all colors first for accurate counting
    const normalizeColorForCounting = (color: string): string => {
      if (!color || typeof color !== 'string') return '';
      // Normalize 3-digit hex to 6-digit
      if (/^#[0-9A-Fa-f]{3}$/i.test(color)) {
        return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`.toUpperCase();
      }
      return color.toUpperCase();
    };

    // Count frequency from ALL extracted colors (before filtering)
    const colorFrequency = new Map<string, number>();
    for (const color of websiteContent.extractedColors) {
      const normalized = normalizeColorForCounting(color);
      if (normalized) {
        colorFrequency.set(normalized, (colorFrequency.get(normalized) || 0) + 1);
      }
    }
    
    // Now filter colors, but preserve frequency data
    const filteredColors = this.filterBrandColors(websiteContent.extractedColors);
    
    // Sort filtered colors by frequency (most common first) and take top 20
    // Deduplicate colors after normalization to avoid duplicates in the final list
    const seenColors = new Set<string>();
    const sortedColorsByFrequency = filteredColors
      .map(color => normalizeColorForCounting(color))
      .filter((color): color is string => {
        // Only keep colors that are valid, have frequency data, and haven't been seen yet
        if (!color || !colorFrequency.has(color)) return false;
        if (seenColors.has(color)) return false; // Deduplicate
        seenColors.add(color);
        return true;
      })
      .sort((a, b) => (colorFrequency.get(b) || 0) - (colorFrequency.get(a) || 0))
      .slice(0, 20);
    
    const optimizedColors = sortedColorsByFrequency;
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1e4bee63-f8e6-4581-b0da-e776ea8c2c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'brandAnalyzer.ts:838',message:'optimizedColors after deduplication',data:{optimizedColorsCount:optimizedColors.length,optimizedColors:optimizedColors,hasDuplicates:optimizedColors.length!==new Set(optimizedColors).size},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1e4bee63-f8e6-4581-b0da-e776ea8c2c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'brandAnalyzer.ts:838',message:'optimizedColors created',data:{optimizedColorsCount:optimizedColors.length,optimizedColors:optimizedColors.slice(0,10),totalExtractedColors:websiteContent.extractedColors.length,filteredColorsCount:filteredColors.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    
    const optimizedFonts = Array.from(new Set(websiteContent.extractedFonts))
      .filter((font): font is string => typeof font === 'string' && !this.isGenericFont(font))
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
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/1e4bee63-f8e6-4581-b0da-e776ea8c2c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'brandAnalyzer.ts:856',message:'color list for AI prompt',data:{colorListLength:colorListWithIndices.length,hasColors:optimizedColors.length>0,colorListPreview:colorListWithIndices.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

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

CRITICAL RULES:
1. For colors.primary, colors.secondary, colors.accent: Use ANY valid color format discovered from the website (hex like #FF5733 or #333, RGB like rgb(255,87,51), or RGBa). The system will normalize them automatically. Base selections on actual website usage.
2. For colors.brandColors: Array of valid color codes discovered from the website. Include all prominent brand colors in any valid format.
3. For typography fields: Use EXACT font name from ALLOWED FONTS list OR null. NO OTHER VALUES ALLOWED.
4. If ALLOWED COLORS list shows colors, prioritize those but you can also use other colors you discover from analyzing the website.
5. If ALLOWED FONTS list says "NO FONTS FOUND", set ALL font fields to null.
6. SELECT colors based on their ACTUAL USAGE on the website. Primary should be the most prominent brand color, secondary should complement it, and accent should provide contrast.
7. You can use colors in hex (#FF5733), 3-digit hex (#333), RGB (rgb(255,87,51)), or RGBa format - all will be normalized automatically.
8. DO NOT use generic fonts like "sans-serif", "serif", "Arial" unless they are in the ALLOWED FONTS list.
9. Base your color selections on actual website visual analysis and usage patterns.`;

    if (!openai) {
      throw new Error('OpenAI is not configured. Please set the OPENAI_API_KEY environment variable.');
    }

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
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1e4bee63-f8e6-4581-b0da-e776ea8c2c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'brandAnalyzer.ts:969',message:'AI response received',data:{aiPrimary:result.colors?.primary,aiSecondary:result.colors?.secondary,aiAccent:result.colors?.accent,rawResponse:response.choices[0].message.content?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Normalize colors - accept any valid hex color discovered from website (no restrictions)
      const normalizeColor = (color: string): string | null => {
        if (!color || typeof color !== 'string') return null;
        const trimmed = color.trim();
        
        // Handle hex colors (3 or 6 digits)
        if (trimmed.startsWith('#')) {
          const hex = trimmed.replace('#', '');
          if (/^[0-9A-Fa-f]{3}$/.test(hex)) {
            // Expand 3-digit hex to 6-digit
            return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
          } else if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
            return `#${hex}`.toUpperCase();
          }
        }
        
        // Handle RGB/RGBA colors
        const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
        if (rgbMatch) {
          const r = parseInt(rgbMatch[1]);
          const g = parseInt(rgbMatch[2]);
          const b = parseInt(rgbMatch[3]);
          if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
          }
        }
        
        return null;
      };
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1e4bee63-f8e6-4581-b0da-e776ea8c2c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'brandAnalyzer.ts:987',message:'AI color validation - before (no restrictions)',data:{aiPrimary:result.colors?.primary,aiSecondary:result.colors?.secondary,aiAccent:result.colors?.accent,aiBrandColors:result.colors?.brandColors},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Accept any valid color format - no restrictions on which colors can be used
      const validatedColors = {
        primary: normalizeColor(result.colors?.primary || ''),
        secondary: normalizeColor(result.colors?.secondary || ''),
        accent: normalizeColor(result.colors?.accent || ''),
        brandColors: Array.isArray(result.colors?.brandColors) 
          ? result.colors.brandColors
              .map((color: any): string | null => normalizeColor(color))
              .filter((color: string | null): color is string => color !== null)
          : []
      };
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1e4bee63-f8e6-4581-b0da-e776ea8c2c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'brandAnalyzer.ts:1033',message:'color validation - after (no restrictions)',data:{validatedPrimary:validatedColors.primary,validatedSecondary:validatedColors.secondary,validatedAccent:validatedColors.accent,validatedBrandColorsCount:validatedColors.brandColors.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      // Strict font validation with case-insensitive matching
      const validatedFonts = {
        primaryFont: (() => {
          const font = result.typography?.primaryFont;
          if (!font || typeof font !== 'string') return null;
          const matched = optimizedFonts.find((f: string) => f.toLowerCase() === font.toLowerCase());
          return matched ? matched : null;
        })(),
        secondaryFont: (() => {
          const font = result.typography?.secondaryFont;
          if (!font || typeof font !== 'string') return null;
          const matched = optimizedFonts.find((f: string) => f.toLowerCase() === font.toLowerCase());
          return matched ? matched : null;
        })(),
        fontFamilies: Array.isArray(result.typography?.fontFamilies) 
          ? result.typography.fontFamilies
              .map((font: any) => {
                if (typeof font !== 'string') return null;
                return optimizedFonts.find((f: string) => f.toLowerCase() === font.toLowerCase()) || null;
              })
              .filter((font: string | null): font is string => typeof font === 'string' && font !== null)
          : []
      };

      // Validate logo URL - must be in the candidate list
      let validatedLogoUrl: string | null = null;
      if (result.logo?.logoUrl) {
        // Check if the logo URL is in our image candidates
        const logoUrlLower = result.logo.logoUrl.toLowerCase();
        const matchingImage = optimizedImages.find((img: any) => 
          img.src.toLowerCase() === logoUrlLower || 
          img.src.toLowerCase().includes(logoUrlLower) ||
          logoUrlLower.includes(img.src.toLowerCase())
        );
        
        if (matchingImage) {
          validatedLogoUrl = matchingImage.src;
          console.log('✅ Validated logo URL:', validatedLogoUrl);
        } else {
          // If not found, try to find the first logo candidate
          const firstLogo = optimizedImages.find((img: any) => img.isLogo);
          if (firstLogo) {
            validatedLogoUrl = firstLogo.src;
            console.log('⚠️  Logo URL not in candidates, using first logo candidate:', validatedLogoUrl);
          } else if (optimizedImages.length > 0) {
            // Fallback to first image if no logo found
            validatedLogoUrl = optimizedImages[0].src;
            console.log('⚠️  No logo candidates found, using first image:', validatedLogoUrl);
          } else {
            console.log('⚠️  No logo candidates available');
          }
        }
      } else if (optimizedImages.length > 0) {
        // If AI didn't return a logo but we have candidates, use the first logo
        const firstLogo = optimizedImages.find((img: any) => img.isLogo);
        if (firstLogo) {
          validatedLogoUrl = firstLogo.src;
          console.log('✅ Using first logo candidate (AI returned null):', validatedLogoUrl);
        } else {
          validatedLogoUrl = optimizedImages[0].src;
          console.log('✅ Using first image as logo (no logo candidates):', validatedLogoUrl);
        }
      }

      const extractionResult = {
        colors: validatedColors,
        typography: validatedFonts,
        logo: {
          logoUrl: validatedLogoUrl || undefined,
          logoDescription: result.logo?.logoDescription || undefined,
          brandMark: result.logo?.brandMark || undefined
        },
        brandPersonality: {
          tone: result.brandPersonality?.tone || "Professional",
          personality: Array.isArray(result.brandPersonality?.personality) ? result.brandPersonality.personality : [],
          brandAdjectives: Array.isArray(result.brandPersonality?.brandAdjectives) ? result.brandPersonality.brandAdjectives : []
        },
        reasoning: result.reasoning || "Brand analysis completed using AI-powered website crawling and CSS extraction."
      };
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/1e4bee63-f8e6-4581-b0da-e776ea8c2c17',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'brandAnalyzer.ts:1084',message:'extraction result final',data:{primary:extractionResult.colors.primary,secondary:extractionResult.colors.secondary,accent:extractionResult.colors.accent,hasNullColors:!extractionResult.colors.primary||!extractionResult.colors.secondary||!extractionResult.colors.accent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      
      return extractionResult;
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