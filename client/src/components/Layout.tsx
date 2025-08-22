import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: "fas fa-home", current: location === "/" },
    { name: "Projects", href: "/projects", icon: "fas fa-folder", current: location === "/projects" },
    { name: "CRM", href: "/crm", icon: "fas fa-users", current: location === "/crm" },
    { name: "Settings", href: "/settings", icon: "fas fa-cog", current: location === "/settings" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <i className="fas fa-chart-line text-white text-sm"></i>
                </div>
                <h1 className="text-xl font-bold text-gray-900">PitchPerfect</h1>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href}>
                  <span className={cn(
                    "font-medium transition-colors cursor-pointer",
                    item.current 
                      ? "text-primary-600 border-b-2 border-primary-500 pb-4 -mb-4"
                      : "text-gray-600 hover:text-gray-900"
                  )}>
                    {item.name}
                  </span>
                </Link>
              ))}
            </nav>

            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <i className="fas fa-bell text-lg"></i>
              </button>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                {(user as any)?.profileImageUrl ? (
                  <img 
                    src={(user as any).profileImageUrl} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <i className="fas fa-user text-gray-600 text-sm"></i>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex justify-around py-2">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <span className={cn(
                "flex flex-col items-center p-2 cursor-pointer",
                item.current ? "text-primary-600" : "text-gray-400"
              )}>
                <i className={`${item.icon} text-lg`}></i>
                <span className="text-xs font-medium mt-1">{item.name}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
