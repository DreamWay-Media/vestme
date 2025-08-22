import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import ProjectLayoutWithHeader from "@/components/ProjectLayoutWithHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Send, Users, Mail, Phone, Calendar, TrendingUp, Plus, Loader2 } from "lucide-react";

export default function ProjectCampaign() {
  const params = useParams();
  const projectId = params.projectId;

  const { data: project } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: contacts } = useQuery({
    queryKey: ["/api/crm/contacts"],
    enabled: !!projectId,
  }) as { data: any[] | undefined };

  const { data: campaigns } = useQuery({
    queryKey: ["/api/projects", projectId, "campaigns"],
    enabled: !!projectId,
  }) as { data: any[] | undefined };

  const { data: campaignStats } = useQuery({
    queryKey: ["/api/projects", projectId, "campaigns-stats"],
    queryFn: async () => {
      if (!campaigns || campaigns.length === 0) return { totalSent: 0, totalResponse: 0, responseRate: 0 };
      
      const stats = await Promise.all(
        campaigns.map(campaign => 
          apiRequest("GET", `/api/campaigns/${campaign.id}/stats`)
        )
      );
      
      const totals = stats.reduce((acc: any, stat: any) => ({
        totalSent: acc.totalSent + (stat.sentCount || 0),
        totalResponse: acc.totalResponse + (stat.clickCount || 0),
        responseRate: 0 // Will calculate below
      }), { totalSent: 0, totalResponse: 0, responseRate: 0 });
      
      totals.responseRate = totals.totalSent > 0 ? Math.round(totals.totalResponse / totals.totalSent * 100) : 0;
      return totals;
    },
    enabled: !!campaigns && campaigns.length > 0,
  });

  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    subject: "",
    message: "",
    audienceId: ""
  });

  const { data: audiences } = useQuery({
    queryKey: ["/api/crm/audiences"],
    enabled: !!projectId,
  }) as { data: any[] | undefined };

  const { toast } = useToast();

  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      return await apiRequest("POST", `/api/projects/${projectId}/campaigns`, campaignData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "campaigns"] });
      setIsNewCampaignOpen(false);
      setCampaignForm({ name: "", subject: "", message: "", audienceId: "" });
      toast({
        title: "Campaign Created",
        description: "Your campaign has been created successfully.",
      });
    },
    onError: (error) => {
      console.error("Error creating campaign:", error);
      toast({
        title: "Error",
        description: "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return await apiRequest("PUT", `/api/campaigns/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "campaigns"] });
      toast({
        title: "Campaign Updated",
        description: "Campaign has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating campaign:", error);
      toast({
        title: "Error",
        description: "Failed to update campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateCampaign = () => {
    if (!campaignForm.name || !campaignForm.subject || !campaignForm.message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    createCampaignMutation.mutate({
      ...campaignForm,
      status: "draft"
    });
  };

  const handleScheduleCampaign = (campaignId: string) => {
    updateCampaignMutation.mutate({
      id: campaignId,
      updates: { status: "scheduled" }
    });
  };

  const handleFollowUp = (campaignId: string) => {
    // Create a follow-up campaign based on the original
    const originalCampaign = campaigns?.find(c => c.id === campaignId);
    if (originalCampaign) {
      createCampaignMutation.mutate({
        name: `${originalCampaign.name} - Follow Up`,
        subject: `Follow-up: ${originalCampaign.subject}`,
        message: `This is a follow-up to our previous message:\n\n${originalCampaign.message}`,
        status: "draft"
      });
    }
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      case "active":
      case "sent":
        return "bg-green-100 text-green-800";
      case "paused":
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const campaignTemplates = [
    {
      id: 'cold-email',
      name: 'Cold Email Sequence',
      description: '3-email sequence for initial investor outreach',
      subject: 'Partnership Opportunity - {Company Name}',
      message: `Hi {Investor Name},

I hope this email finds you well. I'm {Your Name}, founder of {Company Name}, and I'm reaching out because I believe our company aligns perfectly with your investment thesis.

We're building {Brief Company Description} and have achieved {Key Milestone/Traction}. Our pitch deck provides a comprehensive overview of our opportunity.

Key highlights:
• {Key Point 1}
• {Key Point 2}  
• {Key Point 3}

Would you be available for a brief 15-minute call to discuss this opportunity further?

Best regards,
{Your Name}`
    },
    {
      id: 'follow-up',
      name: 'Follow-up Series', 
      description: 'Nurture sequence for engaged prospects',
      subject: 'Following up on {Company Name} opportunity',
      message: `Hi {Investor Name},

I wanted to follow up on my previous email about {Company Name}. 

Since our last communication, we've made significant progress:
• {Recent Achievement 1}
• {Recent Achievement 2}

I'd love to schedule a brief call to discuss how this investment opportunity might fit your portfolio.

Best regards,
{Your Name}`
    },
    {
      id: 'event-invitation',
      name: 'Event Invitation',
      description: 'Invite investors to pitch events or demos', 
      subject: 'Exclusive Invitation: {Company Name} Demo Day',
      message: `Hi {Investor Name},

You're cordially invited to attend {Company Name}'s exclusive demo day on {Event Date}.

This will be an opportunity to see our product in action and meet the founding team.

Looking forward to seeing you there!

Best regards,
{Your Name}`
    }
  ];

  const handleUseTemplate = (template: any) => {
    setCampaignForm({
      name: template.name,
      subject: template.subject,
      message: template.message,
      audienceId: campaignForm.audienceId // Preserve audience selection
    });
    setIsNewCampaignOpen(true);
  };

  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return await apiRequest("POST", `/api/campaigns/${campaignId}/send`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "campaigns"] });
      toast({
        title: "Campaign Sent",
        description: "Your campaign has been sent successfully.",
      });
    },
    onError: (error) => {
      console.error("Error sending campaign:", error);
      toast({
        title: "Error",
        description: "Failed to send campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendCampaign = (campaignId: string) => {
    sendCampaignMutation.mutate(campaignId);
  };

  const getAudienceName = (audienceId: string) => {
    const audience = audiences?.find(a => a.id === audienceId);
    return audience ? audience.name : 'Unknown Audience';
  };

  return (
    <ProjectLayoutWithHeader>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Campaign Management</h1>
          <p className="text-gray-600">Create and manage investor outreach campaigns for your pitch deck.</p>
        </div>

        {/* Campaign Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Send className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Campaigns</p>
                  <p className="text-xl font-semibold">{campaigns?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Contacts</p>
                  <p className="text-xl font-semibold">{contacts?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Mail className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Emails Sent</p>
                  <p className="text-xl font-semibold">{campaignStats?.totalSent || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Response Rate</p>
                  <p className="text-xl font-semibold">{campaignStats?.responseRate || 0}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Campaigns */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Campaigns</CardTitle>
              <Dialog open={isNewCampaignOpen} onOpenChange={setIsNewCampaignOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-new-campaign">
                    <Plus className="h-4 w-4 mr-2" />
                    New Campaign
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Create New Campaign</DialogTitle>
                    <DialogDescription>
                      Create a new investor outreach campaign for your pitch deck.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        value={campaignForm.name}
                        onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                        className="col-span-3"
                        placeholder="e.g. Series A Outreach"
                        data-testid="input-campaign-name"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="subject" className="text-right">
                        Subject
                      </Label>
                      <Input
                        id="subject"
                        value={campaignForm.subject}
                        onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                        className="col-span-3"
                        placeholder="Email subject line"
                        data-testid="input-campaign-subject"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="message" className="text-right">
                        Message
                      </Label>
                      <Textarea
                        id="message"
                        value={campaignForm.message}
                        onChange={(e) => setCampaignForm({ ...campaignForm, message: e.target.value })}
                        className="col-span-3"
                        placeholder="Your campaign message..."
                        rows={4}
                        data-testid="textarea-campaign-message"
                      />
                    </div>
                    
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="audience" className="text-right">
                        Audience
                      </Label>
                      <div className="col-span-3">
                        <Select
                          value={campaignForm.audienceId}
                          onValueChange={(value) => setCampaignForm({ ...campaignForm, audienceId: value })}
                        >
                          <SelectTrigger data-testid="select-campaign-audience">
                            <SelectValue placeholder="Choose an audience for this campaign" />
                          </SelectTrigger>
                          <SelectContent>
                            {audiences && audiences.length > 0 ? (
                              audiences.map((audience) => (
                                <SelectItem key={audience.id} value={audience.id}>
                                  {audience.name} ({audience.contactIds?.length || 0} contacts)
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-audiences" disabled>
                                No audiences available. Create one in CRM first.
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        
                        {(!audiences || audiences.length === 0) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <Link href={`/projects/${projectId}/crm`} className="text-blue-600 hover:underline">
                              Create an audience in CRM
                            </Link> to send campaigns to specific contacts.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="submit"
                      onClick={handleCreateCampaign}
                      disabled={createCampaignMutation.isPending}
                      data-testid="button-create-campaign"
                    >
                      {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {campaigns && campaigns.length > 0 ? (
                campaigns.map((campaign: any) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-primary-100 rounded-lg">
                        <Send className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900" data-testid={`text-campaign-name-${campaign.id}`}>
                          {campaign.name}
                        </h3>
                        <p className="text-sm text-gray-600" data-testid={`text-campaign-subject-${campaign.id}`}>
                          {campaign.subject}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Recipients: {campaign.recipientCount || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {campaign.status === 'draft' && campaign.recipientCount > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handleSendCampaign(campaign.id)}
                          disabled={sendCampaignMutation.isPending}
                          data-testid={`button-send-${campaign.id}`}
                        >
                          {sendCampaignMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Send className="w-4 h-4 mr-2" />
                          )}
                          Send Now
                        </Button>
                      )}
                      
                      <Badge className={getBadgeColor(campaign.status)} data-testid={`badge-campaign-status-${campaign.id}`}>
                        {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                      </Badge>
                      <div className="text-sm text-gray-600" data-testid={`text-campaign-stats-${campaign.id}`}>
                        <span className="font-medium">{campaign.sentCount || 0}</span> sent
                      </div>
                      <div className="flex gap-2">
                        {campaign.status === 'draft' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleScheduleCampaign(campaign.id)}
                            disabled={updateCampaignMutation.isPending}
                            data-testid={`button-schedule-${campaign.id}`}
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleFollowUp(campaign.id)}
                          disabled={createCampaignMutation.isPending}
                          data-testid={`button-follow-up-${campaign.id}`}
                        >
                          <Phone className="h-4 w-4 mr-2" />
                          Follow Up
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Send className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Campaigns Yet</h3>
                    <p className="text-gray-600 mb-4">Create your first campaign to start reaching out to investors.</p>
                    <Button 
                      onClick={() => setIsNewCampaignOpen(true)}
                      data-testid="button-create-first-campaign"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Campaign
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Templates */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {campaignTemplates.map((template) => (
                <div key={template.id} className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors cursor-pointer">
                  <h3 className="font-medium text-gray-900 mb-2" data-testid={`text-template-name-${template.id}`}>
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3" data-testid={`text-template-description-${template.id}`}>
                    {template.description}
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleUseTemplate(template)}
                    data-testid={`button-use-template-${template.id}`}
                  >
                    Use Template
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProjectLayoutWithHeader>
  );
}