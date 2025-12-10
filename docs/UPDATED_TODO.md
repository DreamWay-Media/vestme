# 📝 Updated Todo List

Based on a comprehensive analysis of the codebase, documentation, and inline TODO comments, here is the prioritized action plan.

## 🚨 High Priority: Template System Frontend (Phases 5-7)

The backend for the template system is complete, but the user-facing frontend is missing.

- [ ] **Template Gallery UI** (Phase 5)
    - [ ] Create `TemplateGallery` component with grid layout
    - [ ] Implement category filters (Title, Content, Data, Closing)
    - [ ] Add search functionality
    - [ ] Implement "Preview" modal with Brand Kit application
    - [ ] Connect "Browse Templates" button in `QuickActions.tsx` (currently `TODO`)

- [ ] **Upgrade Flow & Monetization** (Phase 6)
    - [ ] Implement Stripe checkout integration in `UpgradeModal.tsx`
    - [ ] Connect "Upgrade to Pro" button to actual payment flow
    - [ ] Handle successful payment and subscription status updates

- [ ] **Admin Dashboard** (Phase 7)
    - [ ] Create Template Management interface
    - [ ] Add ability to set "Default" template
    - [ ] Add controls to toggle Access Tier (Free/Premium)
    - [ ] Add "Re-save" functionality to migrate templates to new format (fix for content mapping bug)

## 🛠️ Medium Priority: Code Refinements & UX Improvements

Specific TODOs found in the codebase that improve user experience.

- [ ] **New Project Flow** (`NewProjectModal.tsx`)
    - [ ] Auto-advance to "Brand Kit" tab after project creation
    - [ ] Auto-advance to "Pitch Deck" tab after Brand Kit creation
    - [ ] Enable "Pitch Deck" and "Campaign" tabs when prerequisites are met

- [ ] **Template Manager Backend** (`templateManager.ts`)
    - [ ] Pass `businessProfile` correctly to `buildSlideFromTemplate` for AI content generation
    - [ ] Improve `getAllTemplates` filtering with a proper query builder

## 🔮 Low Priority: Future Enhancements

- [ ] **Advanced Template Features**
    - [ ] Add real chart rendering (recharts)
    - [ ] Add animations (fade, slide)
    - [ ] Add text effects (shadows, outlines)

- [ ] **Security & Performance**
    - [ ] Review `SECURITY_ACTION_PLAN.md` for outstanding security items
    - [ ] Optimize PDF generation (currently handled separately)

## 🐛 Known Issues to Verify

- [ ] **Template Content Mapping**: Ensure all templates are re-saved from Design Studio to fix the content mapping bug (detailed in `BUGFIX_SUMMARY.md`).
