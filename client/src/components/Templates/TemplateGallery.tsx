import { useState } from "react";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTemplates } from "@/hooks/useTemplates";
import { useSubscription } from "@/hooks/useSubscription";
import { TemplateCard } from "./TemplateCard";
import { TemplatePreviewModal } from "./TemplatePreviewModal";
import { UpgradeModal } from "./UpgradeModal";
import type { Template } from "@/hooks/useTemplates";

interface TemplateGalleryProps {
  onSelectTemplate?: (template: Template) => void;
  deckId?: string;
  brandKit?: any;
  businessProfile?: any;
}

export function TemplateGallery({ onSelectTemplate, deckId, brandKit, businessProfile }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const { data: subscription } = useSubscription();
  const { data: templates, isLoading } = useTemplates({
    category: selectedCategory === "all" ? undefined : selectedCategory,
    search: searchTerm || undefined,
  });
  
  const handleTemplateClick = (template: Template) => {
    if (template.isLocked) {
      // Show upgrade modal for locked templates
      setShowUpgradeModal(true);
    } else {
      // If onSelectTemplate is provided (used in deck-viewer), call it directly
      // Otherwise, show our own preview modal (standalone usage)
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
  
  // Group templates by category for display
  const groupedTemplates = templates?.reduce((acc, template) => {
    const category = template.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Choose a Template</h2>
          <p className="text-gray-600 mt-1">
            {subscription?.isPremium
              ? "You have access to all templates"
              : "Free users have access to 3 templates"}
          </p>
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
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
      ) : templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <TemplateCard
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
          <p className="text-gray-600">
            {searchTerm
              ? "Try adjusting your search or filters"
              : "No templates available in this category"}
          </p>
        </div>
      )}
      
      {/* Template Count & Upgrade Prompt */}
      {!subscription?.isPremium && templates && templates.length > 0 && (
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Unlock {templates.filter((t) => t.isLocked).length} Premium Templates
              </h3>
              <p className="text-gray-600 mt-1">
                Get access to all professional templates with VestMe Pro
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
      
      {/* Template Preview Modal - Only render in standalone mode */}
      {selectedTemplate && !onSelectTemplate && (
        <TemplatePreviewModal
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
          lockedTemplatesCount={templates?.filter((t) => t.isLocked).length || 0}
        />
      )}
    </div>
  );
}

