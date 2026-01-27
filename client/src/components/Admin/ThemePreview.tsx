import { Card, CardContent } from "@/components/ui/card";
import type { ThemeStyling } from "./ThemeStylingPanel";

interface ThemePreviewProps {
  styling: ThemeStyling;
  themeName?: string;
}

export function ThemePreview({ styling, themeName = "Theme Preview" }: ThemePreviewProps) {
  const backgroundStyle =
    styling.background.type === 'gradient' && 
    styling.background.gradientStops && 
    styling.background.gradientStops.length >= 2 &&
    styling.background.gradientStops[0]?.color &&
    styling.background.gradientStops[1]?.color
      ? {
          background: `linear-gradient(135deg, ${styling.background.gradientStops[0].color} 0%, ${styling.background.gradientStops[1].color} 100%)`,
        }
      : {
          backgroundColor: styling.background.color || '#FFFFFF',
        };

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div
          className="aspect-video rounded-lg p-8 flex flex-col justify-between"
          style={backgroundStyle}
        >
          {/* Header */}
          <div>
            <div
              className="text-4xl font-bold mb-2"
              style={{
                color: styling.colorScheme.primary,
                fontFamily: styling.typography.fontFamily,
                fontSize: styling.typography.titleSize === 'text-3xl' ? '1.875rem' :
                          styling.typography.titleSize === 'text-4xl' ? '2.25rem' :
                          styling.typography.titleSize === 'text-5xl' ? '3rem' : '3.75rem',
              }}
            >
              {themeName}
            </div>
            <div
              className="text-lg opacity-80"
              style={{
                color: styling.colorScheme.secondary,
                fontFamily: styling.typography.fontFamily,
                fontSize: styling.typography.bodySize === 'text-sm' ? '0.875rem' :
                          styling.typography.bodySize === 'text-base' ? '1rem' :
                          styling.typography.bodySize === 'text-lg' ? '1.125rem' : '1.25rem',
              }}
            >
              This is how your theme will look
            </div>
          </div>

          {/* Footer with accent */}
          <div className="flex items-center gap-4">
            <div
              className="px-4 py-2 rounded-md font-semibold"
              style={{
                backgroundColor: styling.colorScheme.accent,
                color: styling.colorScheme.contrast || '#FFFFFF',
                fontFamily: styling.typography.fontFamily,
              }}
            >
              Call to Action
            </div>
            <div
              className="text-sm"
              style={{
                color: styling.colorScheme.secondary,
                fontFamily: styling.typography.fontFamily,
              }}
            >
              Secondary text
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}




