# Template-Based Pitch Deck Generation

## Overview

The pitch deck generation system now uses **dynamic, template-based slide creation** instead of hardcoded layouts. The system intelligently selects appropriate templates for each slide type and generates professional, consistent decks.

## What Changed

### ❌ Before: Hardcoded Generation
- AI generated slides with fixed structure
- Colors and layouts were predetermined
- No consistency with template system
- Each slide was independently styled

### ✅ After: Template-Based Generation
- System fetches available templates
- AI generates content specific to each slide type
- Templates are applied using `templateManager.applyTemplate()`
- Consistent styling across all slides
- Same templates used in manual creation and automatic generation

## Architecture

### 1. Deck Structure Definition

The system defines a standard pitch deck structure with 10 slides:

```typescript
const deckStructure = [
  { slideType: 'title', templateCategory: 'title', title: 'Company Overview' },
  { slideType: 'problem', templateCategory: 'content', title: 'The Problem' },
  { slideType: 'solution', templateCategory: 'content', title: 'Our Solution' },
  { slideType: 'market', templateCategory: 'content', title: 'Market Opportunity' },
  { slideType: 'business-model', templateCategory: 'content', title: 'Business Model' },
  { slideType: 'competitive-advantage', templateCategory: 'content', title: 'Competitive Advantage' },
  { slideType: 'financials', templateCategory: 'data', title: 'Financial Projections' },
  { slideType: 'team', templateCategory: 'content', title: 'Our Team' },
  { slideType: 'roadmap', templateCategory: 'content', title: 'Product Roadmap' },
  { slideType: 'closing', templateCategory: 'closing', title: 'Investment Opportunity' },
];
```

### 2. Template Selection

For each slide, the system:
1. Looks up templates by category (title, content, data, closing)
2. Selects the most appropriate template (defaults first, then first available)
3. Ensures all slides use professionally designed templates

**Example**:
- Title slide → "Hero Title" or "Minimal Title" template
- Content slides → "Two Column", "Bullet List", "Feature Grid" templates
- Financial slides → "Stats Showcase" template
- Closing slide → "Call to Action" template

### 3. Content Generation

For each slide, AI generates specific content:

```typescript
await generateSlideContentForTemplate({
  templateCategory: 'content',
  templateName: 'Two Column Layout',
  businessProfile: {...},
  slideType: 'problem',
  slideTitle: 'The Problem',
  existingContent: null
});
```

**AI receives slide-specific guidance:**

- **Title Slide**: Company name, tagline, value proposition
- **Problem Slide**: Pain points, customer challenges
- **Solution Slide**: Key features, benefits
- **Market Slide**: Market size, TAM/SAM/SOM, growth trends
- **Business Model**: Revenue streams, pricing, unit economics
- **Competitive Advantage**: Differentiators, unique positioning
- **Financials**: Revenue projections, key metrics
- **Team**: Team members, roles, expertise
- **Roadmap**: Milestones, product features, strategic initiatives
- **Closing**: Investment ask, reasons to invest, next steps

### 4. Template Application

Once content is generated, the system applies the template:

```typescript
const appliedSlide = await templateManager.applyTemplate(
  selectedTemplate.id,
  'system',
  slideContent,
  brandingInfo,
  {} // no overrides
);
```

This ensures:
- ✅ Consistent styling from templates
- ✅ Brand kit colors applied
- ✅ Proper layout and positioning
- ✅ Professional typography
- ✅ Logo placement

## Implementation Details

### File: `server/services/openai.ts`

#### New Function: `generateTemplateBasedSlides()`

Main orchestrator for template-based generation:

1. Fetches all available templates
2. Groups templates by category
3. Iterates through deck structure
4. For each slide:
   - Selects appropriate template
   - Generates AI content
   - Applies template
   - Adds to slides array

#### Enhanced Function: `generateSlideContentForTemplate()`

Generates content with slide-type-specific guidance:

- Accepts `slideType` parameter for contextual prompts
- Provides detailed instructions per slide type
- Extracts real business information
- Returns structured JSON:
  ```json
  {
    "title": "Specific slide title",
    "tagline": "Optional tagline",
    "description": "2-3 sentence description",
    "bullets": ["Point 1", "Point 2", "Point 3"]
  }
  ```

### File: `server/routes.ts`

Updated deck generation route to pass `templateManager`:

```typescript
const slides = await generatePitchDeckSlides({
  businessProfile: project.businessProfile,
  brandingInfo,
  templateManager // ✅ NEW: Pass template manager
});
```

## Benefits

### 1. **Consistency**
- Manual template selection and automatic generation use the same templates
- No styling discrepancies
- Unified user experience

### 2. **Flexibility**
- Easy to add new templates
- Templates automatically available for generation
- No code changes needed for new slide types

### 3. **Quality**
- Professional, designer-created layouts
- Brand-consistent styling
- Proper typography and spacing

### 4. **Maintainability**
- Single source of truth (templates)
- No hardcoded layouts in code
- Easy to update designs

### 5. **Scalability**
- System adapts to available templates
- Can support custom templates per user
- Premium templates automatically considered

## How It Works: Step-by-Step

