import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Upload, FileText, Users } from "lucide-react";

export default function ContactImport() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [csvData, setCsvData] = useState("");
  const [importMethod, setImportMethod] = useState<"csv" | "manual">("csv");

  // Import contacts mutation
  const importContactsMutation = useMutation({
    mutationFn: async (data: { csvData?: string; contacts?: any[] }) => {
      return await apiRequest("POST", "/api/crm/contacts/import", data);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/contacts"] });
      toast({
        title: "Contacts imported",
        description: `Successfully imported ${data.imported} contacts.`,
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
        title: "Import failed",
        description: "Failed to import contacts. Please check your data format.",
        variant: "destructive",
      });
    },
  });

  const handleImportCsv = () => {
    if (!csvData.trim()) {
      toast({
        title: "No data",
        description: "Please paste CSV data to import.",
        variant: "destructive",
      });
      return;
    }
    importContactsMutation.mutate({ csvData });
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
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => setLocation("/crm")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to CRM
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Import Contacts</h1>
            <p className="text-gray-600 mt-2">Add multiple contacts to your CRM at once</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Import Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-4">
                <Button
                  variant={importMethod === "csv" ? "default" : "outline"}
                  onClick={() => setImportMethod("csv")}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  CSV Data
                </Button>
                <Button
                  variant={importMethod === "manual" ? "default" : "outline"}
                  onClick={() => setImportMethod("manual")}
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Manual Entry
                </Button>
              </div>

              {importMethod === "csv" && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements</h4>
                    <p className="text-sm text-blue-700 mb-2">
                      Your CSV data should include the following columns (first row should be headers):
                    </p>
                    <code className="text-sm bg-blue-100 px-2 py-1 rounded text-blue-800">
                      firstName,lastName,email,company,title,phone,notes,tags
                    </code>
                    <p className="text-sm text-blue-700 mt-2">
                      Example: John,Doe,john@example.com,Acme Inc,Manager,555-0123,Great contact,"investor,vip"
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="csvData">CSV Data</Label>
                    <Textarea
                      id="csvData"
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder="Paste your CSV data here..."
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleImportCsv}
                    disabled={importContactsMutation.isPending}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {importContactsMutation.isPending ? "Importing..." : "Import Contacts"}
                  </Button>
                </div>
              )}

              {importMethod === "manual" && (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">Manual Entry</h3>
                  <p className="mt-1 text-gray-500 mb-4">
                    Add contacts one by one using the form
                  </p>
                  <Button onClick={() => setLocation("/crm/contacts/new")}>
                    <Users className="w-4 h-4 mr-2" />
                    Add Single Contact
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}