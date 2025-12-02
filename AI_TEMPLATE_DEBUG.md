# AI Template Pre-Population - Debugging Guide

## What Was Fixed

### Issue
The useEffect for AI content generation had two problems:
1. **Empty dependency array `[]`**: Only ran once on mount, before `businessProfile` was loaded
2. **Incorrect content check**: Was treating empty strings as "having content"

### Solution
1. Added `businessProfile` to dependency array so it runs when businessProfile is loaded
2. Added `useRef` to prevent multiple generations
3. Improved content check to only detect meaningful content (not empty strings)
4. Added extensive console logging for debugging

## How to Test

### Step 1: Open Browser Console
1. Open your browser's Developer Tools (F12 or Cmd+Option+I)
2. Go to the "Console" tab
3. Clear any existing logs

### Step 2: Open a Template
1. Go to any deck
2. Click "Templates" or click the Layout icon on a slide to "Change Template"
3. Click on any template card

### Step 3: Watch the Console
You should see logs like this:

```
🤖 Checking if should generate AI content...
Business Profile: { companyName: "Trail Chews", industry: "Food & Beverage", ... }
Form Data: { title: "", description: "", ... }
Has Generated Before: false
✅ Generating AI content...
Generating AI content for template: Hero Title Slide (title)
Generated content: { title: "...", description: "...", bullets: [...] }
Content Generated
```

### Step 4: Verify Fields Populate
- Look at the form fields in the modal
- They should now be filled with AI-generated content
- You should see a toast notification: "Content Generated"

## Possible Issues

### If you see: `❌ No business profile, skipping AI generation`
**Problem**: Business profile not loaded
**Solution**: 
- Check if the project has discovery data
- Verify the project query is fetching correctly
- Check console for: `Business Profile: undefined`

### If you see: `⚠️ Form already has content, skipping AI generation`
**Problem**: Template schema has default values that aren't empty
**Solution**: 
- Check the template's `contentSchema.fields` in admin dashboard
- Ensure `defaultValue` is empty or null
- Or manually clear the fields before opening

### If you see: `✋ Already generated content, skipping`
**Problem**: Content was generated but you didn't see it
**Solution**: 
- Close and reopen the modal
- The ref resets when modal closes

### If you see no logs at all
**Problem**: useEffect not running
**Solution**:
- Check that `businessProfile` prop is being passed to `TemplatePreviewModal`
- Verify in React DevTools that the prop exists

## Testing Checklist

- [ ] Open developer console
- [ ] Navigate to a deck
- [ ] Click "Templates"
- [ ] Select a template
- [ ] See console logs starting with 🤖
- [ ] See "✅ Generating AI content..." log
- [ ] See fields populate in the modal
- [ ] See toast notification
- [ ] Verify content is relevant to your business

## Console Commands for Manual Testing

```javascript
// Check if business profile is available
console.log(deck?.project?.businessProfile);

// Check what's in form data
console.log(formData);

// Manually trigger API call
fetch('/api/generate-template-content', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    templateCategory: 'title',
    templateName: 'Hero Title Slide',
    businessProfile: { /* your profile */ }
  })
}).then(r => r.json()).then(console.log);
```

## Expected Behavior

1. **Modal opens** → useEffect triggers
2. **Checks businessProfile** → If available, proceeds
3. **Checks form content** → If empty, proceeds
4. **Calls API** → `/api/generate-template-content`
5. **Maps response** → Sets formData state
6. **Shows toast** → "Content Generated"
7. **Fields update** → User sees populated form

## Server Logs

Check server logs for:
```bash
tail -f /tmp/vestme-server.log | grep -i "generat"
```

You should see:
```
Generating AI content for template: Hero Title Slide (title)
Generated content: { title: "...", description: "...", bullets: [...] }
```

