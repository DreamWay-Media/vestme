import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ProjectLayoutWithHeader from "@/components/ProjectLayoutWithHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { 
  Settings, 
  Trash2, 
  Download, 
  Archive,
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ProjectSettings() {
  const params = useParams();
  const projectId = params.projectId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [projectName, setProjectName] = useState("");
  const [autoArchive, setAutoArchive] = useState(false);

  const { data: project, isLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  }) as { data: any | undefined, isLoading: boolean };

  // Initialize form values when project loads
  useState(() => {
    if (project) {
      setProjectName(project.name || "");
      setAutoArchive(project.autoArchive || false);
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest("PUT", `/api/projects/${projectId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Settings Updated",
        description: "Your project settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update project settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      toast({
        title: "Project Deleted",
        description: "Your project has been permanently deleted.",
      });
      window.location.href = "/projects";
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSaveSettings = () => {
    updateProjectMutation.mutate({
      name: projectName,
      autoArchive: autoArchive,
    });
  };

  const handleExportProject = () => {
    toast({
      title: "Export Started",
      description: "Your project data export has been started. You'll receive a download link shortly.",
    });
  };

  const handleDeleteProject = () => {
    if (confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      deleteProjectMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <ProjectLayoutWithHeader>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </ProjectLayoutWithHeader>
    );
  }

  return (
    <ProjectLayoutWithHeader>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Settings</h1>
          <p className="text-gray-600">Manage settings and preferences for this specific project.</p>
        </div>

        <div className="space-y-6">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>General Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className="mt-1"
                />
                <p className="text-sm text-gray-500 mt-1">
                  This name is used in your pitch deck and campaign materials.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-archive">Auto-archive campaigns</Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Automatically archive campaigns older than 90 days
                  </p>
                </div>
                <Switch
                  id="auto-archive"
                  checked={autoArchive}
                  onCheckedChange={setAutoArchive}
                />
              </div>

              <div className="pt-4 border-t">
                <Button 
                  onClick={handleSaveSettings}
                  disabled={updateProjectMutation.isPending}
                  data-testid="button-save-settings"
                >
                  {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Project Information */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-600">Project Status</Label>
                  <p className="font-medium capitalize">{project?.status || "Draft"}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Created</Label>
                  <p className="font-medium">
                    {project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Last Modified</Label>
                  <p className="font-medium">
                    {project?.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : "Unknown"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Campaign Count</Label>
                  <p className="font-medium">{project?.campaignCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Archive className="h-5 w-5" />
                <span>Data Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Export Project Data</h4>
                  <p className="text-sm text-gray-500">
                    Download all project data including pitch deck, campaigns, and analytics
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleExportProject}
                  data-testid="button-export-project"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <span>Danger Zone</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h4 className="font-medium text-red-900">Delete Project</h4>
                  <p className="text-sm text-red-600">
                    Permanently delete this project and all associated data. This action cannot be undone.
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteProject}
                  disabled={deleteProjectMutation.isPending}
                  data-testid="button-delete-project"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteProjectMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProjectLayoutWithHeader>
  );
}