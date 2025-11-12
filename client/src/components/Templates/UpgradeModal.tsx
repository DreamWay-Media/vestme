import { Check, X, Sparkles, Zap, Crown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UpgradeModalProps {
  onClose: () => void;
  lockedTemplatesCount?: number;
}

export function UpgradeModal({ onClose, lockedTemplatesCount = 5 }: UpgradeModalProps) {
  const handleUpgrade = () => {
    // TODO: Implement Stripe checkout
    console.log("Redirecting to checkout...");
    // window.location.href = "/upgrade";
  };
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-amber-500" />
            Unlock Premium Templates
          </DialogTitle>
          <DialogDescription>
            Get access to all professional templates and premium features
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-6 space-y-6">
          {/* Feature Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <div className="border rounded-lg p-6 bg-gray-50">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Free</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">$0</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">3 Basic Templates</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Brand Kit Integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">PDF Export</span>
                </li>
                <li className="flex items-start gap-2 opacity-50">
                  <X className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Premium Templates</span>
                </li>
                <li className="flex items-start gap-2 opacity-50">
                  <X className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Custom Templates</span>
                </li>
                <li className="flex items-start gap-2 opacity-50">
                  <X className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Priority Support</span>
                </li>
              </ul>
              
              <Button
                variant="outline"
                className="w-full mt-6"
                disabled
              >
                Current Plan
              </Button>
            </div>
            
            {/* Pro Plan */}
            <div className="border-2 border-blue-600 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50 relative">
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600">
                RECOMMENDED
              </Badge>
              
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Pro</h3>
                <div className="mt-2">
                  <span className="text-3xl font-bold">$29</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">or $290/year (save 17%)</p>
              </div>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">
                    All {3 + lockedTemplatesCount}+ Professional Templates
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Brand Kit Integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">Unlimited PDF Exports</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">
                    Create Custom Templates
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">
                    Advanced Customization
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">
                    Priority Support
                  </span>
                </li>
              </ul>
              
              <Button
                onClick={handleUpgrade}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Pro
              </Button>
            </div>
          </div>
          
          {/* Premium Template Showcase */}
          <div className="border-t pt-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Unlock {lockedTemplatesCount} Premium Templates
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {["Two Column", "Feature Grid", "Stats Showcase", "Problem/Solution", "Minimal Title"].map((name, i) => (
                <div key={i} className="text-center p-3 border rounded-lg bg-white relative group">
                  <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded mb-2 flex items-center justify-center">
                    <span className="text-2xl">📄</span>
                  </div>
                  <p className="text-xs font-medium truncate">{name}</p>
                  <Badge variant="secondary" className="text-xs mt-1">Premium</Badge>
                </div>
              ))}
            </div>
          </div>
          
          {/* Social Proof */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white" />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-white" />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-white" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Join 500+ users creating professional pitch decks
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  "VestMe Pro saved us hours of design work. The premium templates are incredible!"
                </p>
              </div>
            </div>
          </div>
          
          {/* Money-back guarantee */}
          <div className="text-center text-sm text-gray-600">
            <p>✨ 30-day money-back guarantee • Cancel anytime</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

