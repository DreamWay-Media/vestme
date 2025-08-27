import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Globe, Building, FileText, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProjectSchema } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

type FormData = {
  name: string;
  description: string;
  industry: string;
  websiteUrl: string;
};

const projectSchema = insertProjectSchema.pick({
  name: true,
  description: true,
  industry: true,
  websiteUrl: true,
}).extend({
  name: insertProjectSchema.shape.name.min(1, "Project name is required"),
  description: insertProjectSchema.shape.description.optional(),
  industry: insertProjectSchema.shape.industry.optional(),
  websiteUrl: insertProjectSchema.shape.websiteUrl.optional(),
});

export default function CreateProject() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      industry: "",
      websiteUrl: "",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("POST", "/api/projects", data);
    },
    onSuccess: async (response: Response) => {
      try {
        const project = await response.json();
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        toast({
          title: "Project Created",
          description: "Your project has been created successfully.",
        });
        navigate(`/projects/${project.id}/discovery`);
      } catch (error) {
        console.error('Error parsing project response:', error);
        toast({
          title: "Error",
          description: "Project created but failed to navigate. Please refresh the page.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    createProjectMutation.mutate(data);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/projects">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create New Project</h1>
          <p className="text-muted-foreground">Start building your pitch deck by setting up your project</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>
                Provide basic information about your startup or business idea
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your project name..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Briefly describe your business or idea..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., SaaS, E-commerce, FinTech..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="websiteUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://your-website.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      disabled={createProjectMutation.isPending}
                      className="flex-1"
                    >
                      {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                    </Button>
                    <Link to="/projects">
                      <Button variant="outline">Cancel</Button>
                    </Link>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                What's Next?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 mt-1 text-blue-500" />
                <div className="text-sm">
                  <p className="font-medium">Business Discovery</p>
                  <p className="text-muted-foreground">AI will analyze your business and website</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building className="h-4 w-4 mt-1 text-green-500" />
                <div className="text-sm">
                  <p className="font-medium">Brand Kit Creation</p>
                  <p className="text-muted-foreground">Generate your brand colors and assets</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 mt-1 text-purple-500" />
                <div className="text-sm">
                  <p className="font-medium">Pitch Deck Generation</p>
                  <p className="text-muted-foreground">AI creates your complete presentation</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Provide a clear, memorable project name</p>
              <p>• Include your website URL for better AI analysis</p>
              <p>• Be specific about your industry for tailored content</p>
              <p>• You can edit these details later if needed</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}