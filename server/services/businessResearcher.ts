import OpenAI from "openai";

// Allow the app to start without OpenAI credentials
const hasOpenAIConfig = !!process.env.OPENAI_API_KEY;

const openai = hasOpenAIConfig
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export interface MarketAnalysis {
  marketSize: {
    totalAddressableMarket: string;
    servicableAddressableMarket: string;
    servicableObtainableMarket: string;
  };
  marketTrends: string[];
  growthOpportunities: string[];
  marketChallenges: string[];
  targetCustomers: {
    primarySegment: string;
    secondarySegments: string[];
    customerNeeds: string[];
  };
}

export interface CompetitorAnalysis {
  directCompetitors: Array<{
    name: string;
    description: string;
    strengths: string[];
    weaknesses: string[];
    marketPosition: string;
  }>;
  indirectCompetitors: Array<{
    name: string;
    description: string;
    relevance: string;
  }>;
  competitiveLandscape: string;
  competitiveAdvantages: string[];
  differentiators: string[];
}

export interface BusinessResearch {
  industryAnalysis: {
    industryOverview: string;
    keyDrivers: string[];
    regulations: string[];
    barriers: string[];
  };
  businessModel: {
    revenueStreams: string[];
    costStructure: string[];
    keyPartners: string[];
    keyActivities: string[];
  };
  riskAnalysis: {
    marketRisks: string[];
    operationalRisks: string[];
    financialRisks: string[];
    mitigationStrategies: string[];
  };
}

export class BusinessResearcher {
  async conductMarketAnalysis(companyName: string, industry: string, description: string, websiteData?: any): Promise<MarketAnalysis> {
    try {
      const prompt = `You are a senior market research analyst conducting a comprehensive market analysis. Provide specific, data-driven insights based on current market conditions and industry knowledge.

COMPANY ANALYSIS REQUEST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Company: ${companyName}
Industry Sector: ${industry}
Business Description: ${description}

${websiteData ? `
WEBSITE INTELLIGENCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${typeof websiteData === 'string' ? websiteData : JSON.stringify(websiteData).substring(0, 1500)}

Extract market context from:
- Service offerings and pricing models
- Customer testimonials and case studies  
- Technology stack and capabilities
- Geographic presence and target regions
- Industry partnerships or certifications
` : ''}

MARKET ANALYSIS REQUIREMENTS:
Conduct a thorough analysis based on 2024 market data, current industry trends, and competitive landscape. Provide specific market size estimates with reasoning, not generic ranges.

{
  "marketSize": {
    "totalAddressableMarket": "Provide specific TAM estimate with dollar amount and methodology (e.g., 'Global [industry] market worth $X billion in 2024, driven by [specific factors]')",
    "servicableAddressableMarket": "Calculate SAM based on company's addressable geography/segments (e.g., '$X billion SAM focusing on [specific regions/segments] where [company capabilities] are most relevant')", 
    "servicableObtainableMarket": "Realistic SOM estimate (e.g., '$X million SOM achievable within 3-5 years assuming [specific market penetration rate] in [target segments]')"
  },
  "marketTrends": [
    "Current macro trends affecting this industry (with specific data/percentages when possible)",
    "Technology disruptions or adoption patterns",
    "Regulatory changes or compliance requirements", 
    "Customer behavior shifts or demand patterns",
    "Investment and funding trends in this sector"
  ],
  "growthOpportunities": [
    "Specific market gaps or underserved segments",
    "Emerging technologies or platform opportunities",
    "Geographic expansion possibilities",
    "Adjacent market opportunities",
    "Partnership or acquisition opportunities"
  ],
  "marketChallenges": [
    "Competitive intensity and market saturation levels",
    "Economic headwinds or cyclical factors",
    "Regulatory barriers or compliance costs",
    "Technology adoption barriers",
    "Customer acquisition cost challenges"
  ],
  "targetCustomers": {
    "primarySegment": "Most valuable customer segment with specific characteristics (company size, industry, geography, budget range, pain points)",
    "secondarySegments": ["Additional viable customer segments with different characteristics or use cases"],
    "customerNeeds": [
      "Primary pain points driving purchase decisions",
      "Key value drivers and success metrics customers care about",
      "Buying process and decision-making criteria",
      "Budget ranges and cost sensitivity factors"
    ]
  }
}

FACTUAL ANALYSIS PROTOCOL:
- Use verifiable 2024 market data and industry benchmarks only
- Base estimates on documented comparable companies and verified growth rates  
- Reference specific economic indicators, technology trends, regulatory changes
- Provide specific numbers with sources or mark as "Industry estimate"
- Focus on actionable insights backed by market evidence
- Include both optimistic and conservative scenarios with reasoning
- Never fabricate specific company names or exact financial figures
- Use "Market research indicates" for reasonable industry assumptions

ANTI-HALLUCINATION MEASURES:
- Only reference real, searchable competitor companies
- Use ranges for market size estimates (e.g., "$X-Y billion market")
- Mark assumptions clearly: "Based on industry averages" vs "Company-specific data"
- Avoid specific percentage growth rates unless citing industry reports

Return comprehensive JSON market analysis following exact format above.`;

      if (!openai) {
        throw new Error('OpenAI is not configured. Please set the OPENAI_API_KEY environment variable.');
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return analysis;
    } catch (error: any) {
      console.error('Market analysis error:', error);
      throw new Error(`Failed to conduct market analysis: ${error.message}`);
    }
  }

  async analyzeCompetitors(companyName: string, industry: string, description: string, websiteData?: any): Promise<CompetitorAnalysis> {
    try {
      const prompt = `You are a competitive intelligence analyst conducting a comprehensive competitor analysis. Provide specific, actionable competitive insights based on current market research.

TARGET COMPANY ANALYSIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Company: ${companyName}
Industry: ${industry}
Business Model: ${description}

${websiteData ? `
COMPETITIVE INTELLIGENCE FROM WEBSITE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${typeof websiteData === 'string' ? websiteData : JSON.stringify(websiteData).substring(0, 1500)}

Analysis Focus:
- Service/product positioning vs competitors
- Pricing strategy and value proposition
- Technology stack and capabilities
- Customer segments and market approach
- Geographic presence and scale
- Team expertise and company maturity
` : ''}

COMPETITIVE ANALYSIS REQUIREMENTS:
Research the current competitive landscape using industry knowledge and market intelligence. Focus on companies that directly compete for the same customers and market share.

{
  "directCompetitors": [
    {
      "name": "Real competitor company name (not generic)",
      "description": "Specific business model and core offerings that directly overlap",
      "strengths": [
        "Market position advantages (market share, brand recognition, customer base)",
        "Product/service capabilities and differentiators", 
        "Operational advantages (scale, partnerships, distribution)",
        "Financial strengths (funding, revenue, profitability)"
      ],
      "weaknesses": [
        "Market gaps or underserved customer segments",
        "Product limitations or feature gaps",
        "Operational constraints or scalability issues", 
        "Customer complaints or market criticism"
      ],
      "marketPosition": "Specific market position (market leader, challenger, niche player) with estimated market share or revenue range"
    }
  ],
  "indirectCompetitors": [
    {
      "name": "Real company name that competes for same budget/attention",
      "description": "How they solve similar problems with different approaches or serve adjacent use cases",
      "relevance": "Specific threat level and customer overlap (high/medium/low impact on target company's market opportunity)"
    }
  ],
  "competitiveLandscape": "Comprehensive overview of market structure: concentration levels, competitive intensity, barriers to entry, differentiation strategies, and pricing dynamics",
  "competitiveAdvantages": [
    "Specific advantages the target company has over competitors (unique technology, team expertise, customer relationships, cost structure, etc.)",
    "Market positioning opportunities where competitors are weak",
    "First-mover advantages or unique market access"
  ],
  "differentiators": [
    "Clear value propositions that distinguish from direct competitors",
    "Unique capabilities, features, or service approaches", 
    "Customer experience or business model innovations",
    "Market segments where the company can dominate"
  ]
}

COMPETITIVE INTELLIGENCE GUIDELINES:
- Research actual companies currently operating in this market space
- Use specific company names, not generic descriptions
- Focus on companies that customers would compare when making purchase decisions
- Consider both established players and emerging startups
- Analyze competitive moats and sustainable advantages
- Identify white space opportunities where competition is weak
- Consider substitute products/services that solve similar problems
- Base analysis on public information, funding data, and market positioning

Please provide your competitive analysis in JSON format following the structure above.
      `;

      if (!openai) {
        throw new Error('OpenAI is not configured. Please set the OPENAI_API_KEY environment variable.');
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return analysis;
    } catch (error: any) {
      console.error('Competitor analysis error:', error);
      throw new Error(`Failed to analyze competitors: ${error.message}`);
    }
  }

  async conductBusinessResearch(companyName: string, industry: string, description: string, websiteData?: any): Promise<BusinessResearch> {
    try {
      const prompt = `
Conduct comprehensive business research for the following company:

Company: ${companyName}
Industry: ${industry}
Description: ${description}
${websiteData ? `Website Data: ${JSON.stringify(websiteData).substring(0, 1000)}` : ''}

Provide detailed business research in JSON format:
{
  "industryAnalysis": {
    "industryOverview": "Overview of the industry",
    "keyDrivers": ["Key drivers of industry growth"],
    "regulations": ["Relevant regulations and compliance requirements"],
    "barriers": ["Barriers to entry and challenges"]
  },
  "businessModel": {
    "revenueStreams": ["Potential revenue streams"],
    "costStructure": ["Key cost components"],
    "keyPartners": ["Important partnerships and suppliers"],
    "keyActivities": ["Core business activities"]
  },
  "riskAnalysis": {
    "marketRisks": ["Market-related risks"],
    "operationalRisks": ["Operational risks"],
    "financialRisks": ["Financial risks"],
    "mitigationStrategies": ["Risk mitigation strategies"]
  }
}

Base your research on current industry knowledge, best practices, and realistic business scenarios.

Please provide your business research in JSON format following the structure above.
      `;

      if (!openai) {
        throw new Error('OpenAI is not configured. Please set the OPENAI_API_KEY environment variable.');
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return analysis;
    } catch (error: any) {
      console.error('Business research error:', error);
      throw new Error(`Failed to conduct business research: ${error.message}`);
    }
  }

  async generateBusinessInsights(companyName: string, description: string, websiteData?: any, marketAnalysis?: MarketAnalysis, competitorAnalysis?: CompetitorAnalysis, businessResearch?: BusinessResearch) {
    try {
      const prompt = `
You are a senior business strategist and investment analyst generating comprehensive business insights for pitch deck creation. Analyze all available data to provide detailed strategic insights.

COMPREHENSIVE BUSINESS ANALYSIS REQUEST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Company: ${companyName}
Description: ${description}
${websiteData ? `Website Intelligence: ${JSON.stringify(websiteData).substring(0, 800)}` : ''}
${marketAnalysis ? `Market Analysis: ${JSON.stringify(marketAnalysis).substring(0, 1200)}` : ''}
${competitorAnalysis ? `Competitor Analysis: ${JSON.stringify(competitorAnalysis).substring(0, 1200)}` : ''}
${businessResearch ? `Business Research: ${JSON.stringify(businessResearch).substring(0, 1200)}` : ''}

Generate comprehensive business intelligence with specific, actionable insights for investors and strategic decision-making. Return detailed JSON analysis:

{
  "businessDescription": "Comprehensive 2-3 sentence description of what the company does, who it serves, and its core mission statement",
  "problemStatement": "Specific, quantifiable problem being solved with market evidence - include size of problem, current pain points, cost of status quo, and urgency factors",
  "valueProposition": "Clear, differentiated value proposition with specific benefits, quantifiable outcomes, and unique advantages over alternatives",
  "keyBusinessInsights": [
    "Critical insights about market opportunity and competitive positioning",
    "Key factors that drive business success and customer adoption", 
    "Important trends or dynamics that create advantage or risk",
    "Strategic insights about timing, market conditions, or competitive dynamics"
  ],
  "competitiveAdvantages": [
    "Specific competitive advantages with supporting evidence",
    "Unique capabilities, technology, or market positions that are defensible",
    "Proprietary assets, intellectual property, or exclusive partnerships",
    "Network effects, data advantages, or other moats"
  ],
  "investmentThesis": "Compelling 3-4 sentence investment narrative covering market size, competitive advantage, team capability, growth potential, and ROI expectations",
  "goToMarketStrategy": {
    "customerSegments": ["Primary target customer segments with specific characteristics"],
    "acquisitionChannels": ["Customer acquisition channels with rationale"],
    "salesStrategy": "Approach to selling and customer conversion",
    "marketingApproach": ["Marketing strategies and messaging approaches"],
    "partnerships": ["Strategic partnerships for growth and distribution"]
  },
  "businessModel": {
    "revenueStreams": ["Primary and secondary revenue generation methods"],
    "pricingStrategy": "Pricing approach and value capture model", 
    "unitEconomics": "Customer acquisition cost and lifetime value dynamics",
    "scalabilityFactors": ["Key factors that enable business scaling and growth"]
  },
  "riskAnalysis": {
    "marketRisks": ["Market timing, adoption, economic sensitivity risks"],
    "competitiveRisks": ["Competitive responses, disruption, market share threats"],
    "executionRisks": ["Team, technology, operational execution challenges"],
    "mitigationStrategies": ["Specific strategies to address and minimize key risks"]
  },
  "strategicRecommendations": [
    "Priority actions to accelerate growth and market success",
    "Strategic initiatives for competitive positioning", 
    "Operational improvements for efficiency and scaling",
    "Investment priorities for maximum business impact"
  ],
  "keySuccessMetrics": ["Most important KPIs and success metrics that indicate business progress and health"],
  "scalingOpportunities": [
    "Geographic expansion opportunities with market rationale",
    "Product or service expansion possibilities",
    "Market segment expansion strategies",
    "Technology or capability enhancements for growth"
  ]
}

ENHANCED ANALYSIS REQUIREMENTS:
- Provide specific, actionable insights rather than generic business advice
- Include quantifiable claims when possible with supporting reasoning
- Connect insights to pitch deck narrative and investor appeal
- Balance optimistic opportunities with realistic risk assessment
- Focus on insights that differentiate this business from competitors
- Consider both near-term execution and long-term strategic vision
- Reference specific market conditions, customer needs, or competitive dynamics

Return comprehensive JSON analysis with rich, specific details in every field suitable for professional pitch deck development.`;

      if (!openai) {
        throw new Error('OpenAI is not configured. Please set the OPENAI_API_KEY environment variable.');
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 3500,
        temperature: 0.3
      });

      const insights = JSON.parse(response.choices[0].message.content || '{}');
      return insights;
    } catch (error: any) {
      console.error('Business insights generation error:', error);
      throw new Error(`Failed to generate business insights: ${error.message}`);
    }
  }
}