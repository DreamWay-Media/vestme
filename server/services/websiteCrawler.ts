import { JSDOM } from 'jsdom';

export interface WebsiteData {
  title: string;
  description: string;
  content: string;
  keyData: {
    companyInfo: string;
    products: string[];
    services: string[];
    teamInfo: string;
    contactInfo: string;
    socialLinks: string[];
  };
  metadata: {
    keywords: string[];
    ogImage: string;
    favicon: string;
    lastCrawled: string;
  };
}

export class WebsiteCrawler {
  async crawlWebsite(url: string): Promise<WebsiteData> {
    try {
      // Clean and validate URL
      const cleanUrl = this.validateAndCleanUrl(url);
      if (!cleanUrl) {
        throw new Error('Invalid URL provided');
      }

      // Fetch the website content
      const response = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PitchPerfect-Bot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      return this.parseWebsiteContent(html, cleanUrl);

    } catch (error: any) {
      console.error('Website crawling error:', error);
      throw new Error(`Failed to crawl website: ${error.message}`);
    }
  }

  private validateAndCleanUrl(url: string): string | null {
    try {
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }

      const urlObj = new URL(url);
      
      // Basic validation
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        return null;
      }

      return url;
    } catch {
      return null;
    }
  }

  private parseWebsiteContent(html: string, url: string): WebsiteData {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract basic metadata
    const title = this.extractTitle(document);
    const description = this.extractDescription(document);
    
    // Extract structured content
    const content = this.extractMainContent(document);
    const keyData = this.extractKeyData(document, content);
    const metadata = this.extractMetadata(document, url);

    return {
      title,
      description,
      content,
      keyData,
      metadata: {
        keywords: metadata.keywords || [],
        ogImage: metadata.ogImage || '',
        favicon: metadata.favicon || '',
        lastCrawled: new Date().toISOString(),
      },
    };
  }

  private extractTitle(document: Document): string {
    // Try multiple sources for title
    const sources = [
      () => document.querySelector('title')?.textContent,
      () => document.querySelector('meta[property="og:title"]')?.getAttribute('content'),
      () => document.querySelector('h1')?.textContent,
    ];

    for (const source of sources) {
      const title = source()?.trim();
      if (title && title.length > 0) {
        return title;
      }
    }

    return 'No title found';
  }

  private extractDescription(document: Document): string {
    // Try multiple sources for description
    const sources = [
      () => document.querySelector('meta[name="description"]')?.getAttribute('content'),
      () => document.querySelector('meta[property="og:description"]')?.getAttribute('content'),
      () => document.querySelector('meta[name="twitter:description"]')?.getAttribute('content'),
    ];

    for (const source of sources) {
      const description = source()?.trim();
      if (description && description.length > 0) {
        return description;
      }
    }

    return 'No description found';
  }

  private extractMainContent(document: Document): string {
    // Remove unwanted elements
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 
      '.cookie', '.popup', '.modal', '.advertisement'
    ];
    
    unwantedSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Try to find main content
    const contentSelectors = [
      'main',
      '.main-content',
      '.content',
      'article',
      '.article',
      '.page-content',
      'body'
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return this.cleanText(element.textContent || '');
      }
    }

    return this.cleanText(document.body?.textContent || '');
  }

  private extractKeyData(document: Document, content: string): WebsiteData['keyData'] {
    // Extract company information
    const companyInfo = this.extractCompanyInfo(document, content);
    
    // Extract products/services
    const products = this.extractProducts(document, content);
    const services = this.extractServices(document, content);
    
    // Extract team information
    const teamInfo = this.extractTeamInfo(document, content);
    
    // Extract contact information
    const contactInfo = this.extractContactInfo(document, content);
    
    // Extract social links
    const socialLinks = this.extractSocialLinks(document);

    return {
      companyInfo,
      products,
      services,
      teamInfo,
      contactInfo,
      socialLinks,
    };
  }

  private extractCompanyInfo(document: Document, content: string): string {
    // Look for about sections
    const aboutSelectors = [
      '.about', '#about', '.company', '#company',
      '.about-us', '#about-us', '.overview', '#overview'
    ];

    for (const selector of aboutSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return this.cleanText(element.textContent || '');
      }
    }

    // Extract from content using keywords
    const aboutKeywords = ['about us', 'our company', 'who we are', 'our mission', 'our vision'];
    for (const keyword of aboutKeywords) {
      const index = content.toLowerCase().indexOf(keyword);
      if (index !== -1) {
        return content.substring(index, index + 500);
      }
    }

    return '';
  }

  private extractProducts(document: Document, content: string): string[] {
    const products: string[] = [];
    
    // Look for product sections
    const productSelectors = [
      '.product', '.products', '#products',
      '.product-list', '.product-grid'
    ];

    for (const selector of productSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const text = this.cleanText(element.textContent || '');
        if (text.length > 10) {
          products.push(text.substring(0, 200));
        }
      });
    }

    return products;
  }

  private extractServices(document: Document, content: string): string[] {
    const services: string[] = [];
    
    // Look for service sections
    const serviceSelectors = [
      '.service', '.services', '#services',
      '.service-list', '.service-grid'
    ];

    for (const selector of serviceSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const text = this.cleanText(element.textContent || '');
        if (text.length > 10) {
          services.push(text.substring(0, 200));
        }
      });
    }

    return services;
  }

  private extractTeamInfo(document: Document, content: string): string {
    const teamSelectors = [
      '.team', '#team', '.about-team', '#about-team',
      '.founders', '#founders', '.leadership', '#leadership'
    ];

    for (const selector of teamSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return this.cleanText(element.textContent || '');
      }
    }

    return '';
  }

  private extractContactInfo(document: Document, content: string): string {
    const contactSelectors = [
      '.contact', '#contact', '.contact-info', '#contact-info',
      '.contact-us', '#contact-us'
    ];

    for (const selector of contactSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return this.cleanText(element.textContent || '');
      }
    }

    // Extract email and phone patterns
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const phoneRegex = /[\+]?[1-9]?[\d\s\-\(\)]{8,}/g;
    
    const emails = content.match(emailRegex) || [];
    const phones = content.match(phoneRegex) || [];
    
    return [...emails, ...phones].join(', ');
  }

  private extractSocialLinks(document: Document): string[] {
    const socialLinks: string[] = [];
    const socialDomains = [
      'facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com',
      'youtube.com', 'github.com', 'tiktok.com'
    ];

    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      if (socialDomains.some(domain => href.includes(domain))) {
        socialLinks.push(href);
      }
    });

    return Array.from(new Set(socialLinks)); // Remove duplicates
  }

  private extractMetadata(document: Document, url: string): Partial<WebsiteData['metadata']> {
    const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content')?.split(',').map(k => k.trim()) || [];
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
    const favicon = document.querySelector('link[rel="icon"]')?.getAttribute('href') || 
                   document.querySelector('link[rel="shortcut icon"]')?.getAttribute('href') || '';

    return {
      keywords: keywords || [],
      ogImage: ogImage || '',
      favicon: favicon ? new URL(favicon, url).href : '',
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim()
      .substring(0, 2000); // Limit length
  }
}