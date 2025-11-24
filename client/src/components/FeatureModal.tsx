import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { GoogleLogin } from "./GoogleLogin";

interface FeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureId: string;
}

export default function FeatureModal({ isOpen, onClose, featureId }: FeatureModalProps) {
  const features = {
    "ai-business-analysis": {
      title: "AI Business Analysis",
      subtitle: "Powered by GPT-4o for Comprehensive Business Intelligence",
      description: "Our advanced AI engine analyzes your business from every angle to create investor-ready insights.",
      capabilities: [
        {
          title: "Intelligent Website Crawling",
          description: "Automatically extracts key information from your company website including products, services, team info, and company mission."
        },
        {
          title: "Comprehensive Market Analysis",
          description: "Analyzes your Total Addressable Market (TAM), Serviceable Addressable Market (SAM), and Serviceable Obtainable Market (SOM) with data-driven projections."
        },
        {
          title: "Competitive Intelligence",
          description: "Identifies your key competitors, analyzes their strengths and weaknesses, and highlights your competitive advantages in the market."
        },
        {
          title: "Financial Projections",
          description: "Generates realistic revenue projections, customer acquisition models, and key metrics (LTV:CAC ratios) that investors expect to see."
        },
        {
          title: "Business Model Analysis",
          description: "Evaluates your revenue streams, cost structure, key partnerships, and core business activities to validate your business model."
        },
        {
          title: "Industry Research",
          description: "Provides insights on industry trends, regulatory requirements, growth opportunities, and potential market challenges specific to your sector."
        }
      ],
      howItWorks: [
        "Input your business information during the Discovery stage",
        "Provide your website URL for automatic crawling",
        "Upload supporting documents (pitch decks, business plans, financial data)",
        "AI analyzes everything using GPT-4o",
        "Receive comprehensive business profile with investor-ready insights",
        "Use insights to generate professional pitch deck content"
      ],
      realData: {
        title: "Real AI Power",
        points: [
          "Uses OpenAI GPT-4o model for most accurate analysis",
          "Processes market data, competitor information, and industry trends",
          "Generates factual projections based on industry benchmarks",
          "Validates financial metrics for investor credibility",
          "Continuously learns from successful pitch patterns"
        ]
      }
    },
    "brand-customization": {
      title: "Brand Customization",
      subtitle: "Create Professional Brand Kits in Minutes",
      description: "Build cohesive brand identities with AI-powered design suggestions tailored to your industry.",
      capabilities: [
        {
          title: "AI-Powered Brand Suggestions",
          description: "Get industry-specific color palettes, font recommendations, and design guidelines based on your business profile."
        },
        {
          title: "Automatic Brand Extraction",
          description: "Upload your website URL and our AI automatically extracts your existing brand colors, fonts, logos, and design elements."
        },
        {
          title: "Custom Color Palettes",
          description: "Define primary, secondary, and accent colors that reflect your brand personality. Includes automatic accessibility validation."
        },
        {
          title: "Typography Library",
          description: "Choose from professional font families (Inter, Roboto, Open Sans, Source Sans Pro) with complete weight options."
        },
        {
          title: "Logo & Asset Management",
          description: "Upload and manage multiple logo variants, product images, and brand assets in one centralized media library."
        },
        {
          title: "Brand Guidelines",
          description: "Automatically generates brand usage guidelines including color swatches, typography rules, and logo specifications."
        }
      ],
      howItWorks: [
        "Start with AI-suggested brand kit based on your industry",
        "Provide website URL to extract existing brand elements",
        "Customize colors, fonts, and upload your logo",
        "AI validates color contrast for accessibility",
        "Save multiple brand kit variations",
        "Automatically apply brand kit to all pitch deck slides"
      ],
      realData: {
        title: "Industry-Specific Palettes",
        points: [
          "Technology: Professional blues with clean typography (Inter)",
          "Healthcare: Calming teals that inspire confidence (Source Sans Pro)",
          "Finance: Conservative deep blues for trust (Roboto)",
          "E-commerce: Energetic greens with conversion-focused accents",
          "Creative: Bold purples with modern design aesthetics",
          "SaaS: Tech-forward blues with accessible contrast ratios"
        ]
      }
    },
    "investor-outreach": {
      title: "Investor Outreach & CRM",
      subtitle: "Manage Contacts, Launch Campaigns, Track Engagement",
      description: "Complete investor relationship management with campaign automation and real-time analytics.",
      capabilities: [
        {
          title: "Contact Management",
          description: "Import investors from CSV, add individual contacts, and organize with custom tags and notes for easy segmentation."
        },
        {
          title: "Audience Segmentation",
          description: "Create targeted audience groups based on industry, investment stage, geography, or custom criteria for personalized outreach."
        },
        {
          title: "Email Campaign Builder",
          description: "Pre-built templates for cold outreach, follow-ups, and event invitations. Customize messages with dynamic variables."
        },
        {
          title: "Campaign Analytics",
          description: "Track email opens, clicks, and responses in real-time. See which investors are most engaged with your pitch deck."
        },
        {
          title: "Automated Follow-ups",
          description: "Set up multi-touch sequences with automated follow-ups based on investor engagement and response behavior."
        },
        {
          title: "Performance Tracking",
          description: "Monitor campaign performance with metrics including sent count, open rate, click rate, and response rate across all campaigns."
        }
      ],
      howItWorks: [
        "Import your investor contact list via CSV or add manually",
        "Create audience segments (e.g., 'Series A VCs', 'Angel Investors')",
        "Choose from pre-built campaign templates or create custom messages",
        "Attach your pitch deck and set up your campaign",
        "Launch campaign and track opens/clicks in real-time",
        "Follow up with engaged investors based on analytics"
      ],
      realData: {
        title: "Campaign Templates",
        points: [
          "Cold Email Sequence: 3-email series for initial outreach",
          "Follow-up Series: Nurture engaged prospects with updates",
          "Event Invitations: Invite investors to demo days or meetings",
          "Status tracking: Draft, Scheduled, Sent, Completed",
          "Real-time notifications when investors open your deck",
          "Integration with SendGrid for reliable email delivery"
        ]
      }
    },
    "smart-templates": {
      title: "Smart Templates",
      subtitle: "Professional Slide Templates with Brand Integration",
      description: "Choose from 8 professionally designed slide templates that automatically adapt to your brand kit.",
      capabilities: [
        {
          title: "Template Library",
          description: "Access 8 professionally designed templates: Hero Title, Bullet List, Call to Action, Minimal Title, Two Column, Feature Grid, Problem/Solution, and Stats Showcase."
        },
        {
          title: "Automatic Brand Application",
          description: "Templates automatically apply your brand colors, fonts, and styling for consistent professional presentations."
        },
        {
          title: "Tiered Access",
          description: "3 templates free forever (Hero Title, Bullet List, Call to Action). Upgrade for 5 additional premium templates."
        },
        {
          title: "Visual Template Designer",
          description: "Canva-like drag-and-drop editor for admins to create custom templates with 13 element types (text, images, shapes, charts)."
        },
        {
          title: "Industry Optimization",
          description: "Templates designed for different use cases: title slides, content slides, data visualization, and closing CTAs."
        },
        {
          title: "Responsive Elements",
          description: "All template elements automatically adjust sizing and positioning based on your content and brand requirements."
        }
      ],
      howItWorks: [
        "Browse template library during deck generation",
        "Preview how each template looks with your brand",
        "Select templates for different slide types",
        "AI automatically populates templates with your content",
        "Customize individual slides with WYSIWYG editor",
        "Export final deck to PDF, PowerPoint, or Google Slides"
      ],
      realData: {
        title: "Available Templates",
        points: [
          "Hero Title - Bold opening slides with large headlines",
          "Bullet List - Clean content presentation with lists",
          "Call to Action - Conversion-focused closing slides",
          "Minimal Title - Modern, minimal design aesthetic [Premium]",
          "Two Column - Side-by-side content layouts [Premium]",
          "Feature Grid - Showcase multiple features/benefits [Premium]",
          "Problem/Solution - Contrast-driven storytelling [Premium]",
          "Stats Showcase - Data-driven impact slides [Premium]"
        ]
      }
    },
    "collaboration": {
      title: "Real-time Collaboration",
      subtitle: "Work Together Seamlessly on Pitch Decks",
      description: "Collaborate with your team in real-time with version control and activity tracking.",
      capabilities: [
        {
          title: "Multi-User Editing",
          description: "Multiple team members can work on the same pitch deck simultaneously with real-time updates and conflict resolution."
        },
        {
          title: "Activity Tracking",
          description: "Complete activity log tracks all changes: who edited what, when, and what was changed for full transparency."
        },
        {
          title: "Comment System",
          description: "Leave comments on specific slides or elements for feedback and discussion without cluttering the main content."
        },
        {
          title: "Version History",
          description: "Automatic version tracking lets you view previous versions and restore earlier iterations if needed."
        },
        {
          title: "Role-Based Access",
          description: "Control who can view, edit, or manage your pitch decks with granular permission settings."
        },
        {
          title: "Real-time Notifications",
          description: "Get instant notifications when team members make changes, leave comments, or complete key milestones."
        }
      ],
      howItWorks: [
        "Invite team members to your project via email",
        "Set permission levels (Viewer, Editor, Admin)",
        "Team members access shared workspace",
        "All changes sync in real-time across all users",
        "Review activity log to see what changed",
        "Restore previous versions if needed"
      ],
      realData: {
        title: "Collaboration Features",
        points: [
          "Activity logging tracks all user actions",
          "Real-time sync powered by modern web technologies",
          "Conflict-free simultaneous editing",
          "Complete audit trail for compliance",
          "User attribution for all changes",
          "Instant updates without page refresh"
        ]
      }
    },
    "analytics": {
      title: "Analytics Dashboard",
      subtitle: "Track Performance and Investor Engagement",
      description: "Comprehensive analytics to measure your pitch deck performance and optimize investor outreach.",
      capabilities: [
        {
          title: "Deck View Tracking",
          description: "Track how many times your pitch deck has been viewed, by whom, and which slides get the most attention."
        },
        {
          title: "Campaign Performance",
          description: "Monitor email campaign metrics: sent count, open rate, click-through rate, and response rate across all campaigns."
        },
        {
          title: "Engagement Analytics",
          description: "See average engagement rates, identify hot leads based on interaction patterns, and prioritize follow-ups."
        },
        {
          title: "Download Tracking",
          description: "Know when investors download your pitch deck and track which versions are most popular."
        },
        {
          title: "Project Dashboard",
          description: "Centralized dashboard shows all key metrics: total projects, generated decks, campaigns sent, and total views."
        },
        {
          title: "Activity Timeline",
          description: "Visual timeline of all project activities including deck views, campaign sends, and team actions."
        }
      ],
      howItWorks: [
        "Analytics automatically tracked from the moment you create a project",
        "View project-level analytics in the project dashboard",
        "Track campaign performance in the campaign manager",
        "Monitor investor engagement in real-time",
        "Export analytics data for reporting",
        "Use insights to optimize your outreach strategy"
      ],
      realData: {
        title: "Key Metrics Tracked",
        points: [
          "Total Views: Number of times your deck has been opened",
          "Total Downloads: How many times deck was downloaded",
          "Campaigns Sent: Total email campaigns launched",
          "Open Rate: Percentage of emails opened by recipients",
          "Click Rate: Percentage who clicked through to view deck",
          "Engagement Rate: Average time spent viewing your deck"
        ]
      }
    }
  };

  const feature = features[featureId as keyof typeof features];

  if (!feature) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold">{feature.title}</DialogTitle>
          <DialogDescription className="text-lg">
            {feature.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Overview */}
          <div>
            <p className="text-base text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </div>

          {/* Capabilities */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Key Capabilities</h3>
            <div className="grid gap-4">
              {feature.capabilities.map((capability, index) => (
                <div key={index} className="flex gap-3 p-4 rounded-lg border border-border bg-muted/30">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">{capability.title}</h4>
                    <p className="text-sm text-muted-foreground">{capability.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">How It Works</h3>
            <div className="space-y-2">
              {feature.howItWorks.map((step, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <Badge variant="secondary" className="mt-0.5 font-mono">
                    {index + 1}
                  </Badge>
                  <p className="text-sm text-muted-foreground flex-1">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Real Data Section */}
          <div className="space-y-4 p-6 rounded-lg bg-primary/5 border border-primary/20">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-primary">⚡</span> {feature.realData.title}
            </h3>
            <ul className="space-y-2">
              {feature.realData.points.map((point, index) => (
                <li key={index} className="flex gap-2 items-start text-sm">
                  <ArrowRight className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4 pt-4 border-t border-border">
            <p className="text-center text-muted-foreground">
              Ready to experience this feature in action?
            </p>
            <GoogleLogin 
              variant="primary"
              className="gap-2 px-8 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors shadow-lg"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </GoogleLogin>
            <p className="text-xs text-muted-foreground">
              No credit card required • 3 templates free forever
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



