import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  change?: string;
  changeType?: "increase" | "decrease";
}

export default function StatsCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  change,
  changeType = "increase",
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-material">
      <div className="flex items-center">
        <div className={cn("p-3 rounded-lg", iconBgColor)}>
          <i className={cn(icon, "text-xl", iconColor)}></i>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
      </div>
      {change && (
        <div className="mt-4">
          <div className={cn(
            "flex items-center text-sm",
            changeType === "increase" ? "text-green-600" : "text-red-600"
          )}>
            <i className={cn(
              "mr-1",
              changeType === "increase" ? "fas fa-arrow-up" : "fas fa-arrow-down"
            )}></i>
            <span>{change}</span>
            <span className="text-gray-500 ml-1">vs last month</span>
          </div>
        </div>
      )}
    </div>
  );
}
