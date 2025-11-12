/**
 * Example page showing how to integrate the Template Gallery
 * 
 * This can be integrated into your deck editing flow or shown as a standalone page
 */

import { useParams } from "wouter";
import { TemplateGallery } from "@/components/Templates";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TemplateGalleryExample() {
  const params = useParams();
  const deckId = params.deckId as string;
  
  // In a real app, you'd fetch the deck and brand kit
  // const { data: deck } = useQuery(['deck', deckId], () => fetchDeck(deckId));
  // const brandKit = deck?.brandKitId ? fetchBrandKit(deck.brandKitId) : null;
  
  // For now, using placeholder
  const brandKit = {
    primaryColor: "#3B82F6",
    secondaryColor: "#64748B",
    accentColor: "#10B981",
    fontFamily: "Inter",
    brandAssets: [],
  };
  
  const handleTemplateSelected = (template: any) => {
    console.log("Template selected:", template);
    // Navigate back to deck editor or handle as needed
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Deck
          </Button>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TemplateGallery
          deckId={deckId}
          brandKit={brandKit}
          onSelectTemplate={handleTemplateSelected}
        />
      </div>
    </div>
  );
}

