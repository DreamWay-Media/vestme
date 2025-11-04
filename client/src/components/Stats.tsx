import { FileText, Star, TrendingUp, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Stats() {
  const stats = [
    {
      icon: FileText,
      number: "10,000+",
      label: "Decks Created"
    },
    {
      icon: Star,
      number: "4.9/5",
      label: "User Rating"
    },
    {
      icon: TrendingUp,
      number: "85%",
      label: "Funding Success"
    }
  ];

  return (
    <section className="py-20 px-6 lg:px-8" data-testid="section-stats">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center max-w-5xl mx-auto">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="p-8 text-center space-y-3" data-testid={`card-stat-${index}`}>
                <div className="w-12 h-12 mx-auto rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div className="font-mono text-4xl md:text-5xl font-bold" data-testid={`text-stat-number-${index}`}>
                  {stat.number}
                </div>
                <div className="text-muted-foreground font-medium" data-testid={`text-stat-label-${index}`}>
                  {stat.label}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

