interface BusinessProfile {
  companyName?: string;
  industry?: string;
  description?: string;
  targetAudience?: string;
  valueProposition?: string;
  keyFeatures?: string[];
  competitiveAdvantage?: string;
  websiteContent?: {
    designElements?: {
      colors: string[];
      fonts: string[];
      logoUrls: string[];
      keyImages: string[];
    };
  };
}

interface BrandKitSuggestion {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  reasoning: string;
}

/**
 * Generates AI-powered brand kit suggestions based on business profile
 */
export function generateBrandKitSuggestions(businessProfile: BusinessProfile): BrandKitSuggestion {
  const industry = businessProfile.industry?.toLowerCase() || "";
  const description = businessProfile.description?.toLowerCase() || "";
  const valueProposition = businessProfile.valueProposition?.toLowerCase() || "";
  
  // Extract website design elements if available
  const websiteColors = businessProfile.websiteContent?.designElements?.colors || [];
  const websiteFonts = businessProfile.websiteContent?.designElements?.fonts || [];
  const websiteLogos = businessProfile.websiteContent?.designElements?.logoUrls || [];
  const websiteImages = businessProfile.websiteContent?.designElements?.keyImages || [];
  
  // Define industry-specific color palettes
  const colorPalettes = {
    technology: {
      primaryColor: "#2563EB", // Professional blue
      secondaryColor: "#64748B", // Slate gray
      accentColor: "#10B981", // Emerald green
      fontFamily: "Inter",
      reasoning: "Technology brands benefit from modern, trustworthy blue tones with clean typography"
    },
    healthcare: {
      primaryColor: "#0D9488", // Teal
      secondaryColor: "#6B7280", // Gray
      accentColor: "#F59E0B", // Amber
      fontFamily: "Source Sans Pro",
      reasoning: "Healthcare requires calming, trustworthy colors that inspire confidence"
    },
    finance: {
      primaryColor: "#1E40AF", // Deep blue
      secondaryColor: "#64748B", // Slate
      accentColor: "#DC2626", // Red accent
      fontFamily: "Roboto",
      reasoning: "Financial services use conservative, authoritative colors to build trust"
    },
    ecommerce: {
      primaryColor: "#059669", // Green
      secondaryColor: "#374151", // Dark gray
      accentColor: "#F97316", // Orange
      fontFamily: "Open Sans",
      reasoning: "E-commerce benefits from energetic greens and orange accents for conversion"
    },
    creative: {
      primaryColor: "#7C3AED", // Purple
      secondaryColor: "#6B7280", // Gray
      accentColor: "#F59E0B", // Amber
      fontFamily: "Montserrat",
      reasoning: "Creative industries can use bold purples to stand out and inspire"
    },
    education: {
      primaryColor: "#2563EB", // Blue
      secondaryColor: "#64748B", // Gray
      accentColor: "#10B981", // Green
      fontFamily: "Lato",
      reasoning: "Education brands use approachable blues and greens for learning environments"
    },
    consulting: {
      primaryColor: "#1F2937", // Dark gray
      secondaryColor: "#6B7280", // Medium gray
      accentColor: "#2563EB", // Blue accent
      fontFamily: "Inter",
      reasoning: "Consulting requires professional, sophisticated color schemes"
    },
    saas: {
      primaryColor: "#2563EB", // Blue
      secondaryColor: "#64748B", // Gray
      accentColor: "#8B5CF6", // Purple accent
      fontFamily: "Inter",
      reasoning: "SaaS products use modern blues with tech-forward purple accents"
    }
  };

  // Check if we have website-extracted design elements
  if (websiteColors.length > 0 || websiteFonts.length > 0 || websiteLogos.length > 0) {
    console.log('Using website-extracted design elements');
    console.log('Found colors:', websiteColors.length);
    console.log('Found fonts:', websiteFonts.length);
    console.log('Found logos:', websiteLogos.length);
    console.log('Found images:', websiteImages.length);
    
    const extractedPalette = createPaletteFromWebsiteColors(websiteColors, websiteFonts, websiteLogos, websiteImages);
    if (extractedPalette) {
      console.log('Successfully created palette from website data');
      return extractedPalette;
    } else {
      console.log('Failed to create palette from website data, falling back to industry palette');
    }
  }

  // Fall back to industry-specific palettes if no website data
  console.log('Using industry-specific palette for:', industry);
  
  // Determine industry category
  let selectedPalette = colorPalettes.technology; // Default

  if (industry.includes("health") || industry.includes("medical") || industry.includes("wellness")) {
    selectedPalette = colorPalettes.healthcare;
  } else if (industry.includes("finance") || industry.includes("banking") || industry.includes("investment")) {
    selectedPalette = colorPalettes.finance;
  } else if (industry.includes("ecommerce") || industry.includes("retail") || industry.includes("shop")) {
    selectedPalette = colorPalettes.ecommerce;
  } else if (industry.includes("creative") || industry.includes("design") || industry.includes("art")) {
    selectedPalette = colorPalettes.creative;
  } else if (industry.includes("education") || industry.includes("learn") || industry.includes("course")) {
    selectedPalette = colorPalettes.education;
  } else if (industry.includes("consulting") || industry.includes("advisory") || industry.includes("professional")) {
    selectedPalette = colorPalettes.consulting;
  } else if (industry.includes("saas") || industry.includes("software") || industry.includes("platform")) {
    selectedPalette = colorPalettes.saas;
  }

  // Adjust colors based on value proposition keywords
  let finalPalette = { ...selectedPalette };

  if (valueProposition.includes("premium") || valueProposition.includes("luxury")) {
    // Darker, more sophisticated colors for premium brands
    finalPalette.primaryColor = "#1F2937";
    finalPalette.secondaryColor = "#6B7280";
    finalPalette.accentColor = "#F59E0B";
    finalPalette.fontFamily = "Montserrat";
    finalPalette.reasoning += " Adjusted for premium positioning with sophisticated dark tones.";
  } else if (valueProposition.includes("fun") || valueProposition.includes("playful") || valueProposition.includes("young")) {
    // Brighter, more vibrant colors for playful brands
    finalPalette.accentColor = "#EC4899"; // Pink accent
    finalPalette.fontFamily = "Nunito";
    finalPalette.reasoning += " Enhanced with playful colors for youthful appeal.";
  } else if (valueProposition.includes("trust") || valueProposition.includes("secure") || valueProposition.includes("reliable")) {
    // Conservative, trustworthy colors
    finalPalette.primaryColor = "#1E40AF";
    finalPalette.secondaryColor = "#64748B";
    finalPalette.reasoning += " Optimized for trustworthiness with conservative blues.";
  }

  return finalPalette;
}

