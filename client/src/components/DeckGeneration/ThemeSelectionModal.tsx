import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeGallery } from "@/components/Templates/ThemeGallery";
import type { Theme } from "@/hooks/useThemes";

interface ThemeSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTheme: (theme: Theme) => void;
  selectedThemeId?: string | null;
  title?: string;
  description?: string;
}

export function ThemeSelectionModal({
  open,
  onOpenChange,
  onSelectTheme,
  selectedThemeId,
  title = "Choose a Theme",
  description = "Select a theme for your pitch deck. Premium themes require a subscription.",
}: ThemeSelectionModalProps) {
  const handleThemeSelect = (theme: Theme) => {
    onSelectTheme(theme);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {open && <ThemeGallery onSelectTheme={handleThemeSelect} selectedThemeId={selectedThemeId} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}



