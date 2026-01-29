import { useState } from "react";
import { ArrowLeft, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useThemeTemplates } from "@/hooks/useThemes";
import { useSubscription } from "@/hooks/useSubscription";
import { SlideCard } from "./SlideCard";
import { SlidePreviewModal } from "./SlidePreviewModal";
import { UpgradeModal } from "./UpgradeModal";
import type { Template } from "@/hooks/useTemplates";
import type { Theme } from "@/hooks/useThemes";

interface ThemeSlideGalleryProps {
  theme: Theme;
  onBack: () => void;
  onSelectTemplate?: (template: Template) => void;
  deckId?: string;
  brandKit?: any;
  businessProfile?: any;
}

export function ThemeSlideGallery({
  theme,
  onBack,
  onSelectTemplate,
  deckId,
  brandKit,
  businessProfile,
}: ThemeTemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { data: subscription } = useSubscription();
  const { data: templates, isLoading } = useThemeTemplates(theme.id);
  
  const handleTemplateClick = (template: Template) => {
    if (template.isLocked) {
      setShowUpgradeModal(true);
    } else {
      if (onSelectTemplate) {
        onSelectTemplate(template);
      } else {
        setSelectedTemplate(template);
      }
    }
  };
  
  const handleApplyTemplate = (content: any) => {
    setSelectedTemplate(null);
  };
  
  // Filter templates by category and search
  const filteredTemplates = templates?.filter((template) => {
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  }) || [];
  
  return (
    <div className="space-y-6">
      {/* Header with theme info */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Themes
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{theme.name}</h2>
            <Badge variant={theme.accessTier === 'premium' ? 'default' : 'secondary'}>
              {theme.accessTier}
            </Badge>
            {theme.isDefault && (
              <Badge variant="outline">Default</Badge>
            )}
          </div>
          <p className="text-gray-600 mt-1">{theme.description}</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="title">Title</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="closing">Closing</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search slides..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      
      {/* Slide Count */}
      <div className="text-sm text-gray-600">
        {filteredTemplates.length} slide{filteredTemplates.length !== 1 ? 's' : ''} in this theme
      </div>
      
      {/* Templates Grid */}
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
      ) : filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <SlideCard
              key={template.id}
              template={template}
              onClick={() => handleTemplateClick(template)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Filter className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No slides found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedCategory !== "all"
              ? "Try adjusting your search or filters"
              : "No slides available in this theme"}
          </p>
        </div>
      )}
      
      {/* Slide Preview Modal */}
      {selectedTemplate && !onSelectTemplate && (
        <SlidePreviewModal
          template={selectedTemplate}
          brandKit={brandKit}
          deckId={deckId}
          businessProfile={businessProfile}
          onClose={() => setSelectedTemplate(null)}
          onApply={handleApplyTemplate}
        />
      )}
      
      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          lockedTemplatesCount={filteredTemplates.filter((t) => t.isLocked).length}
        />
      )}
    </div>
  );
}


