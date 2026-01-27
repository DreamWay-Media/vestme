import { useState } from "react";
import { ThemeSelector } from "./ThemeSelector";
import { ThemeSlideGallery } from "./ThemeSlideGallery";
import type { Template } from "@/hooks/useTemplates";
import type { Theme } from "@/hooks/useThemes";

interface SlideGalleryProps {
  onSelectTemplate?: (template: Template) => void;
  deckId?: string;
  brandKit?: any;
  businessProfile?: any;
  themeId?: string; // Optional: pre-select a theme
}

export function SlideGallery({ onSelectTemplate, deckId, brandKit, businessProfile, themeId }: SlideGalleryProps) {
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  
  // If themeId is provided, we should fetch and set it
  // For now, we'll handle theme selection via user interaction
  
  const handleThemeSelect = (theme: Theme) => {
    setSelectedTheme(theme);
  };
  
  const handleBackToThemes = () => {
    setSelectedTheme(null);
  };
  
  // If a theme is selected, show slides from that theme
  if (selectedTheme) {
    return (
      <ThemeSlideGallery
        theme={selectedTheme}
        onBack={handleBackToThemes}
        onSelectTemplate={onSelectTemplate}
        deckId={deckId}
        brandKit={brandKit}
        businessProfile={businessProfile}
      />
    );
  }
  
  // Otherwise, show theme selector
  return (
    <ThemeSelector
      onSelectTheme={handleThemeSelect}
      selectedThemeId={themeId}
    />
  );
}

