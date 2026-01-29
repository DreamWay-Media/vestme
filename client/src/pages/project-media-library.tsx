import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Image as ImageIcon, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MediaLibrary } from "@/components/MediaLibrary";
import ProjectLayoutWithHeader from "@/components/ProjectLayoutWithHeader";

export default function ProjectMediaLibrary() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  }) as { data: any, isLoading: boolean };

  if (projectLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ProjectLayoutWithHeader>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            Media Library
          </h1>
          <p className="text-muted-foreground">
            Upload images or extract them from your website to enhance your pitch deck
          </p>
        </div>

        {/* Optional Step Notice */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">This step is optional</h3>
                <p className="text-sm text-blue-800">
                  You can skip this step and add images later, or let AI select images for you during deck generation.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Library Component */}
        <Card>
          <CardContent className="pt-6">
            <MediaLibrary 
              projectId={projectId} 
              websiteUrl={
                project?.websiteUrl || 
                project?.businessProfile?.website || 
                project?.businessProfile?.websiteUrl
              }
            />
          </CardContent>
        </Card>
      </div>
    </ProjectLayoutWithHeader>
  );
}
