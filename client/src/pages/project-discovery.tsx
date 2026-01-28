import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Search, CheckCircle, AlertCircle, Loader2, Edit, Globe, TrendingUp, Users, Target, RefreshCw, DollarSign, BarChart3, Building, Shield, Zap, Upload, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
      <div className="p-6 space-y-6">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Discovery</h1>
              <p className="mt-1 text-sm text-gray-600">AI-powered research and business intelligence analysis for comprehensive insights.</p>
            </div>
          </div>
        </div>

      <div className="space-y-6">
        {/* AI Business Analysis with Project Info inside */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              AI Business Analysis
            </CardTitle>
            <CardDescription>
              Our AI is analyzing your business information to create a comprehensive profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Project Info Section */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3">Project Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Industry</p>
                  <p className="text-sm text-gray-900">{project.industry || "Not specified"}</p>
                </div>
                {project.websiteUrl && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Website</p>
                    <a 
                      href={project.websiteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {project.websiteUrl}
                    </a>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <Badge variant={project.status === 'discovery' ? 'default' : 'secondary'}>
                    {project.status}
                  </Badge>
                </div>
              </div>
            </div>
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
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-700">Analysis Complete!</span>
                </div>
                
                {project.businessProfile && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Business Overview</h3>
                      <p className="text-sm text-muted-foreground">
                        {project.businessProfile.overview || "Business analysis completed successfully."}
                      </p>
                    </div>
                    
                    {project.businessProfile.keyInsights && (
                      <div>
                        <h3 className="font-semibold mb-2">Key Insights</h3>
                        <div className="flex flex-wrap gap-2">
                          {project.businessProfile.keyInsights.slice(0, 6).map((insight: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              {insight}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSection('main')}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Business Info
                  </Button>
                </div>
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
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Upload className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Document Upload & Analysis</span>
                </div>

                {/* Document Upload Section */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Upload Business Documents (Optional)
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload pitch decks, business plans, or other documents to help our AI better understand your business
                    </p>
                    
                    {/* Document Upload Area */}
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 mb-4">
                      <div className="flex flex-col items-center gap-3">
                        <ObjectUploader
                          maxNumberOfFiles={5}
                          maxFileSize={50485760} // 50MB
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handleDocumentUploadComplete}
                          buttonClassName="w-full"
                        >
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            <span>Upload Documents</span>
                          </div>
                        </ObjectUploader>
                        
                        <p className="text-xs text-gray-500 text-center">
                          Supported: PDF, DOC, DOCX, TXT, PPT, PPTX (Max 50MB each)
                        </p>
                      </div>
                    </div>

                    {/* Uploaded Documents List */}
                    {uploadedDocuments.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <h5 className="text-sm font-medium text-gray-700">Uploaded Documents:</h5>
                        {uploadedDocuments.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDocument(doc.id)}
                              className="text-gray-500 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {hasBusinessProfile 
                      ? `Re-run comprehensive business analysis${uploadedDocuments.length > 0 ? ' with your uploaded documents' : ''} to update insights with the latest data.`
                      : `Launch comprehensive business intelligence gathering including website crawling${uploadedDocuments.length > 0 ? ', document analysis' : ''}, market analysis, competitor research, and financial projections.`
                    }
                  </p>
                  <Button 
                    onClick={handleStartAnalysis}
                    disabled={analyzeProjectMutation.isPending}
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {hasBusinessProfile ? 'Re-run Analysis' : 'Start Business Intelligence'} {uploadedDocuments.length > 0 ? `(${uploadedDocuments.length} docs)` : ''}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Discovery Results - Now below AI Business Analysis */}
        {businessProfile && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Discovery Results</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingSection('sidebar')}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {/* About the Business */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-600" />
                    About the Business
                  </h4>
                  {editingSection === 'sidebar' ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editValues.businessDescription || businessProfile.businessDescription || ""}
                        onChange={(e) => setEditValues({...editValues, businessDescription: e.target.value})}
                        placeholder="Describe what your business does and its core mission"
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>{businessProfile.businessDescription || businessProfile.businessInsights?.businessDescription || "Not available"}</p>
                      {businessProfile.businessInsights?.investmentThesis && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                          <h5 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">INVESTMENT THESIS</h5>
                          <p className="text-xs text-blue-600 dark:text-blue-400">{businessProfile.businessInsights.investmentThesis}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Problem Statement */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    Problem Statement
                  </h4>
                  {editingSection === 'sidebar' ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editValues.problemStatement || businessProfile.problemStatement || ""}
                        onChange={(e) => setEditValues({...editValues, problemStatement: e.target.value})}
                        placeholder="What specific problem does your business solve?"
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>{businessProfile.problemStatement || businessProfile.businessInsights?.problemStatement || "Not available"}</p>
                      {businessProfile.businessInsights?.strategicRecommendations && businessProfile.businessInsights.strategicRecommendations.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-xs font-semibold text-muted-foreground mb-2">STRATEGIC RECOMMENDATIONS</h5>
                          <ul className="space-y-1">
                            {businessProfile.businessInsights.strategicRecommendations.slice(0, 2).map((rec: string, index: number) => (
                              <li key={index} className="text-xs flex items-start gap-2">
                                <div className="w-1 h-1 rounded-full bg-green-500 mt-1.5 shrink-0" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Value Proposition */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    Value Proposition
                  </h4>
                  {editingSection === 'sidebar' ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editValues.valueProposition || businessProfile.valueProposition || ""}
                        onChange={(e) => setEditValues({...editValues, valueProposition: e.target.value})}
                        placeholder="What unique value does your company provide?"
                        className="text-sm min-h-[60px]"
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>{businessProfile.valueProposition || businessProfile.businessInsights?.valueProposition || "Not available"}</p>
                      {businessProfile.businessInsights?.keyBusinessInsights && businessProfile.businessInsights.keyBusinessInsights.length > 0 && (
                        <div className="mt-3">
                          <h5 className="text-xs font-semibold text-muted-foreground mb-2">KEY INSIGHTS</h5>
                          <ul className="space-y-1">
                            {businessProfile.businessInsights.keyBusinessInsights.slice(0, 3).map((insight: string, index: number) => (
                              <li key={index} className="text-xs flex items-start gap-2">
                                <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Business Model */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    Business Model
                  </h4>
                  {editingSection === 'sidebar' ? (
                    <Input
                      value={editValues.businessModel || businessProfile.businessModel || ""}
                      onChange={(e) => setEditValues({...editValues, businessModel: e.target.value})}
                      placeholder="Revenue generation model"
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {businessProfile.businessModel || "Not available"}
                    </p>
                  )}
                </div>

                {/* Target Market */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    Target Market
                  </h4>
                  {editingSection === 'sidebar' ? (
                    <Input
                      value={editValues.targetMarket || businessProfile.targetMarket || ""}
                      onChange={(e) => setEditValues({...editValues, targetMarket: e.target.value})}
                      placeholder="Primary customers"
                      className="text-sm"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {businessProfile.targetMarket || "Not available"}
                    </p>
                  )}
                </div>

                {/* Market Opportunity */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Market Opportunity</h4>
                  {editingSection === 'sidebar' ? (
                    <Textarea
                      value={editValues.marketOpportunity || businessProfile.marketOpportunity || ""}
                      onChange={(e) => setEditValues({...editValues, marketOpportunity: e.target.value})}
                      placeholder="Describe the market opportunity"
                      className="text-sm min-h-[60px]"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {businessProfile.marketOpportunity || "Not available"}
                    </p>
                  )}
                </div>

                {/* Competitive Advantages */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Key Advantages</h4>
                  {editingSection === 'sidebar' ? (
                    <Textarea
                      value={Array.isArray(businessProfile.competitiveAdvantage) 
                        ? businessProfile.competitiveAdvantage.join(", ")
                        : businessProfile.competitiveAdvantage || ""
                      }
                      onChange={(e) => setEditValues({...editValues, competitiveAdvantage: e.target.value.split(", ").filter(Boolean)})}
                      placeholder="List advantages separated by commas"
                      className="text-sm min-h-[60px]"
                    />
                  ) : (
                    <div className="space-y-1">
                      {Array.isArray(businessProfile.competitiveAdvantage) 
                        ? businessProfile.competitiveAdvantage.slice(0, 3).map((advantage: string, index: number) => (
                            <p key={index} className="text-xs text-muted-foreground">• {advantage}</p>
                          ))
                        : <p className="text-sm text-muted-foreground">{businessProfile.competitiveAdvantage || "Not available"}</p>
                      }
                    </div>
                  )}
                </div>

                {/* Research Sources */}
                <div>
                  <h4 className="font-semibold text-sm mb-2">Research Sources</h4>
                  <div className="flex flex-wrap gap-1">
                    {businessProfile.researchSources?.map((source: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {source}
                      </Badge>
                    ))}
                  </div>
                </div>

                {editingSection === 'sidebar' && (
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        updateBusinessProfileMutation.mutate(editValues);
                      }}
                      disabled={updateBusinessProfileMutation.isPending}
                    >
                      {updateBusinessProfileMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : null}
                      Save Changes
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProjectLayoutWithHeader>
  );
}