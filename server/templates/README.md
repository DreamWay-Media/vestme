# VestMe Template System

This directory contains the template management system for VestMe slide templates.

## Directory Structure

```
templates/
├── definitions/          # Template JSON definitions
│   ├── title/           # Title slide templates
│   ├── content/         # Content slide templates
│   ├── data/            # Data/stats slide templates
│   └── closing/         # Closing slide templates
├── thumbnails/          # Template preview images (16:9, PNG)
├── types.ts            # TypeScript interfaces
├── templateValidator.ts # Template validation logic
├── templateManager.ts  # Template management service
└── README.md           # This file
```

## Creating a New Template

### 1. Design Your Template

Design your slide template in your preferred design tool (Figma, Sketch, etc.).

### 2. Create JSON Definition

Create a JSON file in the appropriate category folder:

```json
{
  "id": "unique-template-id",
  "version": "1.0",
  "name": "Template Name",
  "description": "Brief description of the template",
  "category": "title",
  "tags": ["modern", "minimal", "professional"],
  "thumbnail": "/templates/thumbnails/unique-template-id.png",
  
  "accessTier": "premium",
  "isDefault": false,
  "isEnabled": true,
  "displayOrder": 10,
  
  "layout": {
    "type": "centered",
    "elements": [
      {
        "id": "logo",
        "type": "logo",
        "zone": {
          "x": "50%",
          "y": "10%",
          "width": "auto",
          "height": "15%",
          "alignment": "center"
        },
        "constraints": {
          "maxHeight": 120,
          "maintainAspectRatio": true
        }
      },
      {
        "id": "title",
        "type": "text",
        "zone": {
          "x": "5%",
          "y": "35%",
          "width": "90%",
          "height": "auto",
          "alignment": "center"
        },
        "styling": {
          "fontWeight": "bold",
          "textAlign": "center"
        }
      }
    ]
  },
  
  "styling": {
    "background": {
      "type": "gradient",
      "usesBrandColor": "primary",
      "gradientAngle": 135,
      "gradientStops": [
        { "color": "primary", "opacity": 1, "position": 0 },
        { "color": "primary", "opacity": 0.8, "position": 100 }
      ]
    },
    "colorScheme": {
      "titleColor": { 
        "usesBrandColor": "contrast", 
        "fallback": "#FFFFFF" 
      },
      "descriptionColor": { 
        "usesBrandColor": "contrast", 
        "opacity": 0.9, 
        "fallback": "#F5F5F5" 
      },
      "accentColor": { 
        "usesBrandColor": "accent", 
        "fallback": "#10B981" 
      }
    },
    "typography": {
      "title": {
        "fontSize": "5xl",
        "fontWeight": "bold",
        "lineHeight": 1.2
      },
      "description": {
        "fontSize": "2xl",
        "fontWeight": "normal",
        "lineHeight": 1.4
      }
    },
    "effects": {
      "shadows": false,
      "borders": false,
      "overlay": false
    }
  },
  
  "contentSchema": {
    "fields": [
      {
        "id": "title",
        "type": "text",
        "label": "Company Name",
        "placeholder": "Your Company Name",
        "defaultValue": "",
        "required": true,
        "maxLength": 60,
        "mapTo": "titles[0]"
      },
      {
        "id": "tagline",
        "type": "text",
        "label": "Tagline",
        "placeholder": "Your compelling tagline",
        "defaultValue": "",
        "required": false,
        "maxLength": 120,
        "mapTo": "descriptions[0]"
      },
      {
        "id": "logo",
        "type": "logo",
        "label": "Logo",
        "required": false,
        "mapTo": "logos[0]"
      }
    ]
  },
  
  "metadata": {
    "author": "system",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z",
    "difficulty": "easy"
  }
}
```

### 3. Create Thumbnail

Create a 16:9 PNG image (recommended: 800x450px) showing a preview of the template.
Save it to `thumbnails/` with the same name as your template ID.

### 4. Validate Template

Templates are automatically validated on server startup. You can also manually validate:

```typescript
import { templateValidator } from './templateValidator';
import templateJson from './definitions/title/my-template.json';

const result = templateValidator.validate(templateJson);
if (!result.valid) {
  console.error('Template validation errors:', result.errors);
}
```

### 5. Deploy

Commit your template files:
```bash
git add server/templates/definitions/category/template-name.json
git add server/templates/thumbnails/template-name.png
git commit -m "Add new template: Template Name"
```

On next deployment, templates will automatically sync to the database.

## Template Properties

### Access Tier

- `"free"`: Available to all users
- `"premium"`: Only available to paid users

### Layout Types

- `"centered"`: Elements centered on the slide
- `"split"`: Two-column layout
- `"grid"`: Grid-based layout
- `"freeform"`: Custom positioning

### Element Types

- `"text"`: Plain text
- `"richText"`: Rich text with formatting
- `"logo"`: Brand logo
- `"image"`: Image/graphic
- `"bullets"`: Bullet point list
- `"chart"`: Chart/graph

### Color References

Templates can reference brand kit colors:
- `"primary"`: Brand primary color
- `"secondary"`: Brand secondary color
- `"accent"`: Brand accent color
- `"contrast"`: Automatically calculated contrast color

### Font Sizes

Use Tailwind CSS size names:
- `"sm"`, `"base"`, `"lg"`, `"xl"`, `"2xl"`, `"3xl"`, `"4xl"`, `"5xl"`

## Best Practices

1. **Keep it Simple**: Start with simpler layouts before complex ones
2. **Test with Multiple Brand Kits**: Ensure your template works with various color combinations
3. **Use Percentage Positioning**: Makes templates more responsive
4. **Provide Sensible Defaults**: Default values should create a presentable slide
5. **Write Clear Field Labels**: Help users understand what content to provide
6. **Set Appropriate Constraints**: maxLength, maxHeight, etc. prevent layout breaking
7. **Use Semantic IDs**: Use descriptive IDs like "company-logo" not "element-1"
8. **Version Your Templates**: Increment version when making breaking changes

## Updating Existing Templates

To update a template:

1. Edit the JSON file
2. Increment the `version` field
3. Update `metadata.updatedAt`
4. Commit changes

On deployment, templates will be synced and users will see the updated version.

## Troubleshooting

### Template Not Appearing

- Check validation errors in server logs
- Ensure `isEnabled: true`
- Verify thumbnail path is correct
- Check category matches folder location

### Colors Not Applying

- Verify `usesBrandColor` references valid color keys
- Provide `fallback` colors for all color mappings
- Check brand kit has all required colors defined

### Layout Issues

- Use percentage values for responsive layouts
- Test with different screen sizes
- Verify zone coordinates are within 0-100%
- Check element z-index/layering

## Support

For questions or issues:
- Check template validation errors first
- Review existing templates for examples
- Contact the development team

