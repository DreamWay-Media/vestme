# Template Application Fix - Modal vs Deck-Viewer Conflict

## The Problem

When applying templates, there was a conflict between two systems trying to handle the same action:

1. **TemplatePreviewModal** had its own mutation (`useApplyTemplate`)
2. **deck-viewer** also had its own mutation logic (`handleApplyTemplate`)

This caused:
- Blank preview when clicking "Apply Changes"
- "Failed to apply template" error when clicking "Apply Template"
- Conflicting API calls

## Root Cause

The modal was checking:
```typescript
const applyTemplate = deckId ? useApplyTemplate(deckId) : null;
```

This created a mutation even when deck-viewer was providing an `onApply` callback, causing both to try to handle the template application simultaneously.

## The Fix

### 1. Conditional Mutation Creation
**File**: `client/src/components/Templates/TemplatePreviewModal.tsx`

```typescript
// Don't use mutation if onApply is provided (deck-viewer will handle it)
const applyTemplate = (deckId && !onApply) ? useApplyTemplate(deckId) : null;
```

Now the modal only creates its own mutation when:
- There's a `deckId` AND
- No `onApply` callback is provided (standalone usage)

### 2. Simplified handleApply Logic

```typescript
const handleApply = async () => {
  // If onApply callback is provided (from deck-viewer), use it
  if (onApply) {
    console.log('✅ Using onApply callback (deck-viewer will handle)');
    onApply(formData);
    onClose();
    return;
  }
  
  // Otherwise, handle it directly (for standalone usage)
  if (!applyTemplate) {
    onClose();
    return;
  }
  
  // Standalone mutation logic...
}
```

Now the flow is:
1. **Check for onApply** → If provided, use it (deck-viewer handles API)
2. **Check for mutation** → If available, use it (standalone mode)
3. **Otherwise** → Just close

### 3. deck-viewer Handles Both Scenarios

The `handleApplyTemplate` in deck-viewer already had proper logic:

```typescript
const handleApplyTemplate = (content?: any) => {
  if (applyingToSlideId) {
    // Apply to EXISTING slide
    applyTemplateToSlideMutation.mutate({ slideId, templateId, content });
  } else {
    // Create NEW slide from template
    createSlideFromTemplateMutation.mutate({ templateId, content });
  }
};
```

## Expected Behavior Now

### Scenario 1: Creating New Slide
1. User clicks "Templates" button
2. Selects a template
3. Fields auto-populate with AI content ✅
4. Clicks "Apply Template"
5. Modal calls `onApply(formData)`
6. deck-viewer's `handleApplyTemplate` creates new slide
7. Success! ✅

### Scenario 2: Changing Existing Slide
1. User clicks "Change Template" (Layout icon) on a slide
2. `applyingToSlideId` is set
3. Selects a template
4. Fields auto-populate with AI content ✅
5. Clicks "Apply Template"
6. Modal calls `onApply(formData)`
7. deck-viewer's `handleApplyTemplate` applies to existing slide
8. Success! ✅

## Console Logs to Watch For

```
🎬 TemplatePreviewModal handleApply called
Form data: { title: "...", tagline: "...", ... }
Has onApply callback: true
Has applyTemplate mutation: false  // ✅ Now false when onApply exists!
✅ Using onApply callback (deck-viewer will handle)

=== handleApplyTemplate called ===
Selected template: Hero Title Slide
Content received: { title: "...", ... }
Applying to slide ID: null (or slide-id for existing)
Mutating with: { ... }
```

## Testing Checklist

- [ ] Create new slide from template
  - Click "Templates"
  - Select template
  - See AI content populate
  - Click "Apply Template"
  - New slide appears ✅
  
- [ ] Change existing slide template
  - Click Layout icon on existing slide
  - Select different template
  - See AI content populate
  - Click "Apply Template"
  - Slide updates with new template ✅
  
- [ ] No errors in console
- [ ] Preview updates correctly
- [ ] Template styling applied

## Files Changed

1. `client/src/components/Templates/TemplatePreviewModal.tsx`
   - Conditional mutation creation
   - Simplified handleApply logic
   - Added extensive console logging

## Debug Commands

If issues persist, check console for:

```javascript
// Should see this flow:
🎬 TemplatePreviewModal handleApply called
✅ Using onApply callback (deck-viewer will handle)
=== handleApplyTemplate called ===
```

If you see:
- `⚠️ No mutation available` → Bug, shouldn't happen
- `🚀 Calling applyTemplate mutation` → Bug, modal shouldn't handle it
- Two API calls → Bug, both systems are firing

