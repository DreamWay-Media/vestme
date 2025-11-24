import { Github, Twitter, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "success" | "error">("idle");

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // TODO: Implement newsletter subscription with backend
      console.log("Newsletter subscription:", email);
      setSubscribeStatus("success");
      setEmail("");
      setTimeout(() => setSubscribeStatus("idle"), 3000);
    }
  };

  const footerLinks = {
    product: [
      { label: "Features", href: "#features" },
      { label: "Pricing", href: "#pricing" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "FAQ", href: "#faq" }
    ],
    resources: [
      { label: "Documentation", href: "#", comingSoon: true },
      { label: "Blog", href: "#", comingSoon: true },
      { label: "Help Center", href: "#", comingSoon: true },
      { label: "API", href: "#", comingSoon: true }
    ],
    company: [
      { label: "About", href: "#", comingSoon: true },
      { label: "Careers", href: "#", comingSoon: true },
      { label: "Contact", href: "mailto:support@vestme.ai" },
      { label: "Partners", href: "#", comingSoon: true }
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
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-9 h-9" 
                data-testid="button-social-twitter"
                asChild
              >
                <a href="https://twitter.com/vestmeai" target="_blank" rel="noopener noreferrer">
                  <Twitter className="w-4 h-4" />
                </a>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-9 h-9" 
                data-testid="button-social-linkedin"
                asChild
              >
                <a href="https://linkedin.com/company/vestmeai" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="w-4 h-4" />
                </a>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-9 h-9" 
                data-testid="button-social-github"
                asChild
              >
                <a href="https://github.com/vestmeai" target="_blank" rel="noopener noreferrer">
                  <Github className="w-4 h-4" />
                </a>
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
                <li key={index} className="flex items-center gap-2">
                  <a 
                    href={link.href}
                    onClick={(e) => link.comingSoon && e.preventDefault()}
                    className={`text-sm transition-colors ${
                      link.comingSoon 
                        ? "text-muted-foreground/50 cursor-not-allowed" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`link-resources-${index}`}
                  >
                    {link.label}
                  </a>
                  {link.comingSoon && (
                    <Badge variant="secondary" className="text-xs py-0 px-1.5 h-4">
                      Soon
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-semibold" data-testid="text-footer-company-title">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link, index) => (
                <li key={index} className="flex items-center gap-2">
                  <a 
                    href={link.href}
                    onClick={(e) => link.comingSoon && e.preventDefault()}
                    className={`text-sm transition-colors ${
                      link.comingSoon 
                        ? "text-muted-foreground/50 cursor-not-allowed" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`link-company-${index}`}
                  >
                    {link.label}
                  </a>
                  {link.comingSoon && (
                    <Badge variant="secondary" className="text-xs py-0 px-1.5 h-4">
                      Soon
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 pt-8 border-t border-border">
          <div className="lg:col-span-1 space-y-4">
            <h4 className="font-semibold" data-testid="text-footer-newsletter-title">Stay Updated</h4>
            <p className="text-sm text-muted-foreground">
              Get the latest updates and tips delivered to your inbox.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <div className="flex gap-2">
                <Input 
                  type="email" 
                  placeholder="Enter your email"
                  className="flex-1"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-newsletter-email"
                />
                <Button type="submit" data-testid="button-newsletter-subscribe">
                  Subscribe
                </Button>
              </div>
              {subscribeStatus === "success" && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Thanks for subscribing!
                </p>
              )}
            </form>
          </div>
        </div>
        
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground" data-testid="text-copyright">
            © 2025 VestMe.ai. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a 
              href="#" 
              onClick={(e) => e.preventDefault()}
              className="text-sm text-muted-foreground/50 cursor-not-allowed flex items-center gap-1" 
              data-testid="link-privacy"
            >
              Privacy Policy
              <Badge variant="secondary" className="text-xs py-0 px-1.5 h-4">Soon</Badge>
            </a>
            <a 
              href="#" 
              onClick={(e) => e.preventDefault()}
              className="text-sm text-muted-foreground/50 cursor-not-allowed flex items-center gap-1" 
              data-testid="link-terms"
            >
              Terms of Service
              <Badge variant="secondary" className="text-xs py-0 px-1.5 h-4">Soon</Badge>
            </a>
            <a 
              href="#" 
              onClick={(e) => e.preventDefault()}
              className="text-sm text-muted-foreground/50 cursor-not-allowed flex items-center gap-1" 
              data-testid="link-cookies"
            >
              Cookie Policy
              <Badge variant="secondary" className="text-xs py-0 px-1.5 h-4">Soon</Badge>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
