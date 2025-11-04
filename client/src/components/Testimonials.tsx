import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Testimonials() {
  const testimonials = [
    {
      quote: "VestMe.ai helped us create a pitch deck that secured $2M in seed funding. The AI analysis was incredibly thorough and the templates were stunning.",
      name: "Sarah Chen",
      role: "CEO",
      company: "TechStart Inc"
    },
    {
      quote: "I've tried other pitch deck tools, but nothing comes close to VestMe.ai. The brand customization and investor tracking features are game-changers.",
      name: "Marcus Johnson",
      role: "Founder",
      company: "Growth Labs"
    },
    {
      quote: "What used to take weeks now takes hours. The AI does the heavy lifting while we focus on refining our message. Absolutely worth it.",
      name: "Alex Rivera",
      role: "Co-founder",
      company: "Innovation Hub"
    }
  ];

  return (
    <section className="py-24 px-6 lg:px-8" data-testid="section-testimonials">
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold" data-testid="text-testimonials-title">
            Trusted by founders worldwide
          </h2>
          <p className="text-lg text-muted-foreground" data-testid="text-testimonials-subtitle">
            See what entrepreneurs are saying about VestMe.ai
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-8 space-y-6" data-testid={`card-testimonial-${index}`}>
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                ))}
              </div>
              
              <p className="text-lg italic leading-relaxed" data-testid={`text-testimonial-quote-${index}`}>
                "{testimonial.quote}"
              </p>
              
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <Avatar className="w-12 h-12">
                  <AvatarFallback>{testimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold" data-testid={`text-testimonial-name-${index}`}>
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid={`text-testimonial-role-${index}`}>
                    {testimonial.role} at {testimonial.company}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