```
1. User initiates deck generation
   ↓
2. System receives business profile + brand kit
   ↓
3. generateTemplateBasedSlides() called
   ↓
4. System fetches all 8 templates from database
   ↓
5. Templates grouped by category:
   - title: 2 templates
   - content: 4 templates
   - data: 1 template
   - closing: 1 template
   ↓
6. For each of 10 slides in deck structure:
   
   a) Select appropriate template for category
      Example: "Problem" slide → "Bullet List" template
   
   b) Generate AI content for that specific slide type
      Prompt includes:
      - Business profile data
      - Slide-specific guidance
      - Content structure requirements
   
   c) Apply template using templateManager
      - Processes template styling
      - Applies brand colors
      - Maps content to template schema
      - Adds logos from brand kit
   
   d) Add to slides array with order number
   ↓
7. Return 10 professionally-designed slides
   ↓
8. Save deck to database
   ↓
9. User sees complete deck ready for editing
```

## Testing

### Test the New System

1. **Navigate to project**
2. **Complete discovery** (if not done)
3. **Add brand kit** (if not done)
4. **Click "Generate Deck"**

**Expected Results:**
- ✅ Deck generates with 10 slides
- ✅ Each slide uses a template from the gallery
- ✅ Styling is consistent and professional
- ✅ White backgrounds (per current template settings)
- ✅ Brand colors used for text and accents
- ✅ Content is specific to the business
- ✅ Logos appear from brand kit

### Check Console Logs

Server logs will show:
```
🎨 Starting template-based slide generation
Found 8 templates
Templates by category: title: 2, content: 4, data: 1, closing: 1
📄 Generating slide 1/10: "Company Overview" using template "Hero Title"
Generated content for "title" slide: {...}
📄 Generating slide 2/10: "The Problem" using template "Bullet List"
Generated content for "problem" slide: {...}
...
✅ Generated 10 slides using templates
```

## Fallback Behavior

If `templateManager` is not provided, the system falls back to legacy generation:

```typescript
if (templateManager) {
  return await generateTemplateBasedSlides(...);
}

// Fallback
console.warn('⚠️ No templateManager provided, using legacy slide generation');
// ... legacy code continues
```

This ensures backward compatibility.

## Future Enhancements

### 1. **Smart Template Selection**
Instead of always using the first template, use AI to select the best template for each slide:

```typescript
// Potential enhancement
const selectedTemplate = await selectBestTemplate(
  availableTemplates,
  slideSpec,
  businessProfile,
  previousSlides
);
```

### 2. **Custom Template Orders**
Allow users to define their own deck structure:

```typescript
// User-defined structure
const userDeckStructure = project.deckTemplate || defaultDeckStructure;
```

### 3. **A/B Testing**
Generate multiple versions with different template combinations:

```typescript
// Multiple versions
const versions = await generateMultipleVersions(businessProfile, 3);
```

### 4. **Template Recommendations**
Track which templates perform best for which industries:

```typescript
// Analytics-driven selection
const recommendedTemplates = getRecommendedTemplates(businessProfile.industry);
```

## Configuration

### Adding New Slide Types

To add a new slide type to the deck structure:

1. **Add to `deckStructure` array**:
   ```typescript
   { slideType: 'traction', templateCategory: 'data', title: 'Traction & Metrics' }
   ```

2. **Add to `generateSlideContentForTemplate()` switch**:
   ```typescript
   case 'traction':
     specificGuidance = `This is the TRACTION slide. Generate:
   - title: Traction headline
   - description: Key metrics and growth (2-3 sentences)
   - bullets: 3-4 impressive statistics or milestones`;
     break;
   ```

3. **No template changes needed** - system will automatically use available templates in that category!

### Customizing Deck Length

Change the number of slides by modifying `deckStructure`:

```typescript
// Short pitch (5 slides)
const deckStructure = [
  { slideType: 'title', templateCategory: 'title', title: 'Company Overview' },
  { slideType: 'problem', templateCategory: 'content', title: 'The Problem' },
  { slideType: 'solution', templateCategory: 'content', title: 'Our Solution' },
  { slideType: 'market', templateCategory: 'content', title: 'Market Opportunity' },
  { slideType: 'closing', templateCategory: 'closing', title: 'Investment Opportunity' },
];
```

## Migration Notes

### Existing Decks
- ✅ Existing decks remain unchanged
- ✅ Can still be edited normally
- ✅ Can apply new templates manually

### New Decks
- ✅ Automatically use template system
- ✅ Professional, consistent design
- ✅ Ready for presentation immediately

## Troubleshooting

### No Templates Available
**Problem**: `⚠️ No templates found for category: content`

**Solution**: Ensure templates are loaded:
```bash
npm run db:push  # Sync templates to database
```

### Content Not Specific
**Problem**: Generated content is too generic

**Solution**: Ensure business profile has detailed information:
- Company name
- Industry
- Problem statement
- Solution details
- Market information
- Team details

### Styling Not Applied
**Problem**: Slides don't have white backgrounds

**Solution**: Templates should have white backgrounds. Check template definitions in `server/templates/definitions/`.

## Summary

✅ **What We Built**:
- Dynamic, template-based deck generation
- AI content generation per slide type
- Automatic template selection
- Consistent styling and layouts
- Brand kit integration
- Professional, presentation-ready decks

✅ **Key Benefits**:
- No hardcoded layouts
- Easy to maintain and extend
- Consistent with manual template system
- Professional quality output
- Scalable architecture

🎯 **Result**: Users get beautiful, professional pitch decks that look like they were designed by a professional, using the exact same templates they can manually select!

