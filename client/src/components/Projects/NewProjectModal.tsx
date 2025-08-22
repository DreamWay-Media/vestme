import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DiscoveryForm from "./DiscoveryForm";
import BrandKitGenerator from "./BrandKitGenerator";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "discovery" | "brand" | "deck" | "campaign";

const tabs = [
  { id: "discovery" as Tab, name: "Discovery", icon: "fas fa-search", enabled: true },
  { id: "brand" as Tab, name: "Brand Kit", icon: "fas fa-palette", enabled: false },
  { id: "deck" as Tab, name: "Pitch Deck", icon: "fas fa-presentation", enabled: false },
  { id: "campaign" as Tab, name: "Campaign", icon: "fas fa-rocket", enabled: false },
];

export default function NewProjectModal({ isOpen, onClose }: NewProjectModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("discovery");
  const [project, setProject] = useState<any>(null);

  const handleProjectCreated = (newProject: any) => {
    setProject(newProject);
    // TODO: Move to next tab when project is created
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Create a professional pitch deck by providing your business information and letting AI analyze your startup.
          </DialogDescription>
        </DialogHeader>

        {/* Project Workflow Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.enabled && setActiveTab(tab.id)}
                className={cn(
                  "flex items-center px-6 py-3 font-medium transition-colors",
                  activeTab === tab.id
                    ? "text-primary-600 border-b-2 border-primary-500"
                    : tab.enabled
                    ? "text-gray-500 hover:text-gray-700"
                    : "text-gray-300 cursor-not-allowed"
                )}
                disabled={!tab.enabled}
              >
                <i className={cn(tab.icon, "mr-2")}></i>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto max-h-[60vh]">
          {activeTab === "discovery" && (
            <DiscoveryForm 
              onProjectCreated={handleProjectCreated}
              onClose={onClose}
            />
          )}
          
          {activeTab === "brand" && project && (
            <BrandKitGenerator 
              projectId={project.id}
              businessProfile={project.businessProfile}
              onBrandKitCreated={() => {
                // TODO: Move to next tab when brand kit is created
              }}
            />
          )}
          
          {activeTab === "deck" && (
            <div className="p-6 text-center">
              <p className="text-gray-600">Pitch Deck generation will be available after completing Brand Kit.</p>
            </div>
          )}
          
          {activeTab === "campaign" && (
            <div className="p-6 text-center">
              <p className="text-gray-600">Campaign setup will be available after generating your Pitch Deck.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
