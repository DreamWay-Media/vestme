import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface RevenueProjection {
  year1: {
    revenue: number;
    customers: number;
    avgRevenuePerCustomer: number;
    monthlyGrowthRate: number;
  };
  year2: {
    revenue: number;
    customers: number;
    avgRevenuePerCustomer: number;
    monthlyGrowthRate: number;
  };
  year3: {
    revenue: number;
    customers: number;
    avgRevenuePerCustomer: number;
    monthlyGrowthRate: number;
  };
  assumptions: {
    customerAcquisitionCost: number;
    churnRate: number;
    marketPenetration: number;
    pricingModel: string;
    seasonalityFactors: string[];
  };
  scenarios: {
    conservative: { year1: number; year2: number; year3: number };
    base: { year1: number; year2: number; year3: number };
    optimistic: { year1: number; year2: number; year3: number };
  };
}

export interface FinancialAnalysis {
  revenueProjections: RevenueProjection;
  fundingRequirements: {
    initialCapital: number;
    burnRate: number;
    runwayMonths: number;
    fundingStage: string;
    useOfFunds: Array<{ category: string; percentage: number; amount: number }>;
  };
  keyMetrics: {
    ltv: number; // Lifetime Value
    cac: number; // Customer Acquisition Cost
    ltvCacRatio: number;
    grossMargin: number;
    unitEconomics: string;
  };
  riskFactors: string[];
  milestones: Array<{ metric: string; target: number; timeline: string }>;
}

export class FinancialAnalyzer {
  async generateRevenueProjections(
    businessModel: string,
    targetMarket: string,
    marketSize: string,
    industry: string,
    websiteData?: any
  ): Promise<FinancialAnalysis> {
    try {
      const prompt = `You are a financial analyst creating data-driven revenue projections. Generate realistic financial forecasts based on industry benchmarks and business fundamentals.

BUSINESS CONTEXT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Business Model: ${businessModel}
Target Market: ${targetMarket}
Market Size: ${marketSize}
Industry: ${industry}

${websiteData ? `
WEBSITE INTELLIGENCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Website insights: ${JSON.stringify(websiteData).substring(0, 1000)}
` : ''}

FINANCIAL ANALYSIS REQUIREMENTS:
Create comprehensive financial projections using industry benchmarks and realistic growth assumptions. Base all projections on:

1. Industry-standard customer acquisition costs
2. Typical conversion rates for the business model
3. Market-appropriate pricing strategies
4. Realistic growth trajectories based on comparable companies
5. Standard operating expense ratios

ANTI-HALLUCINATION PROTOCOL FOR FINANCIAL DATA:
- Use industry average ranges, not specific fabricated numbers
- Mark all assumptions clearly: "Based on industry benchmark" or "Estimated using comparable analysis"
- Provide conservative, base, and optimistic scenarios with reasoning
- Reference pricing model realism against market standards
- Never invent specific competitor financial data

Required JSON format:
{
  "revenueProjections": {
    "year1": {
      "revenue": "Conservative first-year revenue based on customer acquisition timeline",
      "customers": "Realistic customer count based on market penetration rates",
      "avgRevenuePerCustomer": "Industry-appropriate ARPC based on business model",
      "monthlyGrowthRate": "Sustainable growth rate percentage"
    },
    "year2": {
      "revenue": "Second year revenue assuming scaling operations",
      "customers": "Customer growth accounting for acquisition and retention",
      "avgRevenuePerCustomer": "ARPC growth through upselling/pricing optimization",
      "monthlyGrowthRate": "Sustained growth rate with market saturation factors"
    },
    "year3": {
      "revenue": "Third year revenue with market maturity considerations",
      "customers": "Customer base accounting for competition and market limits",
      "avgRevenuePerCustomer": "Mature ARPC levels",
      "monthlyGrowthRate": "Stabilized growth rate"
    },
    "assumptions": {
      "customerAcquisitionCost": "Industry benchmark CAC for this business model",
      "churnRate": "Typical annual churn rate percentage for industry/model",
      "marketPenetration": "Realistic market share achievable",
      "pricingModel": "Validated pricing strategy",
      "seasonalityFactors": ["Relevant seasonal business impacts"]
    },
    "scenarios": {
      "conservative": {"year1": "Conservative case revenue", "year2": "Conservative year 2", "year3": "Conservative year 3"},
      "base": {"year1": "Base case revenue", "year2": "Base year 2", "year3": "Base year 3"},
      "optimistic": {"year1": "Optimistic case revenue", "year2": "Optimistic year 2", "year3": "Optimistic year 3"}
    }
  },
  "fundingRequirements": {
    "initialCapital": "Capital needed for first 18-24 months based on business plan",
    "burnRate": "Monthly cash burn rate including all operating expenses",
    "runwayMonths": "Months of operation with initial capital",
    "fundingStage": "Appropriate funding stage (Pre-seed, Seed, Series A, etc.)",
    "useOfFunds": [
      {"category": "Product Development", "percentage": 30, "amount": "Amount allocated"},
      {"category": "Sales & Marketing", "percentage": 40, "amount": "Amount for customer acquisition"},
      {"category": "Operations & Overhead", "percentage": 20, "amount": "Amount for operations"},
      {"category": "Working Capital", "percentage": 10, "amount": "Amount for cash reserves"}
    ]
  },
  "keyMetrics": {
    "ltv": "Customer lifetime value based on retention and ARPC",
    "cac": "Blended customer acquisition cost across channels",
    "ltvCacRatio": "LTV:CAC ratio (should be 3:1 or higher)",
    "grossMargin": "Gross margin percentage typical for business model",
    "unitEconomics": "Summary of per-customer profitability"
  },
  "riskFactors": [
    "Market adoption risks specific to industry/model",
    "Competition and pricing pressure risks",
    "Customer acquisition scalability challenges",
    "Regulatory or compliance risks if applicable"
  ],
  "milestones": [
    {"metric": "Revenue milestone", "target": "Specific target number", "timeline": "Realistic timeframe"},
    {"metric": "Customer milestone", "target": "Customer count target", "timeline": "Achievement timeline"},
    {"metric": "Product milestone", "target": "Product development goal", "timeline": "Development timeline"}
  ]
}

CRITICAL VALIDATION REQUIREMENTS:
- Ensure all revenue numbers align with customer count and ARPC
- Validate growth rates are sustainable and industry-appropriate
- Confirm LTV:CAC ratios meet investor standards (3:1 minimum)
- Verify funding requirements match projected burn rates
- Cross-check all assumptions against industry benchmarks

Generate realistic, investor-grade financial projections with clear reasoning for all assumptions.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a senior financial analyst specializing in startup financial modeling and revenue projections. Create realistic, investor-grade financial forecasts based on industry data and market analysis."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2, // Low temperature for factual financial analysis
        max_tokens: 3000,
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return analysis as FinancialAnalysis;
    } catch (error: any) {
      console.error('Financial analysis error:', error);
      throw new Error(`Failed to generate financial analysis: ${error.message}`);
    }
  }

  async validateBusinessMetrics(
    revenueProjections: any,
    marketSize: string,
    businessModel: string
  ): Promise<{ isRealistic: boolean; concerns: string[]; recommendations: string[] }> {
    try {
      const prompt = `Validate the following revenue projections for realism and investor credibility:

PROJECTIONS TO VALIDATE:
${JSON.stringify(revenueProjections, null, 2)}

Market Context: ${marketSize}
Business Model: ${businessModel}

Provide validation analysis in JSON format:
{
  "isRealistic": true/false,
  "concerns": ["List specific concerns with the projections"],
  "recommendations": ["Specific improvements to make projections more credible"]
}

Check for:
1. Growth rates that exceed industry norms
2. Market penetration assumptions that are too aggressive
3. Customer acquisition timelines that are unrealistic
4. Revenue per customer that doesn't match business model
5. LTV:CAC ratios that investors would question

Provide fact-based assessment with reasoning.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 1000,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error: any) {
      console.error('Validation error:', error);
      throw new Error(`Failed to validate projections: ${error.message}`);
    }
  }
}