import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Image as ImageIcon, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MediaLibrary } from "@/components/MediaLibrary";
import ProjectLayoutWithHeader from "@/components/ProjectLayoutWithHeader";

export default function ProjectMediaLibrary() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  }) as { data: any, isLoading: boolean };

  const handleContinue = () => {
    navigate(`/projects/${projectId}/generate-deck`);
  };

  const handleSkip = () => {
    navigate(`/projects/${projectId}/generate-deck`);
  };

  if (projectLoading || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ProjectLayoutWithHeader project={project}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="text-xs">Step 3 of 4</Badge>
          </div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <ImageIcon className="h-8 w-8 text-primary" />
            Media Library
          </h1>
          <p className="text-muted-foreground">
            Upload images or extract them from your website to enhance your pitch deck
          </p>
        </div>

        {/* Optional Step Notice */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">This step is optional</h3>
                <p className="text-sm text-blue-800">
                  You can skip this step and add images later, or let AI select images for you during deck generation.
                  However, uploading your own images gives you more control over the visual content.
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
              websiteUrl={project?.websiteUrl || project?.businessProfile?.website}
            />
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}/brand-kit`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Brand Kit
            </Link>
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSkip}>
              Skip this step
            </Button>
            <Button onClick={handleContinue}>
              Continue to Deck Generation
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Discovery</span>
            </div>
            <div className="flex-1 h-px bg-border mx-4" />
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Brand Kit</span>
            </div>
            <div className="flex-1 h-px bg-border mx-4" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                3
              </div>
              <span className="font-medium text-foreground">Media Library</span>
            </div>
            <div className="flex-1 h-px bg-border mx-4" />
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full border-2 border-border" />
              <span>Generate Deck</span>
            </div>
          </div>
        </div>
      </div>
    </ProjectLayoutWithHeader>
  );
}

