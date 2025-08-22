import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function Settings() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [campaignNotifications, setCampaignNotifications] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);

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

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleExportData = () => {
    toast({
      title: "Export Started",
      description: "Your data export has been started. You'll receive an email when it's ready.",
    });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Account Deletion",
      description: "Please contact support to delete your account.",
      variant: "destructive",
    });
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-spinner fa-spin text-primary-600 text-xl"></i>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      {/* Settings Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">Manage your account preferences and settings.</p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-user mr-2 text-primary-600"></i>
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                {user?.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <i className="fas fa-user text-primary-600 text-2xl"></i>
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </h3>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName" 
                  defaultValue={user?.firstName || ""} 
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  defaultValue={user?.lastName || ""} 
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                defaultValue={user?.email || ""} 
                className="mt-1"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <Button className="bg-primary-500 hover:bg-primary-600">
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-bell mr-2 text-primary-600"></i>
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Email Notifications</h4>
                <p className="text-sm text-gray-600">Receive notifications via email</p>
              </div>
              <Switch 
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Campaign Updates</h4>
                <p className="text-sm text-gray-600">Get notified when campaigns are opened or clicked</p>
              </div>
              <Switch 
                checked={campaignNotifications}
                onCheckedChange={setCampaignNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Weekly Reports</h4>
                <p className="text-sm text-gray-600">Receive weekly analytics summaries</p>
              </div>
              <Switch 
                checked={weeklyReports}
                onCheckedChange={setWeeklyReports}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-shield-alt mr-2 text-primary-600"></i>
              Security & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Password</h4>
                <p className="text-sm text-gray-600">Managed through your authentication provider</p>
              </div>
              <Button variant="outline" disabled>
                Cannot Change
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
              </div>
              <Button variant="outline">
                Enable 2FA
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Login Sessions</h4>
                <p className="text-sm text-gray-600">Manage your active login sessions</p>
              </div>
              <Button variant="outline">
                View Sessions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-database mr-2 text-primary-600"></i>
              Data & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Export Data</h4>
                <p className="text-sm text-gray-600">Download a copy of your data</p>
              </div>
              <Button variant="outline" onClick={handleExportData}>
                <i className="fas fa-download mr-2"></i>
                Export
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Data Retention</h4>
                <p className="text-sm text-gray-600">How long we keep your data</p>
              </div>
              <Button variant="outline">
                Learn More
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-cog mr-2 text-primary-600"></i>
              Account Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Sign Out</h4>
                <p className="text-sm text-gray-600">Sign out from all devices</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt mr-2"></i>
                Sign Out
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-red-600">Delete Account</h4>
                <p className="text-sm text-gray-600">Permanently delete your account and all data</p>
              </div>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAccount}
              >
                <i className="fas fa-trash mr-2"></i>
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-info-circle mr-2 text-primary-600"></i>
              About PitchPerfect
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Version:</strong> 1.0.0</p>
              <p><strong>Last Updated:</strong> December 2024</p>
              <p><strong>Support:</strong> support@pitchperfect.ai</p>
            </div>
            
            <div className="flex space-x-4 mt-4">
              <Button variant="outline" size="sm">
                <i className="fas fa-book mr-2"></i>
                Documentation
              </Button>
              <Button variant="outline" size="sm">
                <i className="fas fa-life-ring mr-2"></i>
                Support
              </Button>
              <Button variant="outline" size="sm">
                <i className="fas fa-gavel mr-2"></i>
                Terms of Service
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
