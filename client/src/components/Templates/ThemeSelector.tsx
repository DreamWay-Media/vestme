import { useState } from "react";
import { Search, Palette, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemes } from "@/hooks/useThemes";
import { useSubscription } from "@/hooks/useSubscription";
import { ThemeCard } from "./ThemeCard";
import { UpgradeModal } from "./UpgradeModal";
import type { Theme } from "@/hooks/useThemes";

interface ThemeSelectorProps {
  onSelectTheme: (theme: Theme) => void;
  selectedThemeId?: string;
}

export function ThemeSelector({ onSelectTheme, selectedThemeId }: ThemeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { data: subscription } = useSubscription();
  const { data: themes, isLoading } = useThemes({
    search: searchTerm || undefined,
  });
  
  const handleThemeClick = (theme: Theme) => {
    if (theme.isLocked) {
      setShowUpgradeModal(true);
    } else {
      onSelectTheme(theme);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Choose a Theme</h2>
        <p className="text-gray-600 mt-1">
          Select a theme to see all related slides. All slides in a theme share the same visual style.
        </p>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search themes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Themes Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : themes && themes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => (
            <div key={theme.id} className="relative">
              <ThemeCard
                theme={theme}
                onClick={() => handleThemeClick(theme)}
                className={selectedThemeId === theme.id ? "ring-2 ring-blue-500" : ""}
              />
              {selectedThemeId === theme.id && (
                <div className="absolute top-2 right-2">
                  <Button size="sm" variant="default">
                    Selected
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Palette className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No themes found</h3>
          <p className="text-gray-600">
            {searchTerm
              ? "Try adjusting your search"
              : "No themes available"}
          </p>
        </div>
      )}
      
      {/* Upgrade Prompt */}
      {!subscription?.isPremium && themes && themes.length > 0 && (
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Unlock {themes.filter((t) => t.isLocked).length} Premium Themes
              </h3>
              <p className="text-gray-600 mt-1">
                Get access to all professional themes with VestMe Pro
              </p>
            </div>
            <Button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Upgrade Now
            </Button>
          </div>
        </div>
      )}
      
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          lockedTemplatesCount={themes?.filter((t) => t.isLocked).length || 0}
        />
      )}
    </div>
  );
}


