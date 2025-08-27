import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  industry?: string;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case "draft":
      return {
        label: "Draft",
        color: "bg-gray-100 text-gray-800",
        description: "Getting started"
      };
    case "discovery":
      return {
        label: "In Progress",
        color: "bg-yellow-100 text-yellow-800",
        description: "Discovery completed • AI analyzed"
      };
    case "brand_kit":
      return {
        label: "In Progress", 
        color: "bg-yellow-100 text-yellow-800",
        description: "Brand Kit created • Ready for deck"
      };
    case "deck_ready":
      return {
        label: "Active",
        color: "bg-green-100 text-green-800",
        description: "Deck generated • Ready to share"
      };
    case "campaign_active":
      return {
        label: "Campaign Active",
        color: "bg-blue-100 text-blue-800",
        description: "Campaign sent • Tracking views"
      };
    default:
      return {
        label: "Unknown",
        color: "bg-gray-100 text-gray-800",
        description: "Status unknown"
      };
  }
};

const getProjectIcon = (industry?: string) => {
  switch (industry?.toLowerCase()) {
    case "technology":
      return "fas fa-laptop-code text-primary-600";
    case "healthcare":
      return "fas fa-heartbeat text-red-600";
    case "e-commerce":
      return "fas fa-store text-green-600";
    case "fintech":
      return "fas fa-credit-card text-blue-600";
    case "education":
      return "fas fa-graduation-cap text-purple-600";
    default:
      return "fas fa-rocket text-primary-600";
  }
};

export default function RecentProjects() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-projects"],
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      // Invalidate and refetch queries to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Project Deleted",
        description: "Project has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Failed to delete project:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProject = (projectId: string, projectName: string) => {
    if (window.confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-material animate-pulse">
        <div className="p-6 border-b border-gray-200">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!projects || (projects as Project[]).length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-material">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
            <Link href="/projects">
              <span className="text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer">View all</span>
            </Link>
          </div>
        </div>
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-folder text-gray-400 text-xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-4">Get started by creating your first pitch deck project.</p>
          <Link href="/projects">
            <span className="inline-flex items-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors cursor-pointer">
              <i className="fas fa-plus mr-2"></i>
              Create Project
            </span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-material">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
          <Link href="/projects">
            <span className="text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer">View all</span>
          </Link>
        </div>
      </div>
      
      <div className="p-6">
        {(projects as Project[]).map((project: Project) => {
          const statusConfig = getStatusConfig(project.status);
          return (
            <div key={project.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <i className={getProjectIcon(project.industry)}></i>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{project.name}</h3>
                  <p className="text-sm text-gray-600">{statusConfig.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                  statusConfig.color
                )}>
                  {statusConfig.label}
                </span>
                <button 
                  onClick={() => handleDeleteProject(project.id, project.name)}
                  disabled={deleteProjectMutation.isPending}
                  className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete project"
                >
                  {deleteProjectMutation.isPending ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-red-500" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
