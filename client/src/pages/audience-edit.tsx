import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Trash2, Users, Filter } from "lucide-react";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  title?: string;
  phone?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Audience {
  id: string;
  name: string;
  description?: string;
  filterCriteria: any;
  contactIds: string[];
  createdAt: string;
  updatedAt: string;
}

export default function AudienceEdit() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const audienceId = params.audienceId;
  const isNew = audienceId === "new";
  
  const [audienceData, setAudienceData] = useState({
    name: "",
    description: "",
    contactIds: [] as string[],
  });
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  // Fetch audience data if editing
  const { data: audience, isLoading: audienceLoading } = useQuery<Audience>({
    queryKey: [`/api/crm/audiences/${audienceId}`],
    enabled: !!audienceId && !isNew,
    retry: false,
  });

  // Fetch all contacts for selection
  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/crm/contacts"],
    retry: false,
  });

  // Update form data when audience loads
  useEffect(() => {
    if (audience && !isNew) {
      setAudienceData({
        name: audience.name || "",
        description: audience.description || "",
        contactIds: audience.contactIds || [],
      });
      setSelectedContacts(audience.contactIds || []);
    }
  }, [audience, isNew]);

  // Create audience mutation
  const createAudienceMutation = useMutation({
    mutationFn: async (data: typeof audienceData) => {
      await apiRequest("POST", "/api/crm/audiences", {
        ...data,
        filterCriteria: data.contactIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/audiences"] });
      toast({
        title: "Audience created",
        description: "Audience has been successfully created.",
      });
      setLocation("/crm");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        title: "Error",
        description: "Failed to create audience.",
        variant: "destructive",
      });
    },
  });

  // Update audience mutation
  const updateAudienceMutation = useMutation({
    mutationFn: async (data: typeof audienceData) => {
      await apiRequest("PUT", `/api/crm/audiences/${audienceId}`, {
        ...data,
        filterCriteria: data.contactIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/audiences"] });
      queryClient.invalidateQueries({ queryKey: [`/api/crm/audiences/${audienceId}`] });
      toast({
        title: "Audience updated",
        description: "Audience has been successfully updated.",
      });
      setLocation("/crm");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        title: "Error",
        description: "Failed to update audience.",
        variant: "destructive",
      });
    },
  });

  // Delete audience mutation
  const deleteAudienceMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/crm/audiences/${audienceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/audiences"] });
      toast({
        title: "Audience deleted",
        description: "Audience has been successfully deleted.",
      });
      setLocation("/crm");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
        title: "Error",
        description: "Failed to delete audience.",
        variant: "destructive",
      });
    },
  });

  const handleContactToggle = (contactId: string, checked: boolean) => {
    const newSelectedContacts = checked
      ? [...selectedContacts, contactId]
      : selectedContacts.filter(id => id !== contactId);
    
    setSelectedContacts(newSelectedContacts);
    setAudienceData(prev => ({
      ...prev,
      contactIds: newSelectedContacts,
    }));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allContactIds = contacts?.map(contact => contact.id) || [];
      setSelectedContacts(allContactIds);
      setAudienceData(prev => ({
        ...prev,
        contactIds: allContactIds,
      }));
    } else {
      setSelectedContacts([]);
      setAudienceData(prev => ({
        ...prev,
        contactIds: [],
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      createAudienceMutation.mutate(audienceData);
    } else {
      updateAudienceMutation.mutate(audienceData);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this audience? This action cannot be undone.")) {
      deleteAudienceMutation.mutate();
    }
  };

  if (isLoading || (audienceLoading && !isNew) || contactsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => setLocation("/crm")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to CRM
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isNew ? "Create New Audience" : "Edit Audience"}
            </h1>
            <p className="text-gray-600 mt-1">
              {isNew ? "Create a targeted audience for your campaigns" : "Update audience information and contacts"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audience Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Audience Name *</Label>
                <Input
                  id="name"
                  value={audienceData.name}
                  onChange={(e) => setAudienceData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="VIP Customers"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={audienceData.description}
                  onChange={(e) => setAudienceData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description of this audience"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Select Contacts ({selectedContacts.length} selected)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contacts && contacts.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b pb-3">
                    <Checkbox
                      checked={selectedContacts.length === contacts.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">Select All Contacts</span>
                  </div>
                  
                  <div className="grid gap-3 max-h-96 overflow-y-auto">
                    {contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <Checkbox
                          checked={selectedContacts.includes(contact.id)}
                          onCheckedChange={(checked) => handleContactToggle(contact.id, !!checked)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {contact.firstName} {contact.lastName}
                            </span>
                            {contact.company && (
                              <Badge variant="outline" className="text-xs">
                                {contact.company}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{contact.email}</p>
                          {contact.tags && contact.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {contact.tags.map((tag, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts available</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add some contacts first to create an audience.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <div>
              {!isNew && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteAudienceMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Audience
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/crm")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAudienceMutation.isPending || updateAudienceMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {isNew ? "Create Audience" : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}