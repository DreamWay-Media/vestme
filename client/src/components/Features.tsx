import { Brain, Palette, Users, Layout, GitBranch, BarChart3, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Features() {
  const features = [
    {
      icon: Brain,
      title: "AI Business Analysis",
      description: "Advanced AI analyzes your business information, website, and market data to create comprehensive insights and recommendations.",
      link: "Learn more"
    },
    {
      icon: Palette,
      title: "Brand Customization",
      description: "Create custom brand kits with your colors, fonts, logos, and assets for consistent, professional presentations.",
      link: "Learn more"
    },
    {
      icon: Users,
      title: "Investor Outreach",
      description: "Built-in CRM and campaign tools to manage contacts, track engagement, and optimize your pitch deck performance.",
      link: "Learn more"
    },
    {
      icon: Layout,
      title: "Smart Templates",
      description: "Choose from hundreds of professionally designed templates optimized for different industries and use cases.",
      link: "Learn more"
    },
    {
      icon: GitBranch,
      title: "Real-time Collaboration",
      description: "Work together with your team in real-time, with version control and commenting features built-in.",
      link: "Learn more"
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track views, engagement, and investor interest with detailed analytics and actionable insights.",
      link: "Learn more"
    }
  ];

  return (
    <section className="py-24 px-6 lg:px-8 bg-muted/30" data-testid="section-features" id="features">
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold" data-testid="text-features-title">
            Everything you need to create winning pitch decks
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto" data-testid="text-features-subtitle">
            Our comprehensive platform combines AI intelligence with professional design tools to help you create investor-ready presentations.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="hover-elevate transition-transform duration-200" data-testid={`card-feature-${index}`}>
                <CardHeader className="space-y-4 p-8">
                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-2xl" data-testid={`text-feature-title-${index}`}>
                    {feature.title}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed" data-testid={`text-feature-desc-${index}`}>
                    {feature.description}
                  </CardDescription>
                  <Button variant="ghost" className="w-fit p-0 h-auto gap-1 text-primary" data-testid={`button-feature-link-${index}`}>
                    {feature.link}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

