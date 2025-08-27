import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ImproveTextRequest {
  text: string;
  context: string;
  businessProfile?: any;
}

export async function improveTextWithContext(
  params: ImproveTextRequest
): Promise<{ improvedText: string }> {
  const { text, context, businessProfile } = params;

  let prompt = `Please improve the following ${context} to be more compelling and professional. `;
  
  if (businessProfile) {
    prompt += `Use the following business context to make the content more relevant and targeted:
    
Business Name: ${businessProfile.businessName || 'N/A'}
Industry: ${businessProfile.industry || 'N/A'}
Problem Statement: ${businessProfile.problemStatement || 'N/A'}
Value Proposition: ${businessProfile.valueProposition || 'N/A'}
Target Market: ${businessProfile.targetMarket || 'N/A'}

`;
  }

  prompt += `Original ${context}: "${text}"

Please provide only the improved text, without any additional explanations or formatting. Keep it concise and impactful.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a professional copywriter and pitch deck expert. Your job is to improve text content to be more compelling, clear, and persuasive for investors and stakeholders."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const improvedText = response.choices[0].message.content?.trim() || text;

    return {
      improvedText
    };
  } catch (error) {
    console.error('Error improving text with OpenAI:', error);
    throw new Error('Failed to improve text content');
  }
}

// Additional functions for compatibility with existing routes
export async function analyzeBusinessFromData(data: any) {
  // This function was already implemented elsewhere
  // Adding stub for compatibility
  throw new Error('Function not implemented in this service');
}

export async function generatePitchDeckSlides(data: any) {
  const { businessProfile, brandingInfo } = data;
  
  console.log('generatePitchDeckSlides called with:', {
    hasBusinessProfile: !!businessProfile,
    businessProfileKeys: businessProfile ? Object.keys(businessProfile) : [],
    hasBrandingInfo: !!brandingInfo,
    brandingInfoKeys: brandingInfo ? Object.keys(brandingInfo) : []
  });
  
  if (!businessProfile) {
    throw new Error('Business profile is required to generate pitch deck slides');
  }

  const prompt = `You are a creative and talented pitch deck designer. Your mission is to create BEAUTIFUL, VISUALLY STUNNING slides that showcase the brand's identity while ensuring perfect readability and visual appeal.

Create a professional, investor-ready pitch deck for the following business. 

Business Information:
- Company Name: ${businessProfile.companyName || businessProfile.businessName || 'Our Company'}
- Industry: ${businessProfile.industry || 'Technology'}
- Problem Statement: ${businessProfile.problemStatement || businessProfile.businessDescription || 'Solving a market need'}
- Solution: ${businessProfile.solution || (Array.isArray(businessProfile.keyFeatures) ? businessProfile.keyFeatures.join(', ') : businessProfile.keyFeatures) || 'Our innovative solution'}
- Value Proposition: ${businessProfile.valueProposition || 'Unique value we provide'}
- Target Market: ${businessProfile.targetMarket || (Array.isArray(businessProfile.customerSegments) ? businessProfile.customerSegments.join(', ') : businessProfile.customerSegments) || 'Our target customers'}
- Business Model: ${businessProfile.businessModel || (Array.isArray(businessProfile.revenueModel) ? businessProfile.revenueModel.join(', ') : businessProfile.revenueModel) || 'How we make money'}
- Competitive Advantage: ${Array.isArray(businessProfile.competitiveAdvantage) ? businessProfile.competitiveAdvantage.join(', ') : businessProfile.competitiveAdvantage || 'What makes us unique'}
- Market Size: ${businessProfile.marketSize || businessProfile.marketOpportunity || 'Market opportunity'}
- Financial Projections: ${businessProfile.financialProjections || businessProfile.revenueProjections || 'Revenue projections'}
- Team: ${businessProfile.team || businessProfile.teamSize || 'Our team'}
- Roadmap: ${Array.isArray(businessProfile.growthStrategy) ? businessProfile.growthStrategy.join(', ') : businessProfile.growthStrategy || 'Future plans'}

Available Business Data Keys: ${Object.keys(businessProfile).join(', ')}

IMPORTANT: Extract and use ALL available business information from the businessProfile object. Look for any additional data that might be useful for the pitch deck.

BRAND KIT - YOUR CREATIVE PALETTE:
- Primary Color: ${brandingInfo?.primaryColor || '#2563EB'} - Use creatively for backgrounds, text, or accents
- Secondary Color: ${brandingInfo?.secondaryColor || '#64748B'} - Use for complementary elements, borders, or text
- Accent Color: ${brandingInfo?.accentColor || '#10B981'} - Use for highlights, buttons, or special emphasis
- Font Family: ${brandingInfo?.fontFamily || 'Inter'} - Use for all text to maintain brand consistency
- Main Logo: ${brandingInfo?.logoUrl || 'Not provided'}
- Additional Logos: ${brandingInfo?.brandAssets ? `${brandingInfo.brandAssets.length} logos available` : 'None'}
${brandingInfo?.brandAssets ? `Logo Details: ${brandingInfo.brandAssets.map((asset: any, index: number) => `Logo ${index + 1}: ${asset.name || 'Unnamed'} (${asset.type})`).join(', ')}` : ''}

DESIGN GUIDANCE - CREATE BEAUTIFUL, CREATIVE SLIDES:

1. COLOR CREATIVITY - BE ARTISTIC:
   - Mix and match your brand colors in creative ways
   - Use gradients, overlays, or color combinations that look stunning
   - Experiment with different color roles - primary can be background OR text
   - Create visual interest through color contrast and harmony

2. VISUAL APPEAL - MAKE IT STUNNING:
   - Design each slide to be visually captivating
   - Use your brand colors in unexpected but beautiful ways
   - Create depth with shadows, borders, or layered elements
   - Ensure every slide feels premium and professional

3. TYPOGRAPHY - MAINTAIN BRAND IDENTITY:
   - Use ${brandingInfo?.fontFamily || 'Inter'} for all text
   - Create beautiful text hierarchy and spacing
   - Use brand colors for text to maintain visual consistency
   - Choose appropriate font sizes for optimal readability:
     * TITLES: Use 3xl, 4xl, or 5xl for maximum impact
     * DESCRIPTIONS: Use lg, xl, or 2xl for clear readability
     * BULLET POINTS: Use base, lg, or xl for comfortable reading

4. LOGO INTEGRATION:
   - Place logos strategically to enhance the design
   - Ensure logos work harmoniously with your color choices
   - Use logos to create visual balance and interest

Create a comprehensive pitch deck with the following slides. Each slide should be visually beautiful and professional with REAL CONTENT and PROPER VISUAL DESIGN:

1. TITLE SLIDE - Company name, tagline, and logo
2. PROBLEM - Clear problem statement with visual impact
3. SOLUTION - Our innovative solution with benefits
4. MARKET OPPORTUNITY - Market size and growth potential
5. BUSINESS MODEL - How we create and capture value
6. COMPETITIVE ANALYSIS - Competitive landscape and advantages
7. FINANCIAL PROJECTIONS - Revenue model and projections
8. TEAM - Key team members and expertise
9. ROADMAP - Timeline and milestones
10. CALL TO ACTION - Investment opportunity and next steps

Each slide MUST include:
- Compelling headline that's specific to the business
- Supporting text with 2-3 specific bullet points about the business using REAL data from the business profile
- Content structure with description and bullets for proper rendering
- Visual elements (charts, icons, or graphics)
- Professional design using the EXACT brand colors provided
- Strategic use of ALL available logos from the brand kit
- Clear, investor-friendly language with real business details
- MANDATORY font sizing for EVERY slide:
  * Title: Large and impactful (3xl, 4xl, or 5xl)
  * Description: Clear and readable (lg, xl, or 2xl)
  * Bullet points: Comfortable reading size (base, lg, or xl)

FONT SIZE REQUIREMENT: You MUST include the "styling" object with font sizes for EVERY SINGLE SLIDE. This is not optional.

CRITICAL REQUIREMENTS:
1. Use ONLY the actual business information provided above
2. Create specific, meaningful content for each slide
3. Extract and use ALL available business data
4. Don't use generic placeholder text
5. Make each slide compelling and business-specific
6. Include real numbers, facts, and details from the business profile
7. Structure content with description and bullets for proper slide rendering
8. ALWAYS include font sizes in the styling object for optimal visual hierarchy
9. EVERY SLIDE MUST have the "styling" object with titleFontSize, descriptionFontSize, and bulletFontSize
10. NEVER skip the styling object - it's required for ALL slides

Return the response as a JSON object with a "slides" array containing slide objects with this exact structure:

{
  "slides": [
    {
      "id": "slide-1",
      "type": "title",
      "title": "Specific Company Title",
      "content": {
        "description": "Specific company tagline and value proposition",
        "bullets": [
          "Key point 1 about the company",
          "Key point 2 about the company",
          "Key point 3 about the company"
        ]
      },
      "visualElements": ["mainLogo", "additionalLogos"],
      "layout": "centered",
      "backgroundColor": "Choose a beautiful brand color that works well with your text",
      "textColor": "Choose a contrasting color that ensures perfect readability",
      "logoUsage": "Use main logo prominently, incorporate additional logos strategically",
      "styling": {
        "titleFontSize": "Choose appropriate size: 3xl, 4xl, or 5xl for titles",
        "descriptionFontSize": "Choose appropriate size: lg, xl, or 2xl for descriptions",
        "bulletFontSize": "Choose appropriate size: base, lg, or xl for bullet points"
      }
    }
  ]
}

CRITICAL: EVERY SINGLE SLIDE MUST include the "styling" object with font sizes. Do not skip this for any slide.

EXAMPLE - ALL SLIDES MUST FOLLOW THIS PATTERN:
- Slide 1: Include styling object with font sizes
- Slide 2: Include styling object with font sizes  
- Slide 3: Include styling object with font sizes
- Slide 4: Include styling object with font sizes
- Slide 5: Include styling object with font sizes
- Slide 6: Include styling object with font sizes
- Slide 7: Include styling object with font sizes
- Slide 8: Include styling object with font sizes
- Slide 9: Include styling object with font sizes
- Slide 10: Include styling object with font sizes

NO EXCEPTIONS - EVERY SLIDE NEEDS THE STYLING OBJECT!

IMPORTANT: Choose colors that create beautiful, readable combinations. Avoid poor contrast like light text on light backgrounds.

CREATIVE COLOR GUIDANCE - DESIGN BEAUTIFULLY:
- Be creative with your brand colors - mix them in unexpected but beautiful ways
- Ensure text is always readable against backgrounds (good contrast)
- Use your brand colors for both backgrounds and text - just make sure they work together
- Create stunning visual combinations that showcase your brand identity
- Avoid poor contrast combinations like light text on light backgrounds

LOGO USAGE GUIDELINES:
- Main Logo: Use prominently on title slide and as header element
- Additional Logos: Distribute strategically across slides for brand consistency
- Logo Placement: Position logos to enhance visual hierarchy without overwhelming content
- Brand Consistency: Ensure all logos maintain consistent sizing and positioning

COLOR SELECTION RULES - FOLLOW STRICTLY:
1. TITLE SLIDE: Use primary color as background, secondary color for text (ensure contrast)
2. CONTENT SLIDES: Use secondary color as background, primary color for text (ensure contrast)  
3. ACCENT SLIDES: Use accent color sparingly, always with contrasting text
4. CONTRAST CHECK: Text must be clearly readable against background
5. BRAND CONSISTENCY: Use brand colors but prioritize readability and visual appeal

Make each slide visually stunning and professional. Use the EXACT brand colors provided and create specific, meaningful content based on the business information.

FINAL REMINDER: EVERY SINGLE SLIDE MUST INCLUDE THE STYLING OBJECT WITH FONT SIZES. NO EXCEPTIONS!`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a creative and talented pitch deck designer with an eye for beautiful design. Create visually stunning, investor-ready pitch deck slides that showcase brand identity through creative use of colors, typography, and layout. Focus on visual appeal, readability, and professional aesthetics while maintaining brand consistency. CRITICAL: You MUST include a 'styling' object with font sizes for EVERY SINGLE SLIDE. This is not optional and applies to all slides."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    console.log('OpenAI response content:', content);

    // Parse the JSON response
    let slides;
    try {
      const parsed = JSON.parse(content);
      console.log('Parsed OpenAI response:', parsed);
      slides = Array.isArray(parsed) ? parsed : parsed.slides || [];
      console.log('Extracted slides array:', slides);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw content that failed to parse:', content);
      // Fallback to default slides
      slides = generateDefaultSlides(businessProfile, brandingInfo);
    }

    // Validate and enhance slides
    if (!slides || slides.length === 0) {
      console.error('No slides received from OpenAI, using fallback');
      slides = generateDefaultSlides(businessProfile, brandingInfo);
    }

    const enhancedSlides = slides.map((slide: any, index: number) => {
      // Ensure proper color contrast and visual appeal
      const { backgroundColor, textColor } = ensureColorContrast(
        slide.backgroundColor || brandingInfo?.primaryColor || '#FFFFFF',
        slide.textColor || brandingInfo?.secondaryColor || '#000000',
        brandingInfo
      );

      // Extract AI-generated styling including font sizes
      const aiStyling = slide.styling || {};
      
      // Log each slide's styling to debug
      console.log(`Slide ${index + 1} styling:`, {
        hasStyling: !!slide.styling,
        titleFontSize: aiStyling.titleFontSize,
        descriptionFontSize: aiStyling.descriptionFontSize,
        bulletFontSize: aiStyling.bulletFontSize,
        fullStyling: aiStyling
      });
      
      return {
        id: slide.id || `slide-${index + 1}`,
        type: slide.type || 'content',
        title: slide.title || `Slide ${index + 1}`,
        content: slide.content || { description: 'Content for this slide', bullets: [] },
        visualElements: Array.isArray(slide.visualElements) ? slide.visualElements : ['icon'],
        layout: slide.layout || 'standard',
        backgroundColor,
        textColor,
        order: index + 1,
        styling: {
          // AI-generated font sizes for optimal visual hierarchy
          titleFontSize: aiStyling.titleFontSize || '3xl',
          descriptionFontSize: aiStyling.descriptionFontSize || 'lg',
          bulletFontSize: aiStyling.bulletFontSize || 'base',
          // Preserve other AI-generated styling
          ...aiStyling
        }
      };
    });

    console.log(`Generated ${enhancedSlides.length} slides for pitch deck`);
    
    // Final validation - ensure all slides have styling
    const slidesWithStyling = enhancedSlides.filter((slide: any) => slide.styling);
    const slidesWithoutStyling = enhancedSlides.filter((slide: any) => !slide.styling);
    
    console.log('Styling validation:', {
      totalSlides: enhancedSlides.length,
      slidesWithStyling: slidesWithStyling.length,
      slidesWithoutStyling: slidesWithoutStyling.length,
      slidesMissingStyling: slidesWithoutStyling.map((s: any) => s.id)
    });
    
    if (slidesWithoutStyling.length > 0) {
      console.warn('WARNING: Some slides are missing styling objects:', slidesWithoutStyling.map((s: any) => s.id));
    }
    
    return enhancedSlides;

  } catch (error) {
    console.error('Error generating pitch deck slides:', error);
    // Fallback to default slides
    return generateDefaultSlides(businessProfile, brandingInfo);
  }
}

function generateDefaultSlides(businessProfile: any, brandingInfo: any) {
  const companyName = businessProfile.companyName || businessProfile.businessName || 'Our Company';
  const industry = businessProfile.industry || 'Technology';
  const primaryColor = brandingInfo?.primaryColor || '#2563EB';
  const secondaryColor = brandingInfo?.secondaryColor || '#64748B';
  const accentColor = brandingInfo?.accentColor || '#10B981';

  return [
    {
      id: 'slide-1',
      type: 'title',
      title: companyName,
      content: `Revolutionizing ${industry} with innovative solutions`,
      visualElements: ['logo', 'icon'],
      layout: 'centered',
      backgroundColor: '#FFFFFF',
      textColor: primaryColor,
      order: 1,
      styling: {
        titleFontSize: '4xl',
        descriptionFontSize: 'xl',
        bulletFontSize: 'lg'
      }
    },
    {
      id: 'slide-2',
      type: 'problem',
      title: 'The Problem',
      content: businessProfile.problemStatement || businessProfile.businessDescription || 'Addressing a critical market need',
      visualElements: ['icon', 'chart'],
      layout: 'standard',
      backgroundColor: secondaryColor,
      textColor: '#FFFFFF',
      order: 2,
      styling: {
        titleFontSize: '3xl',
        descriptionFontSize: 'lg',
        bulletFontSize: 'base'
      }
    },
    {
      id: 'slide-3',
      type: 'solution',
      title: 'Our Solution',
      content: businessProfile.solution || (Array.isArray(businessProfile.keyFeatures) ? businessProfile.keyFeatures.join(', ') : businessProfile.keyFeatures) || 'Innovative approach to solving the problem',
      visualElements: ['icon', 'image'],
      layout: 'standard',
      backgroundColor: '#FFFFFF',
      textColor: primaryColor,
      order: 3,
      styling: {
        titleFontSize: '3xl',
        descriptionFontSize: 'lg',
        bulletFontSize: 'base'
      }
    },
    {
      id: 'slide-4',
      type: 'market',
      title: 'Market Opportunity',
      content: businessProfile.marketSize || businessProfile.marketOpportunity || 'Significant market potential',
      visualElements: ['chart', 'icon'],
      layout: 'standard',
      backgroundColor: accentColor,
      textColor: '#FFFFFF',
      order: 4,
      styling: {
        titleFontSize: '3xl',
        descriptionFontSize: 'lg',
        bulletFontSize: 'base'
      }
    },
    {
      id: 'slide-5',
      type: 'business-model',
      title: 'Business Model',
      content: businessProfile.businessModel || (Array.isArray(businessProfile.revenueModel) ? businessProfile.revenueModel.join(', ') : businessProfile.revenueModel) || 'Sustainable revenue generation',
      visualElements: ['chart', 'icon'],
      layout: 'standard',
      backgroundColor: '#FFFFFF',
      textColor: primaryColor,
      order: 5,
      styling: {
        titleFontSize: '3xl',
        descriptionFontSize: 'lg',
        bulletFontSize: 'base'
      }
    },
    {
      id: 'slide-6',
      type: 'competitive',
      title: 'Competitive Advantage',
      content: businessProfile.competitiveAdvantage || (Array.isArray(businessProfile.competitiveAdvantage) ? businessProfile.competitiveAdvantage.join(', ') : businessProfile.competitiveAdvantage) || 'What makes us unique',
      visualElements: ['chart', 'icon'],
      layout: 'standard',
      backgroundColor: secondaryColor,
      textColor: '#FFFFFF',
      order: 6,
      styling: {
        titleFontSize: '3xl',
        descriptionFontSize: 'lg',
        bulletFontSize: 'base'
      }
    },
    {
      id: 'slide-7',
      type: 'financial',
      title: 'Financial Projections',
      content: businessProfile.financialProjections || businessProfile.revenueProjections || 'Revenue growth and projections',
      visualElements: ['chart', 'icon'],
      layout: 'standard',
      backgroundColor: '#FFFFFF',
      textColor: primaryColor,
      order: 7,
      styling: {
        titleFontSize: '3xl',
        descriptionFontSize: 'lg',
        bulletFontSize: 'base'
      }
    },
    {
      id: 'slide-8',
      type: 'team',
      title: 'Our Team',
      content: businessProfile.team || businessProfile.teamSize || 'Experienced professionals',
      visualElements: ['icon', 'image'],
      layout: 'standard',
      backgroundColor: accentColor,
      textColor: '#FFFFFF',
      order: 8,
      styling: {
        titleFontSize: '3xl',
        descriptionFontSize: 'lg',
        bulletFontSize: 'base'
      }
    },
    {
      id: 'slide-9',
      type: 'roadmap',
      title: 'Roadmap',
      content: businessProfile.roadmap || (Array.isArray(businessProfile.growthStrategy) ? businessProfile.growthStrategy.join(', ') : businessProfile.growthStrategy) || 'Future milestones and goals',
      visualElements: ['chart', 'icon'],
      layout: 'standard',
      backgroundColor: '#FFFFFF',
      textColor: primaryColor,
      order: 9,
      styling: {
        titleFontSize: '3xl',
        descriptionFontSize: 'lg',
        bulletFontSize: 'base'
      }
    },
    {
      id: 'slide-10',
      type: 'cta',
      title: 'Investment Opportunity',
      content: 'Join us in transforming the future',
      visualElements: ['icon', 'button'],
      layout: 'centered',
      backgroundColor: primaryColor,
      textColor: '#FFFFFF',
      order: 10,
      styling: {
        titleFontSize: '4xl',
        descriptionFontSize: 'xl',
        bulletFontSize: 'lg'
      }
    }
  ];
}

export async function enhanceBusinessDescription(data: any) {
  // This function was already implemented elsewhere
  // Adding stub for compatibility
  throw new Error('Function not implemented in this service');
}

export async function improveSlideText(params: { text: string; context: string; businessProfile?: any }) {
  // Alias for the main function
  return improveTextWithContext(params);
}

// Function to ensure proper color contrast and visual appeal
function ensureColorContrast(backgroundColor: string, textColor: string, brandingInfo: any) {
  // Convert hex to RGB for contrast calculation
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  // Calculate contrast ratio
  const getContrastRatio = (bg: string, fg: string) => {
    const bgRgb = hexToRgb(bg);
    const fgRgb = hexToRgb(fg);
    
    if (!bgRgb || !fgRgb) return 1;
    
    const bgLum = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
    const fgLum = getLuminance(fgRgb.r, fgRgb.g, fgRgb.b);
    
    const lighter = Math.max(bgLum, fgLum);
    const darker = Math.min(bgLum, fgLum);
    
    return (lighter + 0.05) / (darker + 0.05);
  };

  // Check if current colors have sufficient contrast
  const contrastRatio = getContrastRatio(backgroundColor, textColor);
  
  // If contrast is good (ratio >= 4.5), return original colors
  if (contrastRatio >= 4.5) {
    return { backgroundColor, textColor };
  }

  // If contrast is poor, fix it intelligently
  const bgRgb = hexToRgb(backgroundColor);
  if (!bgRgb) return { backgroundColor, textColor };

  // Determine if background is light or dark
  const bgLum = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const isLightBackground = bgLum > 0.5;

  // Choose appropriate text color based on background
  let newTextColor = textColor;
  if (isLightBackground) {
    // Light background - use dark text
    newTextColor = brandingInfo?.primaryColor || '#000000';
  } else {
    // Dark background - use light text
    newTextColor = brandingInfo?.secondaryColor || '#FFFFFF';
  }

  // Ensure the new combination also has good contrast
  const newContrastRatio = getContrastRatio(backgroundColor, newTextColor);
  if (newContrastRatio < 4.5) {
    // Fallback to guaranteed contrast
    if (isLightBackground) {
      newTextColor = '#000000'; // Black on light
    } else {
      newTextColor = '#FFFFFF'; // White on dark
    }
  }

  return { backgroundColor, textColor: newTextColor };
}
