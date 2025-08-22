import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import ProjectLayoutWithHeader from "@/components/ProjectLayoutWithHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  Eye, 
  Download, 
  Clock, 
  Users,
  Mail,
  Phone
} from "lucide-react";

export default function ProjectAnalytics() {
  const params = useParams();
  const projectId = params.projectId;

  const { data: project } = useQuery({
    queryKey: ["/api/projects", projectId],
    enabled: !!projectId,
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "analytics"],
    enabled: !!projectId,
  }) as { data: any | undefined, isLoading: boolean };

  return (
    <ProjectLayoutWithHeader>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics & Insights</h1>
          <p className="text-gray-600">Track your pitch deck performance and investor engagement metrics.</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Views</p>
                  <p className="text-xl font-semibold">{analyticsLoading ? '...' : analytics?.totalViews || 0}</p>
                  <p className="text-xs text-gray-500">Campaign email opens</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Download className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Downloads</p>
                  <p className="text-xl font-semibold">{analyticsLoading ? '...' : analytics?.totalDownloads || 0}</p>
                  <p className="text-xs text-gray-500">Estimated PDF downloads</p>
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
                  <p className="text-sm text-gray-600">Campaigns Sent</p>
                  <p className="text-xl font-semibold">{analyticsLoading ? '...' : analytics?.campaignsSent || 0}</p>
                  <p className="text-xs text-gray-500">Total campaigns created</p>
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
                  <p className="text-sm text-gray-600">Engagement Rate</p>
                  <p className="text-xl font-semibold">{analyticsLoading ? '...' : analytics?.avgEngagementRate || 0}%</p>
                  <p className="text-xs text-gray-500">Click-through rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* View Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>View Analytics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Campaign Views</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{ width: analytics?.totalViews > 0 ? '100%' : '0%' }}></div>
                    </div>
                    <span className="text-sm font-medium">{analytics?.totalViews || 0} views</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Campaigns Opened</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: analytics?.campaignsOpened > 0 ? Math.min((analytics.campaignsOpened / (analytics.totalViews || 1)) * 100, 100) + '%' : '0%' }}></div>
                    </div>
                    <span className="text-sm font-medium">{analytics?.campaignsOpened || 0} opened</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Campaigns Clicked</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: analytics?.campaignsClicked > 0 ? Math.min((analytics.campaignsClicked / (analytics.totalViews || 1)) * 100, 100) + '%' : '0%' }}></div>
                    </div>
                    <span className="text-sm font-medium">{analytics?.campaignsClicked || 0} clicked</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engagement Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Engagement Insights</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Eye className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium">Most Viewed Slide</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">Problem Statement</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium">Longest Time Spent</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">Business Model</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Download className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm font-medium">Most Downloaded</span>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Financial Projections</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.recentActivities && analytics.recentActivities.length > 0 ? (
                analytics.recentActivities.slice(0, 5).map((activity: any, index: number) => (
                  <div key={activity.id || index} className="flex items-center space-x-4 p-3 border-l-4 border-blue-500 bg-blue-50">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(activity.createdAt).toLocaleDateString()} • {activity.action}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Activity will appear here as you create campaigns and engage with investors.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600 mb-1">{analytics?.totalViews || 0}</div>
                <div className="text-sm text-gray-600">Total Views</div>
                <div className="text-xs text-gray-500 mt-1">Campaign email opens</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">{analytics?.totalDownloads || 0}</div>
                <div className="text-sm text-gray-600">Estimated Downloads</div>
                <div className="text-xs text-gray-500 mt-1">PDF downloads estimated</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-accent-600 mb-1">{analytics?.avgEngagementRate || 0}%</div>
                <div className="text-sm text-gray-600">Engagement Rate</div>
                <div className="text-xs text-gray-500 mt-1">Click-through rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProjectLayoutWithHeader>
  );
}