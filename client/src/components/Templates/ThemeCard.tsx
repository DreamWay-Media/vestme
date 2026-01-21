import { Lock, Star, Palette } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Theme } from "@/hooks/useThemes";

interface ThemeCardProps {
  theme: Theme;
  onClick: () => void;
  className?: string;
  isSelected?: boolean;
}

export function ThemeCard({ theme, onClick, className, isSelected = false }: ThemeCardProps) {
  const isLocked = theme.isLocked ?? false;
  
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1",
        isLocked && "opacity-75 hover:opacity-90",
        isSelected && "ring-2 ring-blue-500 ring-offset-2 shadow-lg",
        className
      )}
      onClick={onClick}
    >
      <div className="relative">
        {/* Thumbnail */}
        <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden relative">
          {theme.thumbnail ? (
            <img
              src={theme.thumbnail}
              alt={theme.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-200">
              <Palette className="h-12 w-12 text-purple-400" />
            </div>
          )}
          
          {/* Lock Overlay for Premium Themes */}
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
            {theme.isDefault && (
              <Badge variant="default" className="bg-blue-600">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Default
              </Badge>
            )}
            {theme.accessTier === 'premium' && !isLocked && (
              <Badge variant="secondary">
                Premium
              </Badge>
            )}
          </div>
          
          {/* Slide Count */}
          {theme.templates && theme.templates.length > 0 && (
            <div className="absolute bottom-2 right-2">
              <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
                {theme.templates.length} slides
              </Badge>
            </div>
          )}
        </div>
      </div>
      
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{theme.name}</CardTitle>
        {theme.description && (
          <CardDescription className="line-clamp-2">
            {theme.description}
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center gap-2 flex-wrap">
          {theme.tags && theme.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}



