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
import { ArrowLeft, Tag, Save, Trash2 } from "lucide-react";

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

export default function ContactEdit() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const contactId = params.contactId;
  const isNew = contactId === "new";
  
  const [contactData, setContactData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    title: "",
    phone: "",
    notes: "",
    tags: [] as string[],
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

  // Fetch contact data if editing
  const { data: contact, isLoading: contactLoading } = useQuery<Contact>({
    queryKey: [`/api/crm/contacts/${contactId}`],
    enabled: !!contactId && !isNew,
    retry: false,
  });

  // Update form data when contact loads
  useEffect(() => {
    if (contact && !isNew) {
      setContactData({
        firstName: contact.firstName || "",
        lastName: contact.lastName || "",
        email: contact.email || "",
        company: contact.company || "",
        title: contact.title || "",
        phone: contact.phone || "",
        notes: contact.notes || "",
        tags: contact.tags || [],
      });
    }
  }, [contact, isNew]);

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: typeof contactData) => {
      await apiRequest("POST", "/api/crm/contacts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      toast({
        title: "Contact created",
        description: "Contact has been successfully added.",
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
    mutationFn: async (data: typeof contactData) => {
      await apiRequest("PUT", `/api/crm/contacts/${contactId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      queryClient.invalidateQueries({ queryKey: [`/api/crm/contacts/${contactId}`] });
      toast({
        title: "Contact updated",
        description: "Contact has been successfully updated.",
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
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/crm/contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      toast({
        title: "Contact deleted",
        description: "Contact has been successfully deleted.",
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

  const handleAddTag = () => {
    if (tagInput.trim() && !contactData.tags.includes(tagInput.trim())) {
      setContactData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setContactData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      createContactMutation.mutate(contactData);
    } else {
      updateContactMutation.mutate(contactData);
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this contact? This action cannot be undone.")) {
      deleteContactMutation.mutate();
    }
  };

  if (isLoading || (contactLoading && !isNew)) {
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
      <div className="container mx-auto px-6 py-8 max-w-2xl">
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
              {isNew ? "Add New Contact" : "Edit Contact"}
            </h1>
            <p className="text-gray-600 mt-1">
              {isNew ? "Create a new contact for your CRM" : "Update contact information"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={contactData.firstName}
                    onChange={(e) => setContactData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={contactData.lastName}
                    onChange={(e) => setContactData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={contactData.email}
                  onChange={(e) => setContactData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={contactData.company}
                    onChange={(e) => setContactData(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={contactData.title}
                    onChange={(e) => setContactData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="CEO"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={contactData.phone}
                  onChange={(e) => setContactData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={contactData.notes}
                  onChange={(e) => setContactData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes about this contact"
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add a tag"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddTag}
                  >
                    <Tag className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {contactData.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      {tag} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between mt-8">
            <div>
              {!isNew && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteContactMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Contact
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
                disabled={createContactMutation.isPending || updateContactMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {isNew ? "Create Contact" : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}