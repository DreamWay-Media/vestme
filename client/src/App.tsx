import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import CreateProject from "@/pages/create-project";
import ProjectDiscovery from "@/pages/project-discovery";
import ProjectBrandKit from "@/pages/project-brand-kit";
import ProjectGenerateDeck from "@/pages/project-generate-deck";
import ProjectCampaign from "@/pages/project-campaign";
import ProjectAnalytics from "@/pages/project-analytics";
import CRM from "@/pages/crm";
import ContactEdit from "@/pages/contact-edit";
import ContactImport from "@/pages/contact-import";
import AudienceEdit from "@/pages/audience-edit";
import Settings from "@/pages/settings";
import ProjectSettings from "@/pages/project-settings";
import DeckViewer from "@/pages/deck-viewer";
import { AuthCallback } from "@/pages/auth-callback";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/auth/callback" component={AuthCallback} />
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/projects/new" component={CreateProject} />
          <Route path="/projects/:projectId/discovery" component={ProjectDiscovery} />
          <Route path="/projects/:projectId/brand-kit" component={ProjectBrandKit} />
          <Route path="/projects/:projectId/generate-deck" component={ProjectGenerateDeck} />
          <Route path="/projects/:projectId/campaign" component={ProjectCampaign} />
          <Route path="/projects/:projectId/analytics" component={ProjectAnalytics} />
          <Route path="/projects/:projectId/settings" component={ProjectSettings} />
          <Route path="/crm" component={CRM} />
          <Route path="/crm/contacts/import" component={ContactImport} />
          <Route path="/crm/contacts/:contactId" component={ContactEdit} />
          <Route path="/crm/audiences/:audienceId" component={AudienceEdit} />
          <Route path="/settings" component={Settings} />
          <Route path="/deck-viewer/:deckId" component={({ params }) => <DeckViewer deckId={params.deckId} />} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
