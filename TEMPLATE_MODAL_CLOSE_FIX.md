# Template Modal Close Fix - No More Empty Second Modal

## The Problem

When clicking "Apply Template", an empty second modal would appear because:

1. TemplatePreviewModal called `onApply(formData)` then immediately called `onClose()`
2. `onClose()` reopened the template gallery with `setShowTemplateGallery(true)`
3. User saw the empty gallery modal before the template was applied

## The Root Cause

**Bad flow:**
```
User clicks "Apply Template"
  ↓
Modal: onApply(formData) + onClose()
  ↓
onClose() → setShowTemplateGallery(true)
  ↓
Gallery reopens (empty!)
  ↓
handleApplyTemplate applies template
  ↓
Success handler closes gallery
  ↓
Result: User sees empty gallery briefly!
```

## The Fix

### 1. Modal Doesn't Close Itself
**File**: `client/src/components/Templates/TemplatePreviewModal.tsx`

```typescript
// ❌ Before
if (onApply) {
  onApply(formData);
  onClose();  // This reopened the gallery!
  return;
}

// ✅ After
if (onApply) {
  onApply(formData);
  // Don't call onClose() - let deck-viewer handle closing
  return;
}
```

### 2. Deck-Viewer Closes Modal in onApply
**File**: `client/src/pages/deck-viewer.tsx`

```typescript
// ❌ Before
onApply={handleApplyTemplate}

// ✅ After
onApply={(content) => {
  // Close preview modal IMMEDIATELY
  setSelectedTemplate(null);
  // Then apply template
  handleApplyTemplate(content);
}}
```

### 3. Success Handlers Close Gallery
Already working correctly:

```typescript
onSuccess: () => {
  setShowTemplateGallery(false);  // ✅ Closes gallery
  setSelectedTemplate(null);
  setApplyingToSlideId(null);
  toast({ title: "Template Applied" });
}
```

## Fixed Flow

**Good flow:**
```
User clicks "Apply Template"
  ↓
Modal: onApply(formData) only
  ↓
deck-viewer onApply:
  - Close preview modal (setSelectedTemplate(null))
  - Call handleApplyTemplate(content)
  ↓
handleApplyTemplate applies template
  ↓
Success handler closes gallery (setShowTemplateGallery(false))
  ↓
Result: Smooth! Template applied, all modals closed! ✅
```

## Expected Behavior Now

### Scenario 1: Create New Slide
1. Click "Templates" button
2. Select template
3. See AI-generated content
4. Click "Apply Template"
5. **Result**: 
   - Preview modal closes immediately ✅
   - Gallery closes ✅
   - New slide appears with template ✅
   - NO empty second modal! ✅

### Scenario 2: Change Existing Slide
1. Click Layout icon on slide
2. Select different template
3. See AI-generated content
4. Click "Apply Template"
5. **Result**:
   - Preview modal closes immediately ✅
   - Gallery closes ✅
   - Existing slide updates with new template ✅
   - NO empty second modal! ✅

## Files Changed

1. **client/src/components/Templates/TemplatePreviewModal.tsx**
   - Removed `onClose()` call when using `onApply` callback
   - Let parent component handle modal closure

2. **client/src/pages/deck-viewer.tsx**
   - Modified `onApply` callback to close preview modal immediately
   - Then call `handleApplyTemplate`

## Testing Checklist

- [ ] Click "Apply Template" on new slide
  - No second modal appears ✅
  - Template applies smoothly ✅
  
- [ ] Click "Apply Template" on existing slide  
  - No second modal appears ✅
  - Slide updates smoothly ✅
  
- [ ] AI content pre-populates ✅
- [ ] Template styling applies ✅
- [ ] Success toast appears ✅

## Debug Console Logs

Should see:
```
🎬 TemplatePreviewModal handleApply called
✅ Using onApply callback (deck-viewer will handle)
(Modal closes immediately)
=== handleApplyTemplate called ===
(Template applies)
✅ Template Applied
```

Should NOT see:
- Empty "Choose a Template" modal
- Gallery reopening after apply
- Multiple close/open cycles

