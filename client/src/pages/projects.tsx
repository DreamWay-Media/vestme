import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Plus, Play, Eye, Trash2, Edit } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  businessProfile?: any;
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
        label: "Discovery Complete",
        color: "bg-blue-100 text-blue-800",
        description: "AI analysis completed"
      };
    case "brand_kit":
      return {
        label: "Brand Kit Ready", 
        color: "bg-purple-100 text-purple-800",
        description: "Brand assets configured"
      };
    case "deck_ready":
      return {
        label: "Deck Generated",
        color: "bg-green-100 text-green-800",
        description: "Ready to share"
      };
    case "campaign_active":
      return {
        label: "Campaign Active",
        color: "bg-accent-100 text-accent-600",
        description: "Campaign running"
      };
    default:
      return {
        label: "Unknown",
        color: "bg-gray-100 text-gray-800",
        description: "Status unknown"
      };
  }
};

const getProjectEditUrl = (project: Project) => {
  // Determine the best section to navigate to based on project status
  switch (project.status) {
    case "draft":
      return `/projects/${project.id}/discovery`;
    case "discovery":
      if (project.businessProfile) {
        return `/projects/${project.id}/brand-kit`;
      }
      return `/projects/${project.id}/discovery`;
    case "brand_kit":
      return `/projects/${project.id}/generate-deck`;
    case "deck_ready":
    case "campaign_active":
      return `/projects/${project.id}/analytics`;
    default:
      return `/projects/${project.id}/discovery`;
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

export default function Projects() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();


  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["/api/projects"],
    retry: false,
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Project deleted",
        description: "Project has been successfully deleted.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateDeckMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/generate-deck`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Deck Generated!",
        description: "Your pitch deck has been generated successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Generation Failed",
        description: "Failed to generate deck. Please ensure business analysis is complete.",
        variant: "destructive",
      });
    },
  });

  const viewDeck = async (projectId: string) => {
    try {
      // First, get the project's decks
      const decks = await apiRequest("GET", `/api/projects/${projectId}/decks`);
      
      if (decks && Array.isArray(decks) && decks.length > 0) {
        const latestDeck = decks[0]; // Get the most recent deck
        // Navigate to deck viewer in the same page
        navigate(`/deck-viewer/${latestDeck.id}`);
      } else {
        toast({
          title: "No Deck Found",
          description: "No pitch deck found for this project.",
          variant: "destructive",
        });
      }
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to open deck viewer.",
        variant: "destructive",
      });
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-spinner fa-spin text-primary-600 text-xl"></i>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      {/* Projects Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="mt-1 text-sm text-gray-600">Manage your pitch deck projects and track their progress.</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Link to="/projects/new">
              <Button className="inline-flex items-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors shadow-material">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {projectsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !projects || (projects as Project[]).length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-folder text-gray-400 text-2xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-6">Get started by creating your first pitch deck project.</p>
          <Link to="/projects/new">
            <Button className="bg-primary-500 hover:bg-primary-600">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Project
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(projects as Project[]).map((project: Project) => {
            const statusConfig = getStatusConfig(project.status);
            const editUrl = getProjectEditUrl(project);
            return (
              <Card key={project.id} className="hover:shadow-material-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <Link to={editUrl} className="flex items-center space-x-3 flex-1 cursor-pointer">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <i className={getProjectIcon(project.industry)}></i>
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold text-gray-900">
                          {project.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600">{project.industry}</p>
                      </div>
                    </Link>
                    <div className="flex items-center space-x-2">
                      <Badge className={cn("text-xs", statusConfig.color)}>
                        {statusConfig.label}
                      </Badge>
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          deleteProjectMutation.mutate(project.id);
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        disabled={deleteProjectMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Link to={editUrl} className="block cursor-pointer">
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {project.description || "No description provided"}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>Created {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}</span>
                    </div>
                  </Link>

                  <div className="flex flex-col space-y-2">
                    {project.status === "draft" && (
                      <Link to={`/projects/${project.id}/discovery`}>
                        <Button size="sm" variant="outline" className="w-full">
                          <Play className="h-4 w-4 mr-2" />
                          Start Discovery
                        </Button>
                      </Link>
                    )}

                    {project.status === "discovery" && !project.businessProfile && (
                      <Link to={`/projects/${project.id}/discovery`}>
                        <Button size="sm" variant="outline" className="w-full">
                          <Play className="h-4 w-4 mr-2" />
                          View Analysis
                        </Button>
                      </Link>
                    )}
                    
                    {project.status === "discovery" && project.businessProfile && (
                      <div className="space-y-2">
                        <Link to={`/projects/${project.id}/brand-kit`}>
                          <Button size="sm" className="w-full bg-primary-500 hover:bg-primary-600">
                            <Play className="h-4 w-4 mr-2" />
                            Continue to Brand Kit
                          </Button>
                        </Link>
                        <div className="flex space-x-2">
                          <Link to={`/projects/${project.id}/discovery`} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Discovery
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}

                    {project.status === "brand_kit" && (
                      <div className="space-y-2">
                        <Link to={`/projects/${project.id}/generate-deck`}>
                          <Button size="sm" className="w-full bg-primary-500 hover:bg-primary-600">
                            <Play className="h-4 w-4 mr-2" />
                            Generate Deck
                          </Button>
                        </Link>
                        <div className="flex space-x-2">
                          <Link to={`/projects/${project.id}/brand-kit`} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Brand Kit
                            </Button>
                          </Link>
                          <Link to={`/projects/${project.id}/discovery`} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Discovery
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}

                    {(project.status === "deck_ready" || project.status === "campaign_active") && (
                      <div className="space-y-2">
                        <div className="flex space-x-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => viewDeck(project.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Deck
                          </Button>
                          <Button size="sm" className="flex-1 bg-accent-500 hover:bg-accent-600">
                            <Play className="h-4 w-4 mr-2" />
                            Share
                          </Button>
                        </div>
                        <div className="flex space-x-2">
                          <Link to={`/projects/${project.id}/generate-deck`} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Deck
                            </Button>
                          </Link>
                          <Link to={`/projects/${project.id}/brand-kit`} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Brand Kit
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}


    </Layout>
  );
}
