import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Layout from "@/components/Layout";
import StatsCard from "@/components/Dashboard/StatsCard";
import RecentProjects from "@/components/Dashboard/RecentProjects";
import QuickActions from "@/components/Dashboard/QuickActions";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import NewProjectModal from "@/components/Projects/NewProjectModal";

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);

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
        }, 2000);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalProjects: number;
    generatedDecks: number;
    campaignsSent: number;
    totalViews: number;
  }>({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

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
      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Welcome back! Here's what's happening with your projects.</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button 
              onClick={() => setShowNewProjectModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors shadow-material"
            >
              <i className="fas fa-plus mr-2"></i>
              New Project
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Projects"
          value={stats?.totalProjects || 0}
          icon="fas fa-project-diagram"
          iconBgColor="bg-primary-50"
          iconColor="text-primary-500"
          change="+2.5%"
          changeType="increase"
        />
        <StatsCard
          title="Generated Decks"
          value={stats?.generatedDecks || 0}
          icon="fas fa-file-alt"
          iconBgColor="bg-accent-50"
          iconColor="text-accent-500"
          change="+12.3%"
          changeType="increase"
        />
        <StatsCard
          title="Campaigns Sent"
          value={stats?.campaignsSent || 0}
          icon="fas fa-paper-plane"
          iconBgColor="bg-green-50"
          iconColor="text-green-500"
          change="+8.1%"
          changeType="increase"
        />
        <StatsCard
          title="Total Views"
          value={stats?.totalViews || 0}
          icon="fas fa-eye"
          iconBgColor="bg-blue-50"
          iconColor="text-blue-500"
          change="+15.7%"
          changeType="increase"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects */}
        <div className="lg:col-span-2">
          <RecentProjects />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <QuickActions />
        </div>
      </div>

      {/* New Project Modal */}
      <NewProjectModal 
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
      />
    </Layout>
  );
}
