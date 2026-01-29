import { useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import { 
  ChevronLeft, 
  Search, 
  Palette, 
  Image,
  FileText, 
  Send, 
  BarChart3,
  Settings
} from "lucide-react";

interface ProjectLayoutWithHeaderProps {
  children: React.ReactNode;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  status?: string;
  businessProfile?: any;
}

const sidebarItems = [
  {
    id: "discovery",
    label: "Discovery",
    icon: Search,
    path: "/discovery",
    description: "Business analysis and research",
    comingSoon: false
  },
  {
    id: "media-library",
    label: "Media Library",
    icon: Image,
    path: "/media-library",
    description: "Upload and manage images",
    comingSoon: false
  },
  {
    id: "brand-kit",
    label: "Brand Kit",
    icon: Palette,
    path: "/brand-kit",
    description: "Brand colors, fonts, and style",
    comingSoon: false
  },
  {
    id: "deck-generator",
    label: "Generate Deck",
    icon: FileText,
    path: "/generate-deck",
    description: "Create and customize pitch deck",
    comingSoon: false
  },
  {
    id: "campaign",
    label: "Campaign",
    icon: Send,
    path: "/campaign",
    description: "Investor outreach and campaigns",
    comingSoon: false
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    path: "/analytics",
    description: "Performance metrics and insights",
    comingSoon: false
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    path: "/settings",
    description: "Project configuration",
    comingSoon: false
  }
];


export default function ProjectLayoutWithHeader({ children }: ProjectLayoutWithHeaderProps) {
  const params = useParams();
  const projectId = params.projectId;
  const [location] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId && isAuthenticated,
    retry: false,
  }) as { data: Project | undefined, isLoading: boolean };

  if (isLoading || !isAuthenticated || projectLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-spinner fa-spin text-primary-600 text-xl"></i>
          </div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </Layout>
    );
  }

  const currentPath = location.split(`/projects/${projectId}`)[1] || "/discovery";

  return (
    <Layout>
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col overflow-hidden">
          {/* Project Header */}
          <div className="p-6 border-b border-gray-200 shrink-0">
            <div className="flex items-center space-x-3 mb-4">
              <Link 
                to="/projects"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-gray-900 truncate">
                  {project?.name || "Loading..."}
                </h1>
                <p className="text-sm text-gray-500">{project?.industry}</p>
              </div>
            </div>
            
            {project?.description && (
              <p className="text-sm text-gray-600 leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {sidebarItems.map((item) => {
              const isActive = currentPath === item.path;
              const Icon = item.icon;

              return (
                <div key={item.id} className="relative">
                  <Link
                    to={item.comingSoon ? "#" : `/projects/${projectId}${item.path}`}
                    className={cn(
                      "block w-full",
                      item.comingSoon && "pointer-events-none"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-primary-50 text-primary-700 border border-primary-200"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                        item.comingSoon && "opacity-60"
                      )}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="font-medium">{item.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  
                  {item.comingSoon && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
                      <div className="text-center">
                        <div className="text-xs font-semibold text-gray-700 bg-white/90 px-2 py-1 rounded-full shadow-sm">
                          Coming Soon
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </Layout>
  );
}