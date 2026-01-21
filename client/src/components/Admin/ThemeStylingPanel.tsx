import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface ThemeStyling {
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
    contrast?: string;
  };
  typography: {
    fontFamily: string;
    titleSize: string;
    bodySize: string;
  };
  background: {
    type: 'solid' | 'gradient';
    color?: string;
    gradientStops?: Array<{ color: string; position: number }>;
  };
  style: 'minimal' | 'bold' | 'modern' | 'classic';
}

interface ThemeStylingPanelProps {
  styling: ThemeStyling;
  onChange: (styling: ThemeStyling) => void;
}

export function ThemeStylingPanel({ styling, onChange }: ThemeStylingPanelProps) {
  const updateColorScheme = (key: keyof ThemeStyling['colorScheme'], value: string) => {
    onChange({
      ...styling,
      colorScheme: {
        ...styling.colorScheme,
        [key]: value,
      },
    });
  };

  const updateTypography = (key: keyof ThemeStyling['typography'], value: string) => {
    onChange({
      ...styling,
      typography: {
        ...styling.typography,
        [key]: value,
      },
    });
  };

  const updateBackground = (updates: Partial<ThemeStyling['background']>) => {
    onChange({
      ...styling,
      background: {
        ...styling.background,
        ...updates,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Color Scheme */}
      <Card>
        <CardHeader>
          <CardTitle>Color Scheme</CardTitle>
          <CardDescription>Define the primary colors for this theme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={styling.colorScheme.primary}
                onChange={(e) => updateColorScheme('primary', e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={styling.colorScheme.primary}
                onChange={(e) => updateColorScheme('primary', e.target.value)}
                className="flex-1"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Secondary Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={styling.colorScheme.secondary}
                onChange={(e) => updateColorScheme('secondary', e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={styling.colorScheme.secondary}
                onChange={(e) => updateColorScheme('secondary', e.target.value)}
                className="flex-1"
                placeholder="#64748B"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Accent Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={styling.colorScheme.accent}
                onChange={(e) => updateColorScheme('accent', e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={styling.colorScheme.accent}
                onChange={(e) => updateColorScheme('accent', e.target.value)}
                className="flex-1"
                placeholder="#10B981"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Contrast Color (Optional)</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={styling.colorScheme.contrast || '#FFFFFF'}
                onChange={(e) => updateColorScheme('contrast', e.target.value)}
                className="w-20 h-10"
              />
              <Input
                value={styling.colorScheme.contrast || '#FFFFFF'}
                onChange={(e) => updateColorScheme('contrast', e.target.value)}
                className="flex-1"
                placeholder="#FFFFFF"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Typography */}
      <Card>
        <CardHeader>
          <CardTitle>Typography</CardTitle>
          <CardDescription>Set font family and sizes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Font Family</Label>
            <Select
              value={styling.typography.fontFamily}
              onValueChange={(value) => updateTypography('fontFamily', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
                <SelectItem value="Open Sans">Open Sans</SelectItem>
                <SelectItem value="Lato">Lato</SelectItem>
                <SelectItem value="Montserrat">Montserrat</SelectItem>
                <SelectItem value="Poppins">Poppins</SelectItem>
                <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                <SelectItem value="Merriweather">Merriweather</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title Font Size</Label>
            <Select
              value={styling.typography.titleSize}
              onValueChange={(value) => updateTypography('titleSize', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text-3xl">Small (3xl)</SelectItem>
                <SelectItem value="text-4xl">Medium (4xl)</SelectItem>
                <SelectItem value="text-5xl">Large (5xl)</SelectItem>
                <SelectItem value="text-6xl">Extra Large (6xl)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Body Font Size</Label>
            <Select
              value={styling.typography.bodySize}
              onValueChange={(value) => updateTypography('bodySize', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text-sm">Small (sm)</SelectItem>
                <SelectItem value="text-base">Base</SelectItem>
                <SelectItem value="text-lg">Large (lg)</SelectItem>
                <SelectItem value="text-xl">Extra Large (xl)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Background */}
      <Card>
        <CardHeader>
          <CardTitle>Background Style</CardTitle>
          <CardDescription>Choose background type and color</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Background Type</Label>
            <Select
              value={styling.background.type}
              onValueChange={(value: 'solid' | 'gradient') => updateBackground({ type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid Color</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {styling.background.type === 'solid' && (
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styling.background.color || '#FFFFFF'}
                  onChange={(e) => updateBackground({ color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={styling.background.color || '#FFFFFF'}
                  onChange={(e) => updateBackground({ color: e.target.value })}
                  className="flex-1"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          )}

          {styling.background.type === 'gradient' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Gradient Start Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={styling.background.gradientStops?.[0]?.color || '#FFFFFF'}
                    onChange={(e) => {
                      const stops = styling.background.gradientStops || [
                        { color: '#FFFFFF', position: 0 },
                        { color: '#F3F4F6', position: 100 },
                      ];
                      stops[0].color = e.target.value;
                      updateBackground({ gradientStops: stops });
                    }}
                    className="w-20 h-10"
                  />
                  <Input
                    value={styling.background.gradientStops?.[0]?.color || '#FFFFFF'}
                    onChange={(e) => {
                      const stops = styling.background.gradientStops || [
                        { color: '#FFFFFF', position: 0 },
                        { color: '#F3F4F6', position: 100 },
                      ];
                      stops[0].color = e.target.value;
                      updateBackground({ gradientStops: stops });
                    }}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Gradient End Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={styling.background.gradientStops?.[1]?.color || '#F3F4F6'}
                    onChange={(e) => {
                      const stops = styling.background.gradientStops || [
                        { color: '#FFFFFF', position: 0 },
                        { color: '#F3F4F6', position: 100 },
                      ];
                      stops[1].color = e.target.value;
                      updateBackground({ gradientStops: stops });
                    }}
                    className="w-20 h-10"
                  />
                  <Input
                    value={styling.background.gradientStops?.[1]?.color || '#F3F4F6'}
                    onChange={(e) => {
                      const stops = styling.background.gradientStops || [
                        { color: '#FFFFFF', position: 0 },
                        { color: '#F3F4F6', position: 100 },
                      ];
                      stops[1].color = e.target.value;
                      updateBackground({ gradientStops: stops });
                    }}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Design Style */}
      <Card>
        <CardHeader>
          <CardTitle>Design Style</CardTitle>
          <CardDescription>Overall aesthetic of the theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Style</Label>
            <Select
              value={styling.style}
              onValueChange={(value: ThemeStyling['style']) => {
                onChange({
                  ...styling,
                  style: value,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">Minimal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="classic">Classic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




