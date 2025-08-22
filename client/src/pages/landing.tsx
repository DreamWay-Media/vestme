import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center">
              <i className="fas fa-chart-line text-white text-xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">PitchPerfect</h1>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            AI-Powered Pitch Deck Generator
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Create professional startup pitch decks with AI-powered business analysis, 
            brand customization, and investor outreach tools.
          </p>
          <Button
            onClick={handleLogin}
            size="lg"
            className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 text-lg"
          >
            Get Started
            <i className="fas fa-arrow-right ml-2"></i>
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="border-none shadow-material">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-brain text-primary-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">AI Business Analysis</h3>
              <p className="text-gray-600">
                Our AI analyzes your business information and website to create a comprehensive business profile.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-material">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-accent-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-palette text-accent-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Brand Customization</h3>
              <p className="text-gray-600">
                Create custom brand kits with your colors, fonts, and assets for consistent professional presentations.
              </p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-material">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-rocket text-green-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Investor Outreach</h3>
              <p className="text-gray-600">
                Built-in CRM and campaign tools to manage contacts and track investor engagement with your decks.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Process Steps */}
        <div className="text-center mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="relative">
              <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
              <h4 className="font-semibold text-gray-900 mb-2">Discovery</h4>
              <p className="text-gray-600 text-sm">Share your business info and upload documents</p>
            </div>
            <div className="relative">
              <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
              <h4 className="font-semibold text-gray-900 mb-2">Brand Kit</h4>
              <p className="text-gray-600 text-sm">Create your brand identity with colors and fonts</p>
            </div>
            <div className="relative">
              <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
              <h4 className="font-semibold text-gray-900 mb-2">Generate Deck</h4>
              <p className="text-gray-600 text-sm">AI creates your professional pitch deck</p>
            </div>
            <div className="relative">
              <div className="w-12 h-12 bg-primary-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">4</div>
              <h4 className="font-semibold text-gray-900 mb-2">Share & Track</h4>
              <p className="text-gray-600 text-sm">Launch campaigns and monitor engagement</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center">
          <Card className="border-none shadow-material-lg bg-white max-w-2xl mx-auto">
            <CardContent className="p-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Create Your Perfect Pitch?
              </h3>
              <p className="text-gray-600 mb-8">
                Join thousands of entrepreneurs who have created winning pitch decks with PitchPerfect.
              </p>
              <Button
                onClick={handleLogin}
                size="lg"
                className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3"
              >
                Start Building Your Deck
                <i className="fas fa-arrow-right ml-2"></i>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
