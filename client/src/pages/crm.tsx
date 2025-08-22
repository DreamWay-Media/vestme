import { useState, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Plus, Users, Tag, Filter, Mail, Edit, Trash2, UserPlus } from "lucide-react";

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

export default function CRM() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("contacts");
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterCompany, setFilterCompany] = useState("");
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [showAudienceDialog, setShowAudienceDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [newContactData, setNewContactData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    title: "",
    phone: "",
    notes: "",
    tags: [] as string[],
  });
  const [newAudienceData, setNewAudienceData] = useState({
    name: "",
    description: "",
    filterCriteria: { tags: [] as string[], company: "", contactIds: [] as string[] },
  });
  const [tagInput, setTagInput] = useState("");

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

  // Fetch contacts
  const { data: contacts, isLoading: contactsLoading } = useQuery<Contact[]>({
    queryKey: ["/api/crm/contacts"],
    retry: false,
  });

  // Fetch audiences
  const { data: audiences, isLoading: audiencesLoading } = useQuery<Audience[]>({
    queryKey: ["/api/crm/audiences"],
    retry: false,
  });

  // Get all unique tags from contacts
  const allTags = contacts?.reduce((tags: string[], contact: Contact) => {
    contact.tags?.forEach(tag => {
      if (!tags.includes(tag)) tags.push(tag);
    });
    return tags;
  }, []) || [];

  // Filter contacts based on current filters
  const filteredContacts = contacts?.filter((contact: Contact) => {
    if (filterTags.length > 0) {
      const hasTag = filterTags.some(tag => contact.tags?.includes(tag));
      if (!hasTag) return false;
    }
    if (filterCompany && contact.company !== filterCompany) return false;
    return true;
  }) || [];

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (contactData: typeof newContactData) => {
      await apiRequest("POST", "/api/crm/contacts", contactData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      setShowContactDialog(false);
      setNewContactData({
        firstName: "",
        lastName: "",
        email: "",
        company: "",
        title: "",
        phone: "",
        notes: "",
        tags: [],
      });
      toast({
        title: "Contact created",
        description: "Contact has been successfully added.",
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
        description: "Failed to create contact.",
        variant: "destructive",
      });
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      await apiRequest("PUT", `/api/crm/contacts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      setEditingContact(null);
      toast({
        title: "Contact updated",
        description: "Contact has been successfully updated.",
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
        description: "Failed to update contact.",
        variant: "destructive",
      });
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await apiRequest("DELETE", `/api/crm/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      toast({
        title: "Contact deleted",
        description: "Contact has been successfully deleted.",
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
        description: "Failed to delete contact.",
        variant: "destructive",
      });
    },
  });

  // Create audience mutation
  const createAudienceMutation = useMutation({
    mutationFn: async (audienceData: typeof newAudienceData) => {
      await apiRequest("POST", "/api/crm/audiences", audienceData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/audiences"] });
      setShowAudienceDialog(false);
      setNewAudienceData({
        name: "",
        description: "",
        filterCriteria: { tags: [], company: "", contactIds: [] },
      });
      toast({
        title: "Audience created",
        description: "Audience has been successfully created.",
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
        description: "Failed to create audience.",
        variant: "destructive",
      });
    },
  });

  // Delete audience mutation
  const deleteAudienceMutation = useMutation({
    mutationFn: async (audienceId: string) => {
      await apiRequest("DELETE", `/api/crm/audiences/${audienceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/audiences"] });
      toast({
        title: "Audience deleted",
        description: "Audience has been successfully deleted.",
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
        description: "Failed to delete audience.",
        variant: "destructive",
      });
    },
  });

  const handleAddTag = (tags: string[], setTags: (tags: string[]) => void) => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string, tags: string[], setTags: (tags: string[]) => void) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleEditContact = (contact: Contact) => {
    setLocation(`/crm/contacts/${contact.id}`);
  };

  const handleSubmitContact = () => {
    if (editingContact) {
      updateContactMutation.mutate({
        id: editingContact.id,
        data: newContactData,
      });
    } else {
      createContactMutation.mutate(newContactData);
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (checked) {
      setSelectedContacts(prev => [...prev, contactId]);
    } else {
      setSelectedContacts(prev => prev.filter(id => id !== contactId));
    }
  };

  const handleSelectAllContacts = (checked: boolean) => {
    if (checked) {
      setSelectedContacts(filteredContacts.map((contact: Contact) => contact.id));
    } else {
      setSelectedContacts([]);
    }
  };

  if (isLoading) {
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
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Relationship Management</h1>
            <p className="text-gray-600 mt-2">Manage your contacts and create targeted audiences for campaigns</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setLocation("/crm/contacts/new")}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Contact
            </Button>
            <Button variant="outline" onClick={() => setLocation("/crm/contacts/import")}>
              <Plus className="w-4 h-4 mr-2" />
              Import Contacts
            </Button>
            <Button variant="outline" onClick={() => setLocation("/crm/audiences/new")}>
              <Users className="w-4 h-4 mr-2" />
              Create Audience
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contacts">
              <Users className="w-4 h-4 mr-2" />
              Contacts ({contacts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="audiences">
              <Mail className="w-4 h-4 mr-2" />
              Audiences ({audiences?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Filter by Tags</Label>
                    <Select
                      value={filterTags.join(",")}
                      onValueChange={(value) => setFilterTags(value ? value.split(",") : [])}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select tags" />
                      </SelectTrigger>
                      <SelectContent>
                        {allTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Filter by Company</Label>
                    <Input
                      value={filterCompany}
                      onChange={(e) => setFilterCompany(e.target.value)}
                      placeholder="Company name"
                      className="w-48"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterTags([]);
                      setFilterCompany("");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
                {(filterTags.length > 0 || filterCompany) && (
                  <div className="mt-4 text-sm text-gray-600">
                    Showing {filteredContacts.length} of {contacts?.length || 0} contacts
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contacts List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Contacts</CardTitle>
                  {selectedContacts.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">{selectedContacts.length} selected</span>
                      <Dialog open={showAudienceDialog} onOpenChange={setShowAudienceDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Users className="w-4 h-4 mr-2" />
                            Create Audience
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New Audience</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="audienceName">Audience Name</Label>
                              <Input
                                id="audienceName"
                                value={newAudienceData.name}
                                onChange={(e) => setNewAudienceData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="VIP Customers"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="audienceDescription">Description</Label>
                              <Textarea
                                id="audienceDescription"
                                value={newAudienceData.description}
                                onChange={(e) => setNewAudienceData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Description of this audience"
                                rows={3}
                              />
                            </div>
                            <div className="text-sm text-gray-600">
                              This audience will include {selectedContacts.length} selected contacts
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setShowAudienceDialog(false)}>
                                Cancel
                              </Button>
                              <Button 
                                onClick={() => {
                                  createAudienceMutation.mutate({
                                    ...newAudienceData,
                                    filterCriteria: { 
                                      ...newAudienceData.filterCriteria,
                                      contactIds: selectedContacts 
                                    }
                                  });
                                }}
                                disabled={createAudienceMutation.isPending}
                              >
                                Create Audience
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {contactsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No contacts found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {contacts?.length === 0 ? "Get started by adding your first contact." : "Try adjusting your filters."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2">
                      <Checkbox
                        checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                        onCheckedChange={handleSelectAllContacts}
                      />
                      <span className="text-sm font-medium">Select All</span>
                    </div>
                    {filteredContacts.map((contact: Contact) => (
                      <div
                        key={contact.id}
                        className={cn(
                          "p-4 border rounded-lg transition-colors",
                          selectedContacts.includes(contact.id) ? "bg-primary-50 border-primary-200" : "bg-white border-gray-200"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedContacts.includes(contact.id)}
                              onCheckedChange={(checked) => handleSelectContact(contact.id, !!checked)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-gray-900">
                                  {contact.firstName} {contact.lastName}
                                </h3>
                                {contact.company && (
                                  <Badge variant="outline">{contact.company}</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{contact.email}</p>
                              {contact.title && (
                                <p className="text-sm text-gray-500">{contact.title}</p>
                              )}
                              {contact.phone && (
                                <p className="text-sm text-gray-500">{contact.phone}</p>
                              )}
                              {contact.tags && contact.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {contact.tags.map((tag, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              {contact.notes && (
                                <p className="text-sm text-gray-500 mt-2">{contact.notes}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-2">
                                Added {formatDistanceToNow(new Date(contact.createdAt))} ago
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditContact(contact)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteContactMutation.mutate(contact.id)}
                              disabled={deleteContactMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audiences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Saved Audiences</CardTitle>
              </CardHeader>
              <CardContent>
                {audiencesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : audiences?.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No audiences created</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Create audiences by selecting contacts and saving them as groups for targeted campaigns.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {audiences?.map((audience: Audience) => (
                      <Card key={audience.id} className="relative group cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{audience.name}</CardTitle>
                              {audience.description && (
                                <p className="text-sm text-gray-600 mt-1">{audience.description}</p>
                              )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLocation(`/crm/audiences/${audience.id}`)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Are you sure you want to delete "${audience.name}"? This action cannot be undone.`)) {
                                    deleteAudienceMutation.mutate(audience.id);
                                  }
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span className="text-sm">
                                {audience.contactIds.length} contacts
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">
                              Created {formatDistanceToNow(new Date(audience.createdAt))} ago
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}