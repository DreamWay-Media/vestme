import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, CheckCircle, AlertCircle, Loader2, Edit, TrendingUp, Users, Target, Building, FileText, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import ProjectLayoutWithHeader from "@/components/ProjectLayoutWithHeader";
import { ObjectUploader } from "@/components/ObjectUploader";
import AnalysisProgress from "@/components/AnalysisProgress";
import type { UploadResult } from '@uppy/core';

export default function ProjectDiscovery() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [analysisJustCompleted, setAnalysisJustCompleted] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const [uploadedDocuments, setUploadedDocuments] = useState<Array<{ name: string; url: string; id: string }>>([]);

  // Handle undefined projectId early
  useEffect(() => {
    if (projectId === undefined || projectId === "undefined" || !projectId) {
      console.warn("Invalid project ID detected:", projectId);
      toast({
        title: "Invalid Project",
        description: "Project ID is missing. Redirecting to projects page...",
        variant: "destructive",
      });
      navigate("/projects");
      return;
    }
  }, [projectId, navigate, toast]);

  const { data: project, isLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  }) as { data: any, isLoading: boolean };

  const analyzeProjectMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("Project ID is required");
      return await apiRequest("POST", `/api/projects/${projectId}/analyze`, {
        documents: uploadedDocuments.map(doc => doc.url)
      });
    },
    onSuccess: () => {
      // Show loading state while data is being refetched
      setAnalysisJustCompleted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Analysis Complete",
        description: "Your business has been analyzed with comprehensive research.",
      });
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
        }, 500);
        return;
      }
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze your business. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest("PUT", `/api/projects/${projectId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setEditingSection(null);
      toast({
        title: "Project updated",
        description: "Your changes have been saved successfully.",
      });
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
        }, 500);
        return;
      }
      toast({
        title: "Update failed",
        description: "Failed to update project. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateBusinessProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest("PUT", `/api/projects/${projectId}/business-profile`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setEditingSection(null);
      toast({
        title: "Business profile updated",
        description: "Your changes have been saved successfully.",
      });
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
        }, 500);
        return;
      }
      toast({
        title: "Update Failed",
        description: "Failed to update business profile.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (project && !project.businessProfile && !analysisStarted && !analyzeProjectMutation.isPending) {
      setAnalysisStarted(true);
      analyzeProjectMutation.mutate();
    }
  }, [project, analysisStarted, analyzeProjectMutation]);

  // Clear the "analysis just completed" state once business profile is loaded
  useEffect(() => {
    if (analysisJustCompleted && project?.businessProfile) {
      setAnalysisJustCompleted(false);
    }
  }, [analysisJustCompleted, project?.businessProfile]);

  // Document upload handlers
  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload");
      return {
        method: 'PUT' as const,
        url: (response as any).uploadURL,
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

  const handleDocumentUploadComplete = (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const newDocument = {
        id: Date.now().toString(),
        name: uploadedFile.name || 'Document',
        url: uploadedFile.uploadURL || '',
      };
      
      setUploadedDocuments(prev => [...prev, newDocument]);
      
      toast({
        title: "Document Uploaded",
        description: `${uploadedFile.name} has been uploaded successfully.`,
      });

      // Set ACL policy for the uploaded document
      apiRequest("PUT", "/api/business-documents", {
        documentURL: uploadedFile.uploadURL
      }).catch(error => {
        console.error("Failed to set document ACL:", error);
      });
    }
  };

  const handleRemoveDocument = (documentId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const handleStartAnalysis = () => {
    analyzeProjectMutation.mutate();
  };

  const handleContinue = () => {
    navigate(`/projects/${projectId}/brand-kit`);
  };

  const businessProfile = project?.businessProfile;

  const handleStartEditing = (section: string, currentValue: any) => {
    setEditingSection(section);
    setEditValues({ [section]: currentValue });
  };

  const handleSaveEdit = () => {
    if (editingSection && editValues[editingSection] !== undefined) {
      updateBusinessProfileMutation.mutate({
        [editingSection]: editValues[editingSection]
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditValues({});
  };

  // Initialize edit values when editing starts
  useEffect(() => {
    if (editingSection === 'main' && project) {
      setEditValues({
        name: project.name || '',
        description: project.description || '',
        industry: project.industry || '',
        websiteUrl: project.websiteUrl || ''
      });
    } else if (editingSection === 'sidebar' && businessProfile) {
      setEditValues({
        businessDescription: businessProfile.businessDescription || '',
        problemStatement: businessProfile.problemStatement || '',
        valueProposition: businessProfile.valueProposition || '',
        businessModel: businessProfile.businessModel || '',
        targetMarket: businessProfile.targetMarket || '',
        marketOpportunity: businessProfile.marketOpportunity || '',
        competitiveAdvantage: businessProfile.competitiveAdvantage || []
      });
    }
  }, [editingSection, project, businessProfile]);

  const renderEditableSection = (
    title: string,
    key: string,
    value: any,
    icon: React.ReactNode,
    isArray = false,
    placeholder = ""
  ) => {
    const isEditing = editingSection === key;
    const displayValue = isArray 
      ? (Array.isArray(value) ? value.join(", ") : "Not available")
      : value || "Not available";

    return (
      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base font-medium">{title}</CardTitle>
          </div>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStartEditing(key, isArray ? (Array.isArray(value) ? value.join(", ") : "") : value)}
            >
              <Edit className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              {isArray ? (
                <Textarea
                  value={editValues[key] || ""}
                  onChange={(e) => setEditValues({...editValues, [key]: e.target.value.split(", ").filter(Boolean)})}
                  placeholder={placeholder}
                  className="min-h-[80px]"
                />
              ) : (
                <Textarea
                  value={editValues[key] || ""}
                  onChange={(e) => setEditValues({...editValues, [key]: e.target.value})}
                  placeholder={placeholder}
                  className="min-h-[80px]"
                />
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={updateBusinessProfileMutation.isPending}>
                  {updateBusinessProfileMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Save
                </Button>
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">{displayValue}</p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading || !project) {
    return (
      <ProjectLayoutWithHeader>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ProjectLayoutWithHeader>
    );
  }

  const isAnalyzing = analyzeProjectMutation.isPending;
  const hasBusinessProfile = !!project.businessProfile;
  const analysisComplete = hasBusinessProfile && !isAnalyzing;
  


  return (
    <ProjectLayoutWithHeader>
      <div className="p-4 space-y-4">
        {/* Compact Header with Project Info inline */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Business Discovery</h1>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
              <span>{project.industry || "No industry"}</span>
              {project.websiteUrl && (
                <>
                  <span className="text-gray-300">|</span>
                  <a href={project.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[200px]">
                    {project.websiteUrl.replace(/^https?:\/\//, '')}
                  </a>
                </>
              )}
              <span className="text-gray-300">|</span>
              <Badge variant={project.status === 'discovery' ? 'default' : 'secondary'} className="text-xs">
                {project.status}
              </Badge>
            </div>
          </div>
        </div>

      <div className="space-y-4">
        {/* AI Business Analysis */}
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Search className="h-4 w-4" />
                AI Business Analysis
              </CardTitle>
              {analysisComplete && (
                <Button variant="ghost" size="sm" onClick={() => setEditingSection('main')}>
                  <Edit className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {/* Show analysis progress with detailed steps */}
            {isAnalyzing && (
              <AnalysisProgress 
                isAnalyzing={isAnalyzing}
                onComplete={() => {
                  // Analysis completed, data will be refetched automatically
                  queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
                }}
              />
            )}

            {/* Show loading state after analysis completes but before data is loaded */}
            {analysisJustCompleted && !isAnalyzing && !project?.businessProfile && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold text-gray-900">Loading Your Results</h3>
                  <p className="text-sm text-gray-600 max-w-md">
                    Analysis complete! We're preparing your business insights...
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                  <span>Finalizing data...</span>
                </div>
              </div>
            )}

            {analysisComplete && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                <span className="text-muted-foreground">
                  {project.businessProfile?.overview || "Business analysis completed successfully."}
                </span>
              </div>
            )}

            {editingSection === 'main' && (
              <div className="space-y-4">
                <h3 className="font-semibold">Edit Business Information</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Company Name</Label>
                    <Input
                      id="name"
                      value={editValues.name || ''}
                      onChange={(e) => setEditValues({...editValues, name: e.target.value})}
                      placeholder="Your company name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editValues.description || ''}
                      onChange={(e) => setEditValues({...editValues, description: e.target.value})}
                      placeholder="Describe your business..."
                      className="min-h-[100px]"
                    />
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={editValues.industry || ''}
                      onChange={(e) => setEditValues({...editValues, industry: e.target.value})}
                      placeholder="e.g., Technology, Healthcare, Finance"
                    />
                  </div>
                  <div>
                    <Label htmlFor="websiteUrl">Website URL</Label>
                    <Input
                      id="websiteUrl"
                      type="url"
                      value={editValues.websiteUrl || ''}
                      onChange={(e) => setEditValues({...editValues, websiteUrl: e.target.value})}
                      placeholder="https://your-website.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="text-red-500 font-medium">Must include http:// or https://</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      // Validate websiteUrl before submitting
                      if (editValues.websiteUrl && editValues.websiteUrl.trim() !== '') {
                        const trimmedUrl = editValues.websiteUrl.trim();
                        if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
                          toast({
                            title: "Invalid Website URL",
                            description: "Website URL must start with http:// or https://",
                            variant: "destructive",
                          });
                          return;
                        }
                        try {
                          new URL(trimmedUrl);
                        } catch {
                          toast({
                            title: "Invalid Website URL",
                            description: "Please enter a valid URL format",
                            variant: "destructive",
                          });
                          return;
                        }
                      }
                      updateProjectMutation.mutate(editValues);
                    }}
                    disabled={updateProjectMutation.isPending}
                  >
                    {updateProjectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!isAnalyzing && !analysisJustCompleted && editingSection === null && (
              <div className="flex flex-wrap items-center gap-3">
                <Button 
                  onClick={handleStartAnalysis}
                  disabled={analyzeProjectMutation.isPending}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  {hasBusinessProfile ? 'Re-run' : 'Start Analysis'}
                </Button>
                
                <ObjectUploader
                  maxNumberOfFiles={5}
                  maxFileSize={50485760}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleDocumentUploadComplete}
                  buttonClassName=""
                >
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Add docs</span>
                  </div>
                </ObjectUploader>
                
                {uploadedDocuments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {uploadedDocuments.map((doc) => (
                      <Badge key={doc.id} variant="secondary" className="flex items-center gap-1 pr-1 text-xs">
                        <span className="truncate max-w-[100px]">{doc.name}</span>
                        <button onClick={() => handleRemoveDocument(doc.id)} className="hover:text-red-600">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Discovery Results - Compact 2-column grid */}
        {businessProfile && (
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Discovery Results</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingSection('sidebar')}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {editingSection === 'sidebar' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Business Description</Label>
                      <Textarea
                        value={editValues.businessDescription || businessProfile.businessDescription || ""}
                        onChange={(e) => setEditValues({...editValues, businessDescription: e.target.value})}
                        placeholder="What your business does"
                        className="text-sm min-h-[60px] mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Problem Statement</Label>
                      <Textarea
                        value={editValues.problemStatement || businessProfile.problemStatement || ""}
                        onChange={(e) => setEditValues({...editValues, problemStatement: e.target.value})}
                        placeholder="Problem you solve"
                        className="text-sm min-h-[60px] mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Value Proposition</Label>
                      <Textarea
                        value={editValues.valueProposition || businessProfile.valueProposition || ""}
                        onChange={(e) => setEditValues({...editValues, valueProposition: e.target.value})}
                        placeholder="Unique value"
                        className="text-sm min-h-[60px] mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Market Opportunity</Label>
                      <Textarea
                        value={editValues.marketOpportunity || businessProfile.marketOpportunity || ""}
                        onChange={(e) => setEditValues({...editValues, marketOpportunity: e.target.value})}
                        placeholder="Market opportunity"
                        className="text-sm min-h-[60px] mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Business Model</Label>
                      <Input
                        value={editValues.businessModel || businessProfile.businessModel || ""}
                        onChange={(e) => setEditValues({...editValues, businessModel: e.target.value})}
                        placeholder="Revenue model"
                        className="text-sm mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Target Market</Label>
                      <Input
                        value={editValues.targetMarket || businessProfile.targetMarket || ""}
                        onChange={(e) => setEditValues({...editValues, targetMarket: e.target.value})}
                        placeholder="Primary customers"
                        className="text-sm mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Key Advantages (comma-separated)</Label>
                    <Textarea
                      value={editValues.competitiveAdvantage !== undefined 
                        ? (Array.isArray(editValues.competitiveAdvantage) ? editValues.competitiveAdvantage.join(", ") : editValues.competitiveAdvantage)
                        : (Array.isArray(businessProfile.competitiveAdvantage) ? businessProfile.competitiveAdvantage.join(", ") : businessProfile.competitiveAdvantage || "")}
                      onChange={(e) => setEditValues({...editValues, competitiveAdvantage: e.target.value.split(", ").filter(Boolean)})}
                      placeholder="List key advantages separated by commas"
                      className="text-sm min-h-[60px] mt-1"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => updateBusinessProfileMutation.mutate(editValues)} disabled={updateBusinessProfileMutation.isPending}>
                      {updateBusinessProfileMutation.isPending && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                      Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Investment Thesis - Featured at top if available */}
                  {businessProfile.businessInsights?.investmentThesis && (
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-blue-600" />
                        <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Investment Thesis</h4>
                      </div>
                      <p className="text-sm text-blue-600 dark:text-blue-400">{businessProfile.businessInsights.investmentThesis}</p>
                    </div>
                  )}

                  {/* Main Info Grid - 3 columns on desktop */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5" /> About
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">
                        {businessProfile.businessDescription || businessProfile.businessInsights?.businessDescription || "Not available"}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" /> Problem
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">
                        {businessProfile.problemStatement || businessProfile.businessInsights?.problemStatement || "Not available"}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" /> Value Proposition
                      </h4>
                      <p className="text-sm text-foreground leading-relaxed">
                        {businessProfile.valueProposition || businessProfile.businessInsights?.valueProposition || "Not available"}
                      </p>
                    </div>
                  </div>

                  {/* Secondary Info Grid - 4 columns for quick facts */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-2.5 border rounded-lg">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Model
                      </h4>
                      <p className="text-sm font-medium">{businessProfile.businessModel || "Not available"}</p>
                    </div>
                    <div className="p-2.5 border rounded-lg">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                        <Users className="w-3 h-3" /> Target Market
                      </h4>
                      <p className="text-sm font-medium">{businessProfile.targetMarket || "Not available"}</p>
                    </div>
                    <div className="p-2.5 border rounded-lg md:col-span-2">
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Market Opportunity</h4>
                      <p className="text-sm">{businessProfile.marketOpportunity || "Not available"}</p>
                    </div>
                  </div>

                  {/* Key Advantages as badges */}
                  {businessProfile.competitiveAdvantage && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Key Advantages</h4>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(businessProfile.competitiveAdvantage) 
                          ? businessProfile.competitiveAdvantage.map((adv: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs py-1 px-2.5">{adv}</Badge>
                            ))
                          : <p className="text-sm text-muted-foreground">{businessProfile.competitiveAdvantage}</p>
                        }
                      </div>
                    </div>
                  )}

                  {/* Strategic Recommendations & Insights - Collapsible or secondary */}
                  {(businessProfile.businessInsights?.strategicRecommendations?.length > 0 || 
                    businessProfile.businessInsights?.keyBusinessInsights?.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
                      {businessProfile.businessInsights?.strategicRecommendations?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Strategic Recommendations</h4>
                          <ul className="space-y-1.5">
                            {businessProfile.businessInsights.strategicRecommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-green-500 font-bold">+</span> {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {businessProfile.businessInsights?.keyBusinessInsights?.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Key Insights</h4>
                          <ul className="space-y-1.5">
                            {businessProfile.businessInsights.keyBusinessInsights.map((insight: string, i: number) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <span className="text-blue-500 font-bold">*</span> {insight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sources at bottom */}
                  {businessProfile.researchSources && businessProfile.researchSources.length > 0 && (
                    <div className="pt-2 border-t">
                      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">Sources</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {businessProfile.researchSources.map((source: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs text-gray-500">{source}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </ProjectLayoutWithHeader>
  );
}