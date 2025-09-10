import { Card, CardContent } from "@/components/ui/card";
import { GoogleLogin } from "@/components/GoogleLogin";
import { useState } from "react";

export default function Landing() {
  const [isYearly, setIsYearly] = useState(false);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.offsetTop - 80; // Account for sticky nav height
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 scroll-smooth">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <i className="fas fa-chart-line text-white text-sm"></i>
              </div>
              <span className="text-xl font-bold text-gray-900">PitchPerfect</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <button 
                onClick={() => scrollToSection('features')} 
                className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >
                Features
              </button>
              <button 
                onClick={() => scrollToSection('pricing')} 
                className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >
                Pricing
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')} 
                className="text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
              >
                How it Works
              </button>
            </div>
            <GoogleLogin className="px-4 py-2 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors">
              Sign In
            </GoogleLogin>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        {/* Hero Section */}
        <div className="text-center mb-20 lg:mb-32">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fas fa-chart-line text-white text-2xl"></i>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              PitchPerfect
            </h1>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-6 leading-tight">
            AI-Powered Pitch Deck
            <span className="block bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              Generator
            </span>
          </h2>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto mb-10 leading-relaxed">
            Create professional startup pitch decks with AI-powered business analysis, 
            brand customization, and investor outreach tools. Turn your ideas into 
            investor-ready presentations in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <GoogleLogin className="px-8 py-4 text-lg bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <i className="fab fa-google mr-2"></i>
              Get Started with Google
            </GoogleLogin>
            <button className="px-8 py-4 text-lg border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-xl transition-all duration-300 hover:bg-gray-50">
              <i className="fas fa-play mr-2"></i>
              Watch Demo
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-4">No credit card required • Free trial available</p>
        </div>

        {/* Features Grid */}
        <section id="features" className="mb-20 lg:mb-32 pt-20 scroll-mt-20">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Everything you need to create
              <span className="block bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                winning pitch decks
              </span>
            </h3>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive platform combines AI intelligence with professional design tools 
              to help you create investor-ready presentations.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 lg:p-10 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-brain text-primary-600 text-3xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Business Analysis</h3>
                <p className="text-gray-600 leading-relaxed">
                  Our advanced AI analyzes your business information, website, and market data to create 
                  comprehensive business profiles and insights.
                </p>
              </CardContent>
            </Card>

            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 lg:p-10 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-accent-100 to-accent-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-palette text-accent-600 text-3xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Brand Customization</h3>
                <p className="text-gray-600 leading-relaxed">
                  Create custom brand kits with your colors, fonts, logos, and assets for 
                  consistent, professional presentations that reflect your brand.
                </p>
              </CardContent>
            </Card>

            <Card className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white/80 backdrop-blur-sm md:col-span-2 lg:col-span-1">
              <CardContent className="p-8 lg:p-10 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <i className="fas fa-rocket text-green-600 text-3xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Investor Outreach</h3>
                <p className="text-gray-600 leading-relaxed">
                  Built-in CRM and campaign tools to manage contacts, track investor engagement, 
                  and optimize your pitch deck performance.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Process Steps */}
        <section id="how-it-works" className="mb-20 lg:mb-32 pt-20 scroll-mt-20">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              How It Works
            </h3>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Create your perfect pitch deck in just 4 simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            <div className="relative group">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                1
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3 text-center">Discovery</h4>
              <p className="text-gray-600 text-center leading-relaxed">
                Share your business information and upload documents for AI analysis
              </p>
              <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-primary-500 to-transparent transform translate-x-4"></div>
            </div>
            
            <div className="relative group">
              <div className="w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                2
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3 text-center">Brand Kit</h4>
              <p className="text-gray-600 text-center leading-relaxed">
                Create your brand identity with custom colors, fonts, and logos
              </p>
              <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-accent-500 to-transparent transform translate-x-4"></div>
            </div>
            
            <div className="relative group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                3
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3 text-center">Generate Deck</h4>
              <p className="text-gray-600 text-center leading-relaxed">
                AI creates your professional pitch deck with investor-ready content
              </p>
              <div className="hidden lg:block absolute top-8 left-full w-full h-0.5 bg-gradient-to-r from-green-500 to-transparent transform translate-x-4"></div>
            </div>
            
            <div className="relative group">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                4
              </div>
              <h4 className="text-xl font-bold text-gray-900 mb-3 text-center">Share & Track</h4>
              <p className="text-gray-600 text-center leading-relaxed">
                Launch campaigns and monitor investor engagement with analytics
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Plans */}
        <section id="pricing" className="mb-20 lg:mb-32 pt-20 scroll-mt-20">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Choose the plan that works for you
            </h3>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-12">
              Start free and upgrade as you grow. All plans include our core features.
            </p>
            
            <div className="flex items-center justify-center space-x-4 mb-12">
              <span className={`text-lg font-medium transition-colors ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
                Monthly
              </span>
              <div className="relative">
                <input 
                  type="checkbox" 
                  id="billing-toggle" 
                  className="sr-only" 
                  checked={isYearly}
                  onChange={(e) => setIsYearly(e.target.checked)}
                />
                <label htmlFor="billing-toggle" className="block w-16 h-9 bg-primary-500 rounded-full cursor-pointer transition-all duration-300 hover:bg-primary-600">
                  <span className={`block w-7 h-7 bg-white rounded-full transform transition-transform duration-300 shadow-lg ${isYearly ? 'translate-x-8' : 'translate-x-1'} translate-y-1`}></span>
                </label>
              </div>
              <span className={`text-lg font-medium transition-colors ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
                Yearly <span className="text-green-600 font-bold">(save 20%)</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <Card className="group border-2 border-gray-200 hover:border-primary-300 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
              <CardContent className="p-8 lg:p-10">
                <div className="text-center mb-8">
                  <h4 className="text-2xl font-bold text-gray-900 mb-3">Starter</h4>
                  <div className="text-5xl font-bold text-gray-900 mb-3">Free</div>
                  <p className="text-lg text-gray-600">Perfect for trying out PitchPerfect</p>
                </div>
                
                <div className="space-y-5 mb-10">
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-4 text-lg"></i>
                    <span className="text-gray-700 text-lg">1 pitch deck generation</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-4 text-lg"></i>
                    <span className="text-gray-700 text-lg">Basic AI analysis</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-4 text-lg"></i>
                    <span className="text-gray-700 text-lg">Standard templates</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-4 text-lg"></i>
                    <span className="text-gray-700 text-lg">PDF export</span>
                  </div>
                </div>

                <GoogleLogin className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-4 text-lg rounded-xl transition-all duration-300">
                  Get Started Free
                </GoogleLogin>
              </CardContent>
            </Card>

            {/* Professional Plan */}
            <Card className="group border-2 border-primary-500 relative hover:border-primary-600 transition-all duration-300 transform hover:-translate-y-1 shadow-xl hover:shadow-2xl bg-gradient-to-br from-white to-primary-50">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                  Most Popular
                </span>
              </div>
              <CardContent className="p-8 lg:p-10">
                <div className="text-center mb-8">
                  <h4 className="text-2xl font-bold text-gray-900 mb-3">Professional</h4>
                  <div className="text-5xl font-bold text-gray-900 mb-3">
                    {isYearly ? (
                      <>
                        $23<span className="text-2xl text-gray-600">/mo</span>
                        <div className="text-lg text-gray-500 line-through">$29/mo</div>
                      </>
                    ) : (
                      <>$29<span className="text-2xl text-gray-600">/mo</span></>
                    )}
                  </div>
                  <p className="text-lg text-gray-600">Everything you need to create winning pitches</p>
                  {isYearly && (
                    <p className="text-sm text-green-600 font-bold mt-3 bg-green-100 px-3 py-1 rounded-full inline-block">
                      Billed annually - Save $72/year
                    </p>
                  )}
                </div>
                
                <div className="space-y-5 mb-10">
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-4 text-lg"></i>
                    <span className="text-gray-700 text-lg">Unlimited pitch decks</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-4 text-lg"></i>
                    <span className="text-gray-700 text-lg">Advanced AI business analysis</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-4 text-lg"></i>
                    <span className="text-gray-700 text-lg">Custom brand kits</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-4 text-lg"></i>
                    <span className="text-gray-700 text-lg">Premium templates</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-4 text-lg"></i>
                    <span className="text-gray-700 text-lg">CRM & contact management</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-4 text-lg"></i>
                    <span className="text-gray-700 text-lg">Analytics & tracking</span>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-check text-green-500 mr-4 text-lg"></i>
                    <span className="text-gray-700 text-lg">Priority support</span>
                  </div>
                </div>

                <GoogleLogin className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white py-4 text-lg rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl">
                  Get Professional
                </GoogleLogin>
              </CardContent>
            </Card>

          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center">
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-white via-primary-50 to-accent-50 max-w-4xl mx-auto">
            <CardContent className="p-12 lg:p-16">
              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Ready to Create Your Perfect Pitch?
              </h3>
              <p className="text-lg sm:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                Join thousands of entrepreneurs who have created winning pitch decks with PitchPerfect. 
                Start your free trial today and see the difference AI can make.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <GoogleLogin className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-10 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <i className="fab fa-google mr-2"></i>
                  Start Building Your Deck
                </GoogleLogin>
                <button className="px-10 py-4 text-lg border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-xl transition-all duration-300 hover:bg-gray-50">
                  <i className="fas fa-phone mr-2"></i>
                  Schedule Demo
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-6">
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
