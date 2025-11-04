export default function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Discovery",
      description: "Share your business information and upload documents for AI analysis"
    },
    {
      number: "2",
      title: "Brand Kit",
      description: "Create your brand identity with custom colors, fonts, and logos"
    },
    {
      number: "3",
      title: "Generate Pitch Deck",
      description: "AI creates your professional pitch deck with investor-ready content"
    },
    {
      number: "4",
      title: "Share & Track",
      description: "Launch campaigns and monitor investor engagement with analytics"
    }
  ];

  return (
    <section className="py-24 px-6 lg:px-8 bg-muted/30" data-testid="section-how-it-works" id="how-it-works">
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold" data-testid="text-how-it-works-title">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-how-it-works-subtitle">
            Create your perfect pitch project in just 4 simple steps
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative space-y-6" data-testid={`step-${index}`}>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-20 left-[60%] w-full h-0.5 bg-border -z-10" />
              )}
              
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold" data-testid={`step-number-${index}`}>
                  {step.number}
                </div>
                
                <div className="w-32 h-32 rounded-lg bg-background border border-border p-4 flex items-center justify-center">
                  <div className="text-4xl">{["🔍", "🎨", "📊", "🚀"][index]}</div>
                </div>
                
                <h3 className="text-xl font-semibold" data-testid={`step-title-${index}`}>
                  {step.title}
                </h3>
                
                <p className="text-muted-foreground text-sm" data-testid={`step-desc-${index}`}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

