import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";
import { GoogleLogin } from "./GoogleLogin";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center py-20 px-6 lg:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
        <div className="space-y-8">
          <Badge variant="secondary" className="gap-2" data-testid="badge-ai-powered">
            <Sparkles className="w-3 h-3" />
            AI-Powered Pitch Deck Generator
          </Badge>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight" data-testid="text-hero-title">
            Turn Your Startup Idea Into{" "}
            <span className="text-primary">Investor-Ready</span> Pitch Decks
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl" data-testid="text-hero-subtitle">
            Create professional startup pitch projects with AI-powered business analysis, brand customization, and investor outreach tools. Turn your ideas into presentations in minutes.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <GoogleLogin 
              variant="primary"
              className="gap-2 text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </GoogleLogin>
          </div>
          
          <p className="text-sm text-muted-foreground" data-testid="text-trust-line">
            No credit card required • Free trial available • 10,000+ decks created
          </p>
        </div>
        
        <div className="relative" data-testid="image-hero-dashboard">
          <div className="relative rounded-xl overflow-hidden shadow-2xl border border-border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <img 
              src="/images/dashboard-preview.png" 
              alt="VestMe.ai Analytics Dashboard"
              className="w-full h-auto object-cover"
              onError={(e) => {
                // Fallback to showing placeholder if image doesn't load
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="aspect-video flex items-center justify-center"><p class="text-muted-foreground text-lg">Dashboard Preview</p></div>';
                }
              }}
            />
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute -top-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        </div>
      </div>
    </section>
  );
}
