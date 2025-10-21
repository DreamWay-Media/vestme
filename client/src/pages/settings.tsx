import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

export default function Settings() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  
  // Profile form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [isUpdating, setIsUpdating] = useState(false);

  // Billing state
  const [subscription, setSubscription] = useState<any>(null);
  const [isYearly, setIsYearly] = useState(false);
  const [isLoadingSubscription, setIsLoadingSubscription] = useState(true);

  // Update form fields when user data changes
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
    }
  }, [user]);

  // Fetch subscription data
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!isAuthenticated) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const response = await fetch('/api/billing/subscription', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      } finally {
        setIsLoadingSubscription(false);
      }
    };

    fetchSubscription();
  }, [isAuthenticated]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Please log in again.",
        variant: "destructive",
      });
      // Redirect to landing page for login
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // Redirect to landing page after logout
      window.location.href = "/";
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Logout Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };


  const handleDeleteAccount = () => {
    toast({
      title: "Account Deletion",
      description: "Please contact support to delete your account.",
      variant: "destructive",
    });
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/auth/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ firstName, lastName }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedUser = await response.json();
      
      // Update local state
      setFirstName(updatedUser.firstName || '');
      setLastName(updatedUser.lastName || '');
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Billing functions
  const handleUpgradePlan = async (isYearly: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const priceId = isYearly ? 'price_professional_yearly' : 'price_professional_monthly';
      
      const response = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId, isYearly }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error upgrading plan:', error);
      toast({
        title: "Upgrade Failed",
        description: "Failed to start upgrade process. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManageBilling = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch('/api/billing/create-portal-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast({
        title: "Billing Portal Error",
        description: "Failed to open billing portal. Please try again.",
        variant: "destructive",
      });
    }
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
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
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

            <Button 
              className="bg-primary-500 hover:bg-primary-600"
              onClick={handleUpdateProfile}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Billing & Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <i className="fas fa-credit-card mr-2 text-primary-600"></i>
              Billing & Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingSubscription ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-spinner fa-spin text-primary-600"></i>
                </div>
                <span className="ml-3 text-gray-600">Loading subscription...</span>
              </div>
            ) : subscription ? (
              // Active subscription
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                      <i className="fas fa-check text-green-600 text-xl"></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Professional Plan</h4>
                      <p className="text-sm text-gray-600">
                        {subscription.items?.data?.[0]?.price?.recurring?.interval === 'year' 
                          ? 'Billed annually - $23/month' 
                          : 'Billed monthly - $29/month'
                        }
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Next billing date:</span>
                    <p className="font-medium text-gray-900">
                      {subscription.current_period_end 
                        ? new Date(subscription.current_period_end * 1000).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <p className="font-medium text-gray-900 capitalize">{subscription.status}</p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button 
                    onClick={handleManageBilling}
                    className="bg-primary-500 hover:bg-primary-600"
                  >
                    <i className="fas fa-cog mr-2"></i>
                    Manage Billing
                  </Button>
                  <Button variant="outline">
                    <i className="fas fa-download mr-2"></i>
                    Download Invoice
                  </Button>
                </div>
              </div>
            ) : (
              // No active subscription - show upgrade options
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fas fa-gem text-gray-600 text-2xl"></i>
                  </div>
                  <h4 className="text-xl font-semibold text-gray-900 mb-2">Upgrade to Professional</h4>
                  <p className="text-gray-600 mb-6">
                    Unlock unlimited pitch decks, advanced AI analysis, and premium features
                  </p>
                </div>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center space-x-4 mb-6">
                  <span className={`text-lg font-medium transition-colors ${!isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
                    Monthly
                  </span>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      id="billing-toggle" 
                      className="sr-only" 
                      checked={isYearly}
                      onChange={(e) => setIsYearly(e.target.checked)}
                    />
                    <label htmlFor="billing-toggle" className="block w-16 h-9 bg-primary-500 rounded-full cursor-pointer transition-all duration-300 hover:bg-primary-600">
                      <span className={`block w-7 h-7 bg-white rounded-full transform transition-transform duration-300 shadow-lg ${isYearly ? 'translate-x-8' : 'translate-x-1'} translate-y-1`}></span>
                    </label>
                  </div>
                  <span className={`text-lg font-medium transition-colors ${isYearly ? 'text-gray-900' : 'text-gray-500'}`}>
                    Yearly <span className="text-green-600 font-bold">(save 20%)</span>
                  </span>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Starter Plan */}
                  <Card className="border-2 border-gray-200 hover:border-gray-300 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="text-center mb-6">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Starter</h4>
                        <div className="text-4xl font-bold text-gray-900 mb-2">Free</div>
                        <p className="text-gray-600">Current plan</p>
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-3"></i>
                          <span className="text-gray-700">1 pitch deck generation</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-3"></i>
                          <span className="text-gray-700">Basic AI analysis</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-3"></i>
                          <span className="text-gray-700">Standard templates</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-3"></i>
                          <span className="text-gray-700">PDF export</span>
                        </div>
                      </div>

                      <Button 
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800"
                        disabled
                      >
                        Current Plan
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Professional Plan */}
                  <Card className="border-2 border-primary-500 relative hover:border-primary-600 transition-all duration-300 shadow-lg">
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-gradient-to-r from-primary-500 to-primary-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                        Recommended
                      </span>
                    </div>
                    <CardContent className="p-6">
                      <div className="text-center mb-6">
                        <h4 className="text-xl font-bold text-gray-900 mb-2">Professional</h4>
                        <div className="text-4xl font-bold text-gray-900 mb-2">
                          {isYearly ? (
                            <>
                              $23<span className="text-xl text-gray-600">/mo</span>
                              <div className="text-sm text-gray-500 line-through">$29/mo</div>
                            </>
                          ) : (
                            <>$29<span className="text-xl text-gray-600">/mo</span></>
                          )}
                        </div>
                        <p className="text-gray-600">
                          {isYearly ? 'Billed annually' : 'Billed monthly'}
                        </p>
                        {isYearly && (
                          <p className="text-sm text-green-600 font-bold mt-2 bg-green-100 px-3 py-1 rounded-full inline-block">
                            Save $72/year
                          </p>
                        )}
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-3"></i>
                          <span className="text-gray-700">Unlimited pitch decks</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-3"></i>
                          <span className="text-gray-700">Advanced AI business analysis</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-3"></i>
                          <span className="text-gray-700">Custom brand kits</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-3"></i>
                          <span className="text-gray-700">Premium templates</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-3"></i>
                          <span className="text-gray-700">CRM & contact management</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-3"></i>
                          <span className="text-gray-700">Analytics & tracking</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-check text-green-500 mr-3"></i>
                          <span className="text-gray-700">Priority support</span>
                        </div>
                      </div>

                      <Button 
                        onClick={() => handleUpgradePlan(isYearly)}
                        className="w-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white"
                      >
                        <i className="fas fa-arrow-up mr-2"></i>
                        Upgrade to Professional
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
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
