import { GoogleLogin } from "./GoogleLogin";

export default function Navigation() {
  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" }
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60" data-testid="navigation">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center gap-2" data-testid="link-logo">
            <img src="/vestme-icon.svg" alt="VestMe.ai" className="w-8 h-8" />
            <span className="text-xl font-bold text-[#2D1B4E]">vestme.ai</span>
          </a>
          
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid={`link-nav-${index}`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <GoogleLogin 
            variant="primary"
            className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium transition-colors"
          >
            Get Started
          </GoogleLogin>
        </div>
      </div>
    </nav>
  );
}
