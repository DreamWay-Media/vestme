import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const brandKitSchema = z.object({
  name: z.string().min(1, "Brand kit name is required"),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  fontFamily: z.string().min(1, "Font family is required"),
});

type BrandKitForm = z.infer<typeof brandKitSchema>;

interface BrandKitGeneratorProps {
  projectId: string;
  businessProfile?: any;
  onBrandKitCreated?: (brandKit: any) => void;
}

const colorPalettes = [
  {
    name: "Professional Blue",
    primary: "#2563EB",
    secondary: "#64748B",
    accent: "#F59E0B"
  },
  {
    name: "Modern Purple",
    primary: "#7C3AED",
    secondary: "#6B7280",
    accent: "#10B981"
  },
  {
    name: "Tech Green",
    primary: "#059669",
    secondary: "#374151",
    accent: "#F97316"
  },
  {
    name: "Creative Orange",
    primary: "#EA580C",
    secondary: "#4B5563",
    accent: "#8B5CF6"
  },
  {
    name: "Financial Navy",
    primary: "#1E40AF",
    secondary: "#64748B",
    accent: "#DC2626"
  },
  {
    name: "Healthcare Teal",
    primary: "#0D9488",
    secondary: "#6B7280",
    accent: "#F59E0B"
  }
];

const fontOptions = [
  { value: "Inter", label: "Inter (Modern & Clean)" },
  { value: "Roboto", label: "Roboto (Professional)" },
  { value: "Poppins", label: "Poppins (Friendly)" },
  { value: "Open Sans", label: "Open Sans (Readable)" },
  { value: "Montserrat", label: "Montserrat (Elegant)" },
  { value: "Source Sans Pro", label: "Source Sans Pro (Technical)" },
  { value: "Lato", label: "Lato (Approachable)" },
  { value: "Nunito", label: "Nunito (Playful)" }
];

export default function BrandKitGenerator({ 
  projectId, 
  businessProfile, 
  onBrandKitCreated 
}: BrandKitGeneratorProps) {
  const [selectedPalette, setSelectedPalette] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BrandKitForm>({
    resolver: zodResolver(brandKitSchema),
    defaultValues: {
      name: `Brand Kit ${new Date().getFullYear()}`,
      primaryColor: "#2563EB",
      secondaryColor: "#64748B", 
      accentColor: "#F59E0B",
      fontFamily: "Inter"
    }
  });

  const createBrandKitMutation = useMutation({
    mutationFn: async (data: BrandKitForm) => {
      return await apiRequest(`/api/projects/${projectId}/brand-kits`, "POST", data);
    },
    onSuccess: (brandKit) => {
      toast({
        title: "Success",
        description: "Brand kit created successfully!"
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/brand-kits`] });
      onBrandKitCreated?.(brandKit);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create brand kit",
        variant: "destructive"
      });
    }
  });

  const generateAIBrandKit = async () => {
    if (!businessProfile) {
      toast({
        title: "Error",
        description: "Complete business discovery first to generate AI brand suggestions",
        variant: "destructive"
      });
      return;
    }

    // Simulate AI-generated brand suggestions based on industry and business profile
    const industry = businessProfile.industry?.toLowerCase() || "";
    let suggestedPalette = 0; // Default to Professional Blue
    
    if (industry.includes("tech") || industry.includes("software")) {
      suggestedPalette = 2; // Tech Green
    } else if (industry.includes("health") || industry.includes("medical")) {
      suggestedPalette = 5; // Healthcare Teal  
    } else if (industry.includes("finance") || industry.includes("bank")) {
      suggestedPalette = 4; // Financial Navy
    } else if (industry.includes("creative") || industry.includes("design")) {
      suggestedPalette = 3; // Creative Orange
    } else if (industry.includes("startup") || industry.includes("modern")) {
      suggestedPalette = 1; // Modern Purple
    }

    const palette = colorPalettes[suggestedPalette];
    setSelectedPalette(suggestedPalette);
    
    form.setValue("name", `${businessProfile.companyName || "Company"} Brand Kit`);
    form.setValue("primaryColor", palette.primary);
    form.setValue("secondaryColor", palette.secondary);
    form.setValue("accentColor", palette.accent);

    toast({
      title: "AI Suggestions Applied",
      description: `Generated brand kit based on your ${industry} business profile`
    });
  };

  const applyPalette = (index: number) => {
    const palette = colorPalettes[index];
    setSelectedPalette(index);
    form.setValue("primaryColor", palette.primary);
    form.setValue("secondaryColor", palette.secondary);
    form.setValue("accentColor", palette.accent);
  };

  const onSubmit = (data: BrandKitForm) => {
    createBrandKitMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* AI Brand Kit Generator */}
      {businessProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <i className="fas fa-magic mr-2 text-purple-600"></i>
              AI Brand Kit Generator
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Let AI create a personalized brand kit based on your business analysis and industry.
            </p>
            <Button 
              onClick={generateAIBrandKit}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <i className="fas fa-wand-magic-sparkles mr-2"></i>
              Generate AI Brand Kit
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Color Palette Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Color Palette</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {colorPalettes.map((palette, index) => (
              <div
                key={index}
                onClick={() => applyPalette(index)}
                className={cn(
                  "p-4 border-2 rounded-lg cursor-pointer transition-all",
                  selectedPalette === index
                    ? "border-primary-500 shadow-lg"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: palette.primary }}
                  />
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: palette.secondary }}
                  />
                  <div 
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: palette.accent }}
                  />
                </div>
                <h4 className="font-medium text-sm">{palette.name}</h4>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Brand Kit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Kit Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Kit Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter brand kit name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input type="color" className="w-12 h-10" {...field} />
                          <Input placeholder="#2563EB" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="secondaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input type="color" className="w-12 h-10" {...field} />
                          <Input placeholder="#64748B" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accent Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-2">
                          <Input type="color" className="w-12 h-10" {...field} />
                          <Input placeholder="#F59E0B" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fontFamily"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Font Family</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a font" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {fontOptions.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Color Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-3">Brand Preview</h4>
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-16 h-16 rounded-lg shadow-sm flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: form.watch("primaryColor") }}
                  >
                    A
                  </div>
                  <div 
                    className="w-16 h-16 rounded-lg shadow-sm flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: form.watch("secondaryColor") }}
                  >
                    B
                  </div>
                  <div 
                    className="w-16 h-16 rounded-lg shadow-sm flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: form.watch("accentColor") }}
                  >
                    C
                  </div>
                  <div className="flex-1 p-4 bg-white rounded-lg shadow-sm">
                    <div 
                      style={{ 
                        fontFamily: form.watch("fontFamily"),
                        color: form.watch("primaryColor")
                      }}
                    >
                      <div className="text-lg font-bold">Company Name</div>
                      <div className="text-sm" style={{ color: form.watch("secondaryColor") }}>
                        Your business tagline here
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  type="submit"
                  disabled={createBrandKitMutation.isPending}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  {createBrandKitMutation.isPending ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Creating Brand Kit...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save mr-2"></i>
                      Create Brand Kit
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}