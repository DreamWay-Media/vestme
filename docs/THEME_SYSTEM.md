# Theme System Documentation

## Overview

The theme system allows templates to be grouped into cohesive collections called "themes". Each theme contains related templates that work well together, making it easier for users and AI to create consistent pitch decks.

## Architecture

### Database Schema

- **themes** table: Stores theme metadata (name, description, thumbnail, access tier, etc.)
- **theme_templates** junction table: Many-to-many relationship between themes and templates
- Templates can belong to multiple themes
- Themes can contain templates from any combination of categories

### Theme Definition Files

Themes are defined in JSON files located at `server/templates/themes/`:

```json
{
  "id": "modern-minimal-v1",
  "name": "Modern Minimal",
  "description": "Clean, minimalist design...",
  "accessTier": "free",
  "isDefault": true,
  "isEnabled": true,
  "displayOrder": 1,
  "templateIds": [
    "minimal-title-v1",
    "two-column-v1",
    "bullet-list-v1"
  ],
  "tags": ["minimal", "modern", "clean"],
  "metadata": {
    "style": "minimalist",
    "colorScheme": "neutral"
  }
}
```

## API Endpoints

### User Endpoints

- `GET /api/themes` - List all available themes (with access control)
- `GET /api/themes/:themeId` - Get single theme details
- `GET /api/themes/:themeId/templates` - Get all templates in a theme
- `GET /api/templates?themeId=xxx` - Filter templates by theme

### Admin Endpoints

- `GET /api/admin/themes` - List all themes (no access control)
- `GET /api/admin/themes/:themeId` - Get theme with templates
- `POST /api/admin/themes/reload` - Reload themes from filesystem

## Frontend Usage

### Using ThemeGallery Component

```tsx
import { ThemeGallery } from '@/components/Templates';

function MyComponent() {
  const handleThemeSelect = (theme: Theme) => {
    console.log('Selected theme:', theme);
    // Navigate to template gallery filtered by theme
  };

  return <ThemeGallery onSelectTheme={handleThemeSelect} />;
}
```

### Using Templates Filtered by Theme

```tsx
import { TemplateGallery } from '@/components/Templates';
import { useTheme } from '@/hooks/useThemes';

function TemplateSelector({ themeId }: { themeId: string }) {
  return (
    <TemplateGallery
      themeId={themeId}
      onSelectTemplate={(template) => {
        // Apply template
      }}
    />
  );
}
```

### Using Hooks

```tsx
import { useThemes, useTheme, useThemeTemplates } from '@/hooks/useThemes';

// Get all themes
const { data: themes } = useThemes({ search: 'minimal' });

// Get single theme
const { data: theme } = useTheme(themeId);

// Get templates in a theme
const { data: templates } = useThemeTemplates(themeId);
```

## AI Integration

The AI deck generation system can use themes to ensure consistency:

```typescript
// In server/services/openai.ts
const slides = await generateTemplateBasedSlides(
  businessProfile,
  brandingInfo,
  templateManager,
  themeId // Optional: specify theme for consistency
);
```

If a theme is specified:
1. Templates are selected from the theme first
2. Falls back to category-based selection if theme doesn't have required templates
3. Ensures visual consistency across all slides

## Creating New Themes

1. Create a JSON file in `server/templates/themes/`
2. Define the theme with template IDs (slugs)
3. Restart the server or call `POST /api/admin/themes/reload`
4. Themes are automatically synced to the database

## Migration

Run the migration to add themes support:

```bash
npm run db:migrate
# or
npx drizzle-kit push
```

The migration:
- Creates `themes` table
- Creates `theme_templates` junction table
- Adds indexes for performance
- Adds slug field to `slide_templates` if missing (backward compatibility)

## Best Practices

1. **Theme Naming**: Use descriptive names that indicate the style (e.g., "Modern Minimal", "Bold Professional")
2. **Template Selection**: Include templates from all categories when possible for complete theme coverage
3. **Default Theme**: Mark one theme as default for new users
4. **Access Tiers**: Use free themes for basic users, premium for advanced features
5. **Tags**: Add relevant tags for better searchability

## Example Theme Workflow

1. User browses themes in ThemeGallery
2. User selects a theme (e.g., "Modern Minimal")
3. TemplateGallery shows only templates from that theme
4. User can still filter by category within the theme
5. AI can use the theme when generating decks for consistency




