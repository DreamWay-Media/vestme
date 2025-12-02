import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProductDemo() {
  const features = [
    { title: "Drag-and-drop slide builder", description: "Intuitive interface for easy customization" },
    { title: "AI-powered content generation", description: "Smart suggestions based on your business" },
    { title: "Real-time preview", description: "See changes instantly as you work" },
    { title: "Export to multiple formats", description: "PDF, PowerPoint, and Google Slides" }
  ];

  return (
    <section className="py-32 px-6 lg:px-8" data-testid="section-product-demo">
      <div className="max-w-7xl mx-auto text-center">
        
        
        <div className="space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold" data-testid="text-demo-title">
            Professional pitch decks, made simple
          </h2>
          
          <div className="space-y-4 text-center">
            {features.map((feature, index) => (
              <div key={index} className="" data-testid={`feature-item-${index}`}>
                
                <div>
                  <p className="font-semibold text-lg" data-testid={`text-feature-title-${index}`}>
                    {feature.title}
                  </p>
                  <p className="text-muted-foreground" data-testid={`text-feature-desc-${index}`}>
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="gap-2" 
            data-testid="button-explore-features"
            onClick={() => {
              const featuresSection = document.getElementById('features');
              featuresSection?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Explore All Features
          </Button>
        </div>
      </div>
    </section>
  );
}