/**
 * Creates a cohesive brand palette from extracted website colors, fonts, logos, and images
 */
function createPaletteFromWebsiteColors(
  colors: string[], 
  fonts: string[], 
  logos: string[], 
  images: string[]
): BrandKitSuggestion | null {
  console.log('createPaletteFromWebsiteColors called with:', { colors: colors.length, fonts: fonts.length, logos: logos.length, images: images.length });
  
  if (colors.length === 0 && logos.length === 0) {
    console.log('No colors or logos found, returning null');
    return null;
  }

  // Convert colors to hex format for consistency and normalize
  const normalizeColor = (color: string): string | null => {
    if (!color || typeof color !== 'string') return null;
    
    const trimmed = color.trim();
    const lower = trimmed.toLowerCase();
    
    // Filter out transparent and invalid colors
    if (lower.includes('transparent') || lower.includes('rgba(0, 0, 0, 0)')) {
      return null;
    }
    
    // Handle hex colors (3 or 6 digits)
    if (trimmed.startsWith('#')) {
      const hex = trimmed.replace('#', '');
      if (hex.length === 3) {
        // Expand 3-digit hex to 6-digit
        return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
      } else if (hex.length === 6 && /^[a-f0-9]{6}$/i.test(hex)) {
        return `#${hex}`;
      }
      return null;
    }
    
    // Handle RGB/RGBA colors
    const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
    
    return null;
  };

  // Normalize all colors and count frequency
  const colorFrequency = new Map<string, number>();
  
  // Helper to calculate color saturation (0-1)
  const getSaturation = (r: number, g: number, b: number): number => {
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    const l = (max + min) / 2;
    if (max === min) return 0;
    const s = l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
    return s;
  };
  
  // Helper to check if color is too generic (common UI/background colors)
  const isGenericColor = (hex: string): boolean => {
    const lower = hex.toLowerCase();
    const genericPatterns = [
      '#000000', '#000', '#ffffff', '#fff', '#f5f5f5', '#fafafa', '#f0f0f0',
      '#e5e5e5', '#d4d4d4', '#a3a3a3', '#737373', '#525252', '#404040',
      '#262626', '#171717', '#0a0a0a', '#f4f4f5', '#e4e4e7', '#d4d4d8',
      '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a', '#18181b',
      '#f8fafc', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b',
      '#475569', '#334155', '#1e293b', '#0f172a', '#cccccc', '#ccc',
      '#999999', '#999', '#666666', '#666', '#333333', '#333', '#eeeeee', '#eee',
      '#dddddd', '#ddd', '#bbbbbb', '#bbb', '#aaaaaa', '#aaa'
    ];
    return genericPatterns.includes(lower);
  };
  
  for (const color of colors) {
    const normalized = normalizeColor(color);
    if (normalized) {
      // Skip generic colors
      if (isGenericColor(normalized)) {
        continue;
      }
      
      const hex = normalized.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      
      // Skip pure black/white and very light/dark grays
      const isBlack = r < 15 && g < 15 && b < 15;
      const isWhite = r > 240 && g > 240 && b > 240;
      const isVeryLightGray = r > 235 && g > 235 && b > 235 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15;
      const isVeryDarkGray = r < 25 && g < 25 && b < 25 && Math.abs(r - g) < 15 && Math.abs(g - b) < 15;
      const isMidGray = Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && r > 100 && r < 180;
      
      if (!isBlack && !isWhite && !isVeryLightGray && !isVeryDarkGray && !isMidGray) {
        // Weight saturated colors higher (they're more likely to be brand colors)
        const saturation = getSaturation(r, g, b);
        const weight = saturation > 0.3 ? 3 : (saturation > 0.1 ? 2 : 1);
        const count = colorFrequency.get(normalized) || 0;
        colorFrequency.set(normalized, count + weight);
      }
    }
  }

  if (colorFrequency.size === 0) {
    console.log('No valid colors after filtering');
    return null;
  }

  // Sort colors by frequency (most common first)
  const sortedColors = Array.from(colorFrequency.entries())
    .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
    .map(([color]) => color);

  console.log('Sorted colors by frequency:', sortedColors.slice(0, 10));

  // Helper function to get RGB values from hex
  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const cleanHex = hex.replace('#', '');
    if (cleanHex.length !== 6) return null;
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16)
    };
  };

  // Helper function to calculate luminance
  const getLuminance = (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  // Helper function to check if color is neutral/gray
  const isNeutral = (rgb: { r: number; g: number; b: number }): boolean => {
    return Math.abs(rgb.r - rgb.g) < 30 && 
           Math.abs(rgb.g - rgb.b) < 30 && 
           Math.abs(rgb.r - rgb.b) < 30;
  };

  // Helper function to check if color is suitable for primary (not too light, not too dark)
  const isSuitablePrimary = (rgb: { r: number; g: number; b: number }): boolean => {
    const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
    // Primary colors should have medium luminance (not too light, not too dark)
    return luminance > 0.1 && luminance < 0.8;
  };

  // Choose primary color (most frequent, suitable color)
  let primaryColor = sortedColors[0] || '#2563EB';
  const primaryRgb = hexToRgb(primaryColor);
  if (primaryRgb && !isSuitablePrimary(primaryRgb)) {
    // If first color isn't suitable, find the first suitable one
    for (const color of sortedColors) {
      const rgb = hexToRgb(color);
      if (rgb && isSuitablePrimary(rgb)) {
        primaryColor = color;
        break;
      }
    }
  }

  // Choose secondary color (prefer neutral/gray, otherwise second most frequent suitable color)
  let secondaryColor = '#64748B'; // default
  for (const color of sortedColors) {
    if (color === primaryColor) continue;
    const rgb = hexToRgb(color);
    if (rgb && isNeutral(rgb)) {
      secondaryColor = color;
      break;
    }
  }
  
  // If no neutral found, use second most frequent color (if different from primary)
  if (secondaryColor === '#64748B' && sortedColors.length > 1) {
    const secondColor = sortedColors.find(c => c !== primaryColor);
    if (secondColor) {
      secondaryColor = secondColor;
    }
  }

  // Choose accent color (find a contrasting color that's different from primary and secondary)
  let accentColor = '#10B981'; // default
  for (const color of sortedColors) {
    if (color === primaryColor || color === secondaryColor) continue;
    const rgb = hexToRgb(color);
    if (rgb) {
      const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
      // Accent should have good contrast (not too similar to primary)
      const primaryRgb = hexToRgb(primaryColor);
      if (primaryRgb) {
        const primaryLum = getLuminance(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        const contrast = Math.abs(luminance - primaryLum);
        if (contrast > 0.2) { // Good contrast
          accentColor = color;
          break;
        }
      }
    }
  }

  // If still default, try to find any different color
  if (accentColor === '#10B981') {
    const differentColor = sortedColors.find(c => c !== primaryColor && c !== secondaryColor);
    if (differentColor) {
      accentColor = differentColor;
    }
  }

  // Choose font (prefer extracted fonts, fallback to web-safe fonts)
  const webSafeFonts = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro'];
  let fontFamily = 'Inter'; // default
  
  if (fonts.length > 0) {
    // Use the first extracted font if it's recognizable
    const extractedFont = fonts[0];
    if (extractedFont && extractedFont.length > 0) {
      // Clean up font name (remove quotes, weights, etc.)
      const cleanFont = extractedFont
        .replace(/['"]/g, '')
        .split(',')[0]
        .trim()
        .split(' ')[0]; // Take first word (font family name)
      fontFamily = cleanFont || 'Inter';
    }
  }

  // Build comprehensive reasoning
  let reasoning = `Extracted from your website's existing design`;
  
  if (logos.length > 0) {
    reasoning += `. Found ${logos.length} logo(s) that will be incorporated into your brand kit`;
  }
  
  if (images.length > 0) {
    reasoning += `. Extracted ${images.length} key image(s) for brand consistency`;
  }
  
  if (colors.length > 0) {
    reasoning += `. Color palette derived from your website's most prominent colors`;
  }
  
  if (fonts.length > 0) {
    reasoning += `. Typography based on your website's font choices`;
  }

  const result = {
    primaryColor,
    secondaryColor,
    accentColor,
    fontFamily,
    reasoning
  };
  
  console.log('Created palette result:', result);
  console.log('Color selection details:', {
    totalColors: colors.length,
    uniqueColors: sortedColors.length,
    primaryFrequency: colorFrequency.get(primaryColor),
    secondaryFrequency: colorFrequency.get(secondaryColor),
    accentFrequency: colorFrequency.get(accentColor)
  });
  
  return result;
}

/**
 * Extracts and validates logos from business profile
 */
export function extractBrandLogos(businessProfile: BusinessProfile): {
  logos: string[];
  images: string[];
  hasValidAssets: boolean;
  recommendations: string[];
} {
  const logos = businessProfile.websiteContent?.designElements?.logoUrls || [];
  const images = businessProfile.websiteContent?.designElements?.keyImages || [];
  
  const recommendations: string[] = [];
  
  if (logos.length === 0 && images.length === 0) {
    recommendations.push("No logos or key images found. Consider adding your company logo to your website for better brand extraction.");
  } else if (logos.length === 0) {
    recommendations.push("No logos found, but key images detected. Consider adding a dedicated logo for better brand recognition.");
  } else if (logos.length > 0) {
    recommendations.push(`Found ${logos.length} logo(s). These will be incorporated into your brand kit.`);
  }
  
  if (images.length > 0) {
    recommendations.push(`Found ${images.length} key image(s) that can be used for brand consistency.`);
  }
  
  return {
    logos,
    images,
    hasValidAssets: logos.length > 0 || images.length > 0,
    recommendations
  };
}

/**
 * Validates brand kit color accessibility
 */
export function validateBrandKitAccessibility(colors: {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Convert hex to RGB for contrast calculations (simplified)
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const getContrast = (color1: string, color2: string) => {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);
    if (!rgb1 || !rgb2) return 1;

    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  };

  // Check contrast ratios
  const primaryVsWhite = getContrast(colors.primaryColor, "#FFFFFF");
  const secondaryVsWhite = getContrast(colors.secondaryColor, "#FFFFFF");
  const accentVsWhite = getContrast(colors.accentColor, "#FFFFFF");

  if (primaryVsWhite < 4.5) {
    warnings.push("Primary color may have insufficient contrast against white backgrounds");
    suggestions.push("Consider darkening the primary color for better readability");
  }

  if (secondaryVsWhite < 4.5) {
    warnings.push("Secondary color may have insufficient contrast against white backgrounds");
  }

  if (accentVsWhite < 3.0) {
    warnings.push("Accent color should have at least 3:1 contrast ratio");
  }

  // Check color similarity
  const primaryVsSecondary = getContrast(colors.primaryColor, colors.secondaryColor);
  if (primaryVsSecondary < 2.0) {
    warnings.push("Primary and secondary colors are too similar");
    suggestions.push("Increase contrast between primary and secondary colors");
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions
  };
}

/**
 * Generates brand kit assets metadata
 */
export function generateBrandKitAssets(
  brandKit: {
    name: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
  },
  businessProfile?: BusinessProfile
): {
  logoVariants: string[];
  colorSwatches: { name: string; hex: string; usage: string; }[];
  typography: { family: string; weights: string[]; usage: string; }[];
  guidelines: string[];
  extractedAssets?: {
    logos: string[];
    images: string[];
  };
} {
  // Get extracted logos and images if available
  const extractedLogos = businessProfile?.websiteContent?.designElements?.logoUrls || [];
  const extractedImages = businessProfile?.websiteContent?.designElements?.keyImages || [];
  
  return {
    logoVariants: [
      "Primary logo (full color)",
      "Secondary logo (single color)",
      "Logo mark only",
      "White/reversed logo",
      "Small/favicon version"
    ],
    colorSwatches: [
      {
        name: "Primary",
        hex: brandKit.primaryColor,
        usage: "Main brand color, headlines, CTAs, primary UI elements"
      },
      {
        name: "Secondary", 
        hex: brandKit.secondaryColor,
        usage: "Supporting text, borders, subtle backgrounds"
      },
      {
        name: "Accent",
        hex: brandKit.accentColor,
        usage: "Highlights, notifications, interactive elements"
      }
    ],
    typography: [
      {
        family: brandKit.fontFamily,
        weights: ["400 (Regular)", "500 (Medium)", "600 (Semibold)", "700 (Bold)"],
        usage: "All brand communications, web, and print materials"
      }
    ],
    guidelines: [
      "Maintain consistent color usage across all brand materials",
      "Use primary color for main call-to-action elements",
      "Apply secondary color for supporting text and UI elements",
      "Reserve accent color for highlights and interactive feedback",
      `Use ${brandKit.fontFamily} for all text to maintain brand consistency`,
      "Ensure minimum contrast ratios for accessibility compliance",
      "Test brand colors across different mediums and devices"
    ],
    extractedAssets: extractedLogos.length > 0 || extractedImages.length > 0 ? {
      logos: extractedLogos,
      images: extractedImages
    } : undefined
  };
}