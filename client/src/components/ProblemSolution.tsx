import { Clock, DollarSign, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProblemSolution() {
  const painPoints = [
    {
      icon: Clock,
      title: "Weeks of Work",
      description: "Traditional pitch decks take countless hours to research, design, and refine."
    },
    {
      icon: DollarSign,
      title: "Expensive Designers",
      description: "Hiring professional designers and consultants costs thousands of dollars."
    },
    {
      icon: FileQuestion,
      title: "Inconsistent Quality",
      description: "DIY approaches often result in unprofessional presentations that fail to impress."
    }
  ];

  return (
    <section className="py-20 px-6 lg:px-8" data-testid="section-problem-solution">
      <div className="max-w-4xl mx-auto text-center space-y-16">
        <div className="space-y-6">
          <Badge variant="secondary" data-testid="badge-challenge">The Challenge</Badge>
          <h2 className="text-4xl md:text-5xl font-bold" data-testid="text-problem-title">
            Building a Pitch Deck Shouldn't Take Weeks
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {painPoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <div key={index} className="space-y-4" data-testid={`card-pain-point-${index}`}>
                <div className="w-16 h-16 mx-auto rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Icon className="w-8 h-8 text-destructive" />
                </div>
                <h3 className="text-xl font-semibold" data-testid={`text-pain-title-${index}`}>
                  {point.title}
                </h3>
                <p className="text-muted-foreground" data-testid={`text-pain-desc-${index}`}>
                  {point.description}
                </p>
              </div>
            );
          })}
        </div>
        
        <p className="text-lg text-muted-foreground border-t border-border pt-8" data-testid="text-solution-intro">
          <span className="font-semibold text-foreground">VestMe.ai solves this</span> with intelligent automation that analyzes your business, generates professional content, and creates investor-ready presentations in minutes.
        </p>
      </div>
    </section>
  );
}

