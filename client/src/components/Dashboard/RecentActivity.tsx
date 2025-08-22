import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  metadata?: any;
}

const getActivityIcon = (action: string) => {
  switch (action) {
    case "project_created":
      return "fas fa-plus text-blue-600";
    case "business_analyzed":
      return "fas fa-brain text-purple-600";
    case "deck_generated":
      return "fas fa-check text-green-600";
    case "campaign_sent":
      return "fas fa-paper-plane text-accent-600";
    case "brand_kit_created":
      return "fas fa-palette text-pink-600";
    default:
      return "fas fa-info text-gray-600";
  }
};

const getActivityBgColor = (action: string) => {
  switch (action) {
    case "project_created":
      return "bg-blue-100";
    case "business_analyzed":
      return "bg-purple-100";
    case "deck_generated":
      return "bg-green-100";
    case "campaign_sent":
      return "bg-accent-100";
    case "brand_kit_created":
      return "bg-pink-100";
    default:
      return "bg-gray-100";
  }
};

export default function RecentActivity() {
  const { data: activities, isLoading } = useQuery<Activity[]>({
    queryKey: ["/api/dashboard/recent-activities"],
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-material p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-material p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-history text-gray-400 text-xl"></i>
          </div>
          <p className="text-gray-600">No recent activity to show.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-material p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      <div className="space-y-4">
        {activities.map((activity: Activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center mt-0.5",
              getActivityBgColor(activity.action)
            )}>
              <i className={cn(getActivityIcon(activity.action), "text-xs")}></i>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-900">{activity.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <a href="/activities" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View all activity
        </a>
      </div>
    </div>
  );
}
