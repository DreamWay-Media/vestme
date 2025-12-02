import { Lock, Star, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Template } from "@/hooks/useTemplates";

interface TemplateCardProps {
  template: Template;
  onClick: () => void;
  className?: string;
}

export function TemplateCard({ template, onClick, className }: TemplateCardProps) {
  const isLocked = template.isLocked ?? false;
  
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1",
        isLocked && "opacity-75 hover:opacity-90",
        className
      )}
      onClick={onClick}
    >
      <div className="relative">
        {/* Thumbnail */}
        <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden relative">
          {template.thumbnail ? (
            <img
              src={template.thumbnail}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <span className="text-4xl text-gray-400">📄</span>
            </div>
          )}
          
          {/* Lock Overlay for Premium Templates */}
          {isLocked && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center text-white">
                <Lock className="h-10 w-10 mx-auto mb-2" />
                <p className="text-sm font-semibold">Premium</p>
                <p className="text-xs mt-1 opacity-90">Upgrade to unlock</p>
              </div>
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {template.isDefault && (
              <Badge variant="default" className="bg-blue-600">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Default
              </Badge>
            )}
            {template.accessTier === 'premium' && !isLocked && (
              <Badge variant="secondary">
                Premium
              </Badge>
            )}
          </div>
          
          {/* Usage Count */}
          {template.usageCount && template.usageCount > 0 && (
            <div className="absolute bottom-2 right-2">
              <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
                <TrendingUp className="h-3 w-3 mr-1" />
                {template.usageCount}
              </Badge>
            </div>
          )}
        </div>
      </div>
      
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{template.name}</CardTitle>
        {template.description && (
          <CardDescription className="line-clamp-2">
            {template.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {template.category}
          </Badge>
          {template.tags && template.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

