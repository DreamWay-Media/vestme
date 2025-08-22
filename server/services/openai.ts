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
  // This function was already implemented elsewhere
  // Adding stub for compatibility
  throw new Error('Function not implemented in this service');
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
