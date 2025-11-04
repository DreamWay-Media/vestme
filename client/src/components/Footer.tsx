import { Github, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Footer() {
  const footerLinks = {
    product: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "Templates", href: "#templates" },
      { label: "Integrations", href: "#integrations" }
    ],
    resources: [
      { label: "Documentation", href: "#docs" },
      { label: "Blog", href: "#blog" },
      { label: "Help Center", href: "#help" },
      { label: "API", href: "#api" }
    ],
    company: [
      { label: "About", href: "#about" },
      { label: "Careers", href: "#careers" },
      { label: "Contact", href: "#contact" },
      { label: "Partners", href: "#partners" }
    ]
  };

  return (
    <footer className="border-t border-border py-16 px-6 lg:px-8" data-testid="footer">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2" data-testid="text-footer-brand">
              <img src="/vestme-icon.svg" alt="VestMe.ai" className="w-8 h-8" />
              <span className="text-xl font-bold text-[#2D1B4E]">vestme.ai</span>
            </div>
            <p className="text-muted-foreground text-sm">
              AI-powered pitch deck generator for entrepreneurs and startups.
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="w-9 h-9" data-testid="button-social-twitter">
                <Twitter className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-9 h-9" data-testid="button-social-linkedin">
                <Linkedin className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-9 h-9" data-testid="button-social-github">
                <Github className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold" data-testid="text-footer-product-title">Product</h4>
            <ul className="space-y-2">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`link-product-${index}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold" data-testid="text-footer-resources-title">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link, index) => (
                <li key={index}>
                  <a 
                    href={link.href} 
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`link-resources-${index}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold" data-testid="text-footer-newsletter-title">Stay Updated</h4>
            <p className="text-sm text-muted-foreground">
              Get the latest updates and tips delivered to your inbox.
            </p>
            <div className="flex gap-2">
              <Input 
                type="email" 
                placeholder="Enter your email"
                className="flex-1"
                data-testid="input-newsletter-email"
              />
              <Button data-testid="button-newsletter-subscribe">Subscribe</Button>
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground" data-testid="text-copyright">
            © 2025 VestMe.ai. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-privacy">
              Privacy Policy
            </a>
            <a href="#terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-terms">
              Terms of Service
            </a>
            <a href="#cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-cookies">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

