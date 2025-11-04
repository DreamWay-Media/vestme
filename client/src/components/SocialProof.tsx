export default function SocialProof() {
  const companies = [
    "TechCorp",
    "Innovate Labs",
    "StartupVC",
    "Growth Capital",
    "Venture Partners",
    "Future Fund"
  ];

  return (
    <section className="py-12 px-6 lg:px-8 border-y border-border" data-testid="section-social-proof">
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-sm text-muted-foreground mb-8" data-testid="text-trusted-by">
          Trusted by entrepreneurs and backed by leading VCs
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
          {companies.map((company, index) => (
            <div 
              key={index}
              className="text-muted-foreground/60 hover:text-foreground transition-colors font-semibold text-lg"
              data-testid={`logo-company-${index}`}
            >
              {company}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

