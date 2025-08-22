import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { isUnauthorizedError } from "@/lib/authUtils";

const discoverySchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  industry: z.string().optional(),
  websiteUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

interface DiscoveryFormProps {
  onProjectCreated: (project: any) => void;
  onClose: () => void;
}

export default function DiscoveryForm({ onProjectCreated, onClose }: DiscoveryFormProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof discoverySchema>>({
    resolver: zodResolver(discoverySchema),
    defaultValues: {
      name: "",
      description: "",
      industry: "",
      websiteUrl: "",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: z.infer<typeof discoverySchema>) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: (project) => {
      // Start AI analysis immediately after project creation
      startAnalysis(project);
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
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const analyzeBusinessMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/analyze`, {
        uploadedFiles,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setIsAnalyzing(false);
      onProjectCreated(data.project);
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/recent-projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Success!",
        description: "AI analysis completed successfully. Your business profile is ready.",
      });
      onClose();
    },
    onError: (error) => {
      setIsAnalyzing(false);
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
        title: "Analysis Failed",
        description: "AI analysis failed. You can retry from the project page.",
        variant: "destructive",
      });
    },
  });

  const startAnalysis = (project: any) => {
    setIsAnalyzing(true);
    analyzeBusinessMutation.mutate(project.id);
  };

  const onSubmit = (data: z.infer<typeof discoverySchema>) => {
    createProjectMutation.mutate(data);
  };

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload", {});
      const result = await response.json();
      return {
        method: 'PUT' as const,
        url: result.uploadURL,
      };
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to get upload URL. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      const fileUrls: string[] = [];
      
      for (const file of result.successful || []) {
        if (file.uploadURL) {
          // Set ACL for uploaded file
          await apiRequest("PUT", "/api/project-files", {
            fileURL: file.uploadURL,
            projectId: "temp", // Will be updated when project is created
          });
          fileUrls.push(file.uploadURL);
        }
      }
      
      setUploadedFiles([...uploadedFiles, ...fileUrls]);
      toast({
        title: "Files uploaded",
        description: `${result.successful?.length || 0} file(s) uploaded successfully.`,
      });
    } catch (error) {
      console.error("Upload completion error:", error);
      toast({
        title: "Upload Error",
        description: "Files uploaded but failed to process. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isAnalyzing) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <i className="fas fa-brain text-primary-600 text-xl animate-pulse"></i>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">AI is analyzing your business</h3>
        <p className="text-gray-600 mb-4">This may take a few moments...</p>
        <div className="w-64 bg-gray-200 rounded-full h-2 mx-auto">
          <div className="bg-primary-500 h-2 rounded-full transition-all duration-1000 animate-pulse" style={{ width: "45%" }}></div>
        </div>
        <p className="text-sm text-gray-500 mt-2">Analyzing website content and uploaded documents</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Tell us about your business</h3>
          <p className="text-sm text-gray-600 mb-6">Our AI will analyze your business information to create the perfect pitch deck.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., TechStartup AI" {...field} />
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="e-commerce">E-commerce</SelectItem>
                    <SelectItem value="fintech">Fintech</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe what your business does, your target market, and key value propositions..." 
                  rows={4}
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
                  type="url" 
                  placeholder="https://yourcompany.com" 
                  {...field} 
                />
              </FormControl>
              <p className="text-xs text-gray-500 mt-1">Our AI will analyze your website for additional context</p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* File Upload Area */}
        <div>
          <FormLabel className="text-sm font-medium text-gray-700">Business Documents & Assets</FormLabel>
          <div className="mt-2">
            <ObjectUploader
              maxNumberOfFiles={5}
              maxFileSize={25 * 1024 * 1024} // 25MB
              onGetUploadParameters={handleGetUploadParameters}
              onComplete={handleUploadComplete}
              buttonClassName="w-full"
            >
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                <i className="fas fa-cloud-upload-alt text-gray-400 text-3xl mb-4"></i>
                <p className="text-gray-600 mb-2">Drop files here or click to upload</p>
                <p className="text-xs text-gray-500">Business plans, product sheets, logos, images (Max 25MB each)</p>
              </div>
            </ObjectUploader>
          </div>
          {uploadedFiles.length > 0 && (
            <div className="mt-3">
              <p className="text-sm text-green-600">
                <i className="fas fa-check mr-1"></i>
                {uploadedFiles.length} file(s) uploaded successfully
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createProjectMutation.isPending}
            className="bg-primary-500 hover:bg-primary-600"
          >
            {createProjectMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Creating...
              </>
            ) : (
              "Start AI Analysis"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
