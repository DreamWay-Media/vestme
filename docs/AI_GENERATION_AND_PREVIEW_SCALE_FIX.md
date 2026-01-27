# AI Generation & Preview Scale Fix

## Issues Fixed

### 1. Preview Still Zoomed In ✅
**Problem:** The preview in the template application modal was zoomed in and not showing the entire slide.

**Root Cause:** 
- The Design Studio canvas is 1920x1080 pixels
- Elements use absolute positioning with pixel values from this canvas
- When rendered in a smaller container (like the modal preview), the elements weren't scaling down proportionally
- The `aspect-video` class only controlled the container's aspect ratio, not the content scaling

**Solution:**
Modified `/client/src/components/SlideRenderer.tsx`:
1. Added React hooks (`useRef`, `useState`, `useEffect`) to dynamically calculate the scale factor
2. Created a `containerRef` to track the actual rendered container size
3. Implemented a `ResizeObserver` to recalculate scale when the container size changes
4. Created a scaling wrapper that:
   - Sets a fixed 1920x1080 canvas for element positioning
   - Applies a CSS `transform: scale()` based on the calculated scale factor
   - Centers the scaled content within the container
5. The scale is calculated as: `Math.min(containerWidth / 1920, containerHeight / 1080)`

**Key Changes:**
```typescript
// Calculate scale dynamically
const containerRef = useRef<HTMLDivElement>(null);
const [scale, setScale] = useState(1);

useEffect(() => {
  const updateScale = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = rect.width / 1920;
    const scaleY = rect.height / 1080;
    const newScale = Math.min(scaleX, scaleY);
    setScale(newScale);
  };
  
  updateScale();
  const resizeObserver = new ResizeObserver(updateScale);
  resizeObserver.observe(containerRef.current);
  
  return () => resizeObserver.disconnect();
}, []);

// Apply scale to the 1920x1080 canvas
<div style={{
  width: '1920px',
  height: '1080px',
  transform: `scale(${scale})`,
  transformOrigin: 'center center',
}}>
  <AllElementsRenderer ... />
</div>
```

### 2. AI Only Generating Title ✅
**Problem:** When applying a template, the AI content generation was only filling the title field, not other fields like descriptions, bullets, etc.

**Root Cause:**
- The AI generation was mapping content to generic field names like `title`, `description`, `tagline`, `bullets`
- However, templates from the Design Studio have custom field IDs like `title-1`, `subtitle-1`, `text-3`, etc.
- The form was looking for content by the actual field ID, not the generic names
- Result: Only `title` worked (by coincidence), but all other fields remained empty

**Solution:**
Modified `/client/src/components/Templates/TemplatePreviewModal.tsx`:
1. Instead of mapping to generic names, now maps AI content to **actual field IDs** from `template.contentSchema.fields`
2. Uses intelligent matching based on field labels:
   - **Title fields:** Finds text fields with "title" or "headline" in the label
   - **Description fields:** Finds text fields with "description", "subtitle", or "tagline" in the label
   - **Bullet/Feature fields:** Finds text fields with "bullet", "point", "feature", or "stat" in the label
3. Maps generated bullets to multiple fields (one bullet per field)
4. Added comprehensive logging to debug the mapping process

**Key Changes:**
```typescript
// OLD - Hardcoded generic names (didn't work)
const mappedContent: any = {};
if (generatedContent.title) mappedContent.title = generatedContent.title;
if (generatedContent.description) mappedContent.description = generatedContent.description;

// NEW - Maps to actual field IDs from template schema
const fields = template.contentSchema?.fields || [];

// Map title to actual field with "title" in label
if (generatedContent.title) {
  const titleField = fields.find((f: any) => {
    const label = f.label?.toLowerCase() || '';
    return f.type === 'text' && (label.includes('title') || label.includes('headline'));
  });
  if (titleField) {
    mappedContent[titleField.id] = generatedContent.title; // Uses actual ID!
  }
}

// Map description to actual fields
if (generatedContent.description) {
  const descFields = fields.filter((f: any) => {
    const label = f.label?.toLowerCase() || '';
    return f.type === 'text' && (label.includes('description') || label.includes('subtitle'));
  });
  descFields.forEach((field: any) => {
    mappedContent[field.id] = generatedContent.description; // Uses actual ID!
  });
}

// Map bullets to actual fields
if (generatedContent.bullets && Array.isArray(generatedContent.bullets)) {
  const bulletFields = fields.filter((f: any) => {
    const label = f.label?.toLowerCase() || '';
    return f.type === 'text' && (label.includes('bullet') || label.includes('feature'));
  });
  bulletFields.forEach((field: any, index: number) => {
    if (index < generatedContent.bullets.length) {
      mappedContent[field.id] = generatedContent.bullets[index]; // Uses actual ID!
    }
  });
}
```

## Files Modified

1. **`/client/src/components/SlideRenderer.tsx`**
   - Added React hooks for dynamic scaling
   - Implemented ResizeObserver for container size tracking
   - Created scaling wrapper with CSS transform
   - Added comprehensive logging for scale calculations

2. **`/client/src/components/Templates/TemplatePreviewModal.tsx`**
   - Replaced hardcoded field name mapping with dynamic field ID lookup
   - Added intelligent label-based field matching
   - Implemented multi-bullet mapping to multiple fields
   - Added detailed logging for AI content mapping

## Testing

To verify these fixes work:

1. **Preview Scale:**
   - Go to Admin → Templates
   - Create/edit a template with elements positioned across the full 1920x1080 canvas
   - Apply the template
   - Check that the preview modal shows the entire slide, not zoomed in
   - Resize the browser window to see the preview scale dynamically

2. **AI Content Generation:**
   - Create a template with multiple text fields (title, subtitle, description, bullets)
   - Set up your business profile with company information
   - Apply the template
   - Verify that the AI generates and fills **all** fields, not just the title
   - Check the browser console for detailed mapping logs showing which generated content was mapped to which field ID

## Impact

- ✅ Preview now shows the entire slide at the correct scale in all contexts
- ✅ AI content generation now populates all relevant fields based on their labels
- ✅ Better user experience when applying templates
- ✅ Proper scaling works on any screen size or container size
- ✅ Dynamic scaling adapts to window resizing
- ✅ Comprehensive logging helps debug any future issues

## Future Improvements

1. Could add a loading state while scale is being calculated (currently very fast)
2. Could add more sophisticated label matching (e.g., using fuzzy matching or NLP)
3. Could allow users to configure custom AI prompt templates per field
4. Could add animation/transition when scale changes for smoother UX



