import { useState, useEffect } from "react";
import { Search, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useThemes } from "@/hooks/useThemes";
import { useSubscription } from "@/hooks/useSubscription";
import { ThemeCard } from "./ThemeCard";
import { UpgradeModal } from "./UpgradeModal";
import type { Theme } from "@/hooks/useThemes";

interface ThemeGalleryProps {
  onSelectTheme?: (theme: Theme) => void;
  selectedThemeId?: string | null;
}

export function ThemeGallery({ onSelectTheme, selectedThemeId }: ThemeGalleryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { data: subscription } = useSubscription();
  const { data: themes, isLoading, error } = useThemes({
    search: searchTerm || undefined,
  });
  
  const handleThemeClick = (theme: Theme) => {
    if (theme.isLocked) {
      // Show upgrade modal for locked themes
      setShowUpgradeModal(true);
    } else {
      // If onSelectTheme is provided, call it directly
      // Otherwise, set selected theme for internal handling
      if (onSelectTheme) {
        onSelectTheme(theme);
      } else {
        setSelectedTheme(theme);
      }
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Choose a Theme</h2>
          <p className="text-gray-600 mt-1">
            {subscription?.isPremium
              ? "Select a theme to see all related templates"
              : "Free users have access to free themes"}
          </p>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search themes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <Palette className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading themes</h3>
          <p className="text-gray-600 mb-4">
            {error instanceof Error ? error.message : 'Failed to fetch themes'}
          </p>
          <p className="text-sm text-gray-500">
            Check the browser console for more details
          </p>
        </div>
      )}
      
      {/* Themes Grid */}
      {!error && isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="aspect-video w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : !error && themes && themes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              onClick={() => handleThemeClick(theme)}
              isSelected={selectedThemeId === theme.id}
            />
          ))}
        </div>
      ) : !error ? (
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
      ) : null}
      
      {/* Theme Count & Upgrade Prompt */}
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




