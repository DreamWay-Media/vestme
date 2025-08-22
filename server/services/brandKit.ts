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
 * Creates a cohesive brand palette from extracted website colors and fonts
 */
function createPaletteFromWebsiteColors(colors: string[], fonts: string[]): BrandKitSuggestion | null {
  if (colors.length === 0) return null;

  // Clean and sort colors by prevalence/importance
  const cleanColors = colors
    .filter(color => {
      // Filter out common/generic colors
      const lower = color.toLowerCase();
      return !lower.includes('transparent') && 
             !lower.includes('rgba(0, 0, 0, 0)') &&
             lower !== '#000000' && 
             lower !== '#ffffff' &&
             lower !== 'black' &&
             lower !== 'white';
    })
    .slice(0, 5); // Take top 5 meaningful colors

  if (cleanColors.length === 0) return null;

  // Convert colors to hex format for consistency
  const normalizeColor = (color: string): string => {
    // Simple RGB to hex conversion for rgb() format
    if (color.includes('rgb(')) {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        const r = parseInt(match[1]).toString(16).padStart(2, '0');
        const g = parseInt(match[2]).toString(16).padStart(2, '0');
        const b = parseInt(match[3]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
    }
    return color;
  };

  const normalizedColors = cleanColors.map(normalizeColor);

  // Choose primary color (first meaningful color)
  const primaryColor = normalizedColors[0];
  
  // Choose secondary color (try to find a neutral/gray, or second color)
  let secondaryColor = normalizedColors.find(c => {
    const hex = c.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      // Check if it's a gray/neutral (RGB values are close to each other)
      return Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30;
    }
    return false;
  }) || normalizedColors[1] || '#64748B';

  // Choose accent color (try to find a contrasting color)
  let accentColor = normalizedColors.find(c => c !== primaryColor && c !== secondaryColor) || 
                   normalizedColors[2] || 
                   '#10B981';

  // Choose font (prefer extracted fonts, fallback to web-safe fonts)
  const webSafeFonts = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro'];
  let fontFamily = 'Inter'; // default
  
  if (fonts.length > 0) {
    // Use the first extracted font if it's recognizable
    const extractedFont = fonts[0];
    if (extractedFont && extractedFont.length > 0) {
      fontFamily = extractedFont;
    }
  }

  return {
    primaryColor,
    secondaryColor,
    accentColor,
    fontFamily,
    reasoning: `Extracted from your website's existing design`
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
export function generateBrandKitAssets(brandKit: {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
}): {
  logoVariants: string[];
  colorSwatches: { name: string; hex: string; usage: string; }[];
  typography: { family: string; weights: string[]; usage: string; }[];
  guidelines: string[];
} {
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
    ]
  };
}