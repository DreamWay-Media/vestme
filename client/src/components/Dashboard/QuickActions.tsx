import { useState } from "react";
import { useLocation } from "wouter";
import NewProjectModal from "../Projects/NewProjectModal";

export default function QuickActions() {
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [, setLocation] = useLocation();

  return (
    <>
      <div className="bg-white rounded-xl shadow-material p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="space-y-3">
          <button 
            onClick={() => setShowNewProjectModal(true)}
            className="w-full flex items-center p-3 text-left bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
          >
            <div className="p-2 bg-primary-500 rounded-lg mr-3">
              <i className="fas fa-plus text-white text-sm"></i>
            </div>
            <div>
              <p className="font-medium text-gray-900">Start New Project</p>
              <p className="text-sm text-gray-600">Create a new pitch deck</p>
            </div>
          </button>

          <button 
            onClick={() => setLocation("/crm/contacts/import")}
            className="w-full flex items-center p-3 text-left bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="p-2 bg-gray-500 rounded-lg mr-3">
              <i className="fas fa-upload text-white text-sm"></i>
            </div>
            <div>
              <p className="font-medium text-gray-900">Import Contacts</p>
              <p className="text-sm text-gray-600">Add to your CRM</p>
            </div>
          </button>

          <button 
            onClick={() => {/* TODO: Implement templates view */}}
            className="w-full flex items-center p-3 text-left bg-accent-50 rounded-lg hover:bg-accent-100 transition-colors"
          >
            <div className="p-2 bg-accent-500 rounded-lg mr-3">
              <i className="fas fa-template text-white text-sm"></i>
            </div>
            <div>
              <p className="font-medium text-gray-900">Browse Templates</p>
              <p className="text-sm text-gray-600">Deck templates library</p>
            </div>
          </button>
        </div>
      </div>

      <NewProjectModal 
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
      />
    </>
  );
}
