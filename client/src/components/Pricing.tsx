import { useState } from "react";
import { Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GoogleLogin } from "./GoogleLogin";

export default function Pricing() {
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: "Starter",
      price: { monthly: 0, yearly: 0 },
      description: "Perfect for trying out VestMe.ai",
      popular: false,
      features: [
        "1 project generation",
        "1 Brand Kit",
        "AI analysis",
        "Professional presentations",
        "Basic templates"
      ]
    },
    {
      name: "Professional",
      price: { monthly: 29, yearly: 23 },
      description: "Everything you need to create winning pitches",
      popular: true,
      features: [
        "Unlimited Project generation",
        "Unlimited brand kits",
        "AI analysis",
        "CRM & contact management",
        "Analytics & tracking",
        "Audience Segmentation",
        "Campaign Analytics",
        "Priority support",
        "Export to all formats"
      ]
    }
  ];

  return (
    <section className="py-32 px-6 lg:px-8 bg-muted/30" data-testid="section-pricing" id="pricing">
      <div className="max-w-6xl mx-auto space-y-16">
        <div className="text-center space-y-6">
          <h2 className="text-4xl md:text-5xl font-bold" data-testid="text-pricing-title">
            Choose the plan that works for you
          </h2>
          <p className="text-lg text-muted-foreground" data-testid="text-pricing-subtitle">
            Start free and upgrade as you grow. All plans include our core features.
          </p>
          
          <div className="inline-flex items-center gap-3 p-1 bg-background rounded-lg border border-border">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                !isYearly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"
              }`}
              data-testid="button-monthly"
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2 ${
                isYearly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"
              }`}
              data-testid="button-yearly"
            >
              Yearly
              <Badge variant="secondary" className="text-xs">Save 20%</Badge>
            </button>
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <Card 
              key={index} 
              className={`relative ${plan.popular ? "border-2 border-primary shadow-lg" : ""}`}
              data-testid={`card-plan-${index}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1" data-testid="badge-most-popular">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="space-y-4 p-8">
                <CardTitle className="text-2xl" data-testid={`text-plan-name-${index}`}>
                  {plan.name}
                </CardTitle>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold" data-testid={`text-plan-price-${index}`}>
                    ${isYearly ? plan.price.yearly : plan.price.monthly}
                  </span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <CardDescription className="text-base" data-testid={`text-plan-desc-${index}`}>
                  {plan.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-8 pt-0">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex gap-3" data-testid={`feature-${index}-${featureIndex}`}>
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              
              <CardFooter className="p-8 pt-0">
                {plan.popular ? (
                  <GoogleLogin 
                    variant="primary"
                    className="w-full py-3 text-base bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors shadow-md hover:shadow-lg"
                  >
                    Get Professional
                  </GoogleLogin>
                ) : (
                  <GoogleLogin 
                    variant="outline"
                    className="w-full py-3 text-base bg-background hover:bg-accent text-foreground border border-input rounded-md font-medium transition-colors"
                  >
                    Get Started Free
                  </GoogleLogin>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
