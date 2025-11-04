import { ArrowRight } from "lucide-react";
import { GoogleLogin } from "./GoogleLogin";

export default function FinalCTA() {
  return (
    <section className="py-24 px-6 lg:px-8 bg-muted/30" data-testid="section-final-cta">
      <div className="max-w-5xl mx-auto text-center space-y-8">
        <h2 className="text-4xl md:text-5xl font-bold" data-testid="text-final-cta-title">
          Ready to Create Your Perfect Pitch?
        </h2>
        
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto" data-testid="text-final-cta-subtitle">
          Join thousands of entrepreneurs who have created winning pitch decks with VestMe.ai. Start your free trial today and see the difference AI can make.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <GoogleLogin 
            variant="primary"
            className="gap-2 text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors shadow-lg hover:shadow-xl"
          >
            Start Building Your Deck
            <ArrowRight className="w-5 h-5" />
          </GoogleLogin>
        </div>
        
        <p className="text-sm text-muted-foreground" data-testid="text-final-trust-line">
          No credit card required • Free trial available • Cancel anytime
        </p>
      </div>
    </section>
  );
}
