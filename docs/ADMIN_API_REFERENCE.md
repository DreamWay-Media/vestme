# Admin Template Management API Reference

Complete reference for all admin template management endpoints.

## Authentication

All admin endpoints require:
- Valid authentication (Bearer token)
- Admin role (currently placeholder - to be implemented)

## Endpoints

### 1. Get All Templates
**GET** `/api/admin/templates`

Fetch all templates with optional filtering (no access control applied).

**Query Parameters:**
- `category` (optional): Filter by category (`title`, `content`, `data`, `closing`)
- `tags` (optional): Comma-separated list of tags
- `search` (optional): Search by name or description
- `isEnabled` (optional): Filter by enabled status (`true` / `false`)

**Response:**
```json
[
  {
    "id": "uuid",
    "slug": "hero-title-v1",
    "name": "Hero Title",
    "description": "Bold centered title...",
    "category": "title",
    "thumbnail": "data:image/svg+xml;base64,...",
    "layout": {...},
    "defaultStyling": {...},
    "contentSchema": {...},
    "positioningRules": {...},
    "accessTier": "free",
    "isDefault": true,
    "isEnabled": true,
    "displayOrder": 0,
    "isSystem": true,
    "userId": null,
    "tags": ["title", "hero"],
    "version": "1.0",
    "usageCount": 42,
    "lastUsedAt": "2025-11-11T...",
    "createdAt": "2025-11-11T...",
    "updatedAt": "2025-11-11T..."
  }
]
```

---

### 2. Get Single Template
**GET** `/api/admin/templates/:templateId`

Fetch complete details of a single template for editing.

**Parameters:**
- `templateId`: UUID of the template

**Response:**
```json
{
  "id": "uuid",
  "slug": "hero-title-v1",
  "name": "Hero Title",
  "description": "Bold centered title...",
  "category": "title",
  "thumbnail": "data:image/svg+xml;base64,...",
  "layout": {
    "zones": [...]
  },
  "defaultStyling": {
    "colors": {...},
    "fonts": {...}
  },
  "contentSchema": {
    "fields": [...]
  },
  "positioningRules": {...},
  "accessTier": "free",
  "isDefault": true,
  "isEnabled": true,
  "displayOrder": 0,
  "isSystem": true,
  "userId": null,
  "tags": ["title", "hero"],
  "version": "1.0",
  "usageCount": 42,
  "lastUsedAt": "2025-11-11T...",
  "createdAt": "2025-11-11T...",
  "updatedAt": "2025-11-11T..."
}
```

---

### 3. Update Template (FULL EDIT)
**PUT** `/api/admin/templates/:templateId`

Update any aspect of a template including name, thumbnail, layout, styling, etc.

**Parameters:**
- `templateId`: UUID of the template

**Request Body:**
```json
{
  "name": "Updated Hero Title",
  "description": "New description",
  "category": "title",
  "thumbnail": "data:image/svg+xml;base64,...",
  "layout": {
    "zones": [...]
  },
  "defaultStyling": {
    "colors": {...},
    "fonts": {...}
  },
  "contentSchema": {
    "fields": [...]
  },
  "positioningRules": {...},
  "accessTier": "premium",
  "isDefault": false,
  "isEnabled": true,
  "displayOrder": 5,
  "tags": ["title", "hero", "modern"]
}
```

**Notes:**
- All fields are optional - only send fields you want to update
- Setting `isDefault: true` will automatically unset other default templates
- `thumbnail` can be a data URI (SVG base64) or URL
- `layout`, `defaultStyling`, and `contentSchema` are complex JSON objects

**Response:**
```json
{
  "success": true,
  "message": "Template updated successfully"
}
```

**Error Responses:**
- `400`: Invalid template ID
- `404`: Template not found
- `500`: Server error

---

### 4. Update Template Access (Quick Edit)
**PUT** `/api/admin/templates/:templateId/access`

Quick endpoint to update only access tier and enabled status.

**Parameters:**
- `templateId`: UUID of the template

**Request Body:**
```json
{
  "accessTier": "premium",
  "isEnabled": true
}
```

**Response:**
```json
{
  "success": true
}
```

---

### 5. Set Default Template
**POST** `/api/admin/templates/:templateId/set-default`

Set a template as the default for all new users.

**Parameters:**
- `templateId`: UUID of the template

**Response:**
```json
{
  "success": true
}
```

**Notes:**
- Only one template can be default at a time
- Previous default will be automatically unset

---

### 6. Delete Template
**DELETE** `/api/admin/templates/:templateId`

Delete a template (custom templates only).

**Parameters:**
- `templateId`: UUID of the template

**Response:**
```json
{
  "success": true
}
```

**Error Responses:**
- `403`: Cannot delete system templates
- `403`: Can only delete your own templates
- `404`: Template not found
- `500`: Server error

**Notes:**
- System templates (loaded from JSON files) cannot be deleted
- Users can only delete their own custom templates

---

### 7. Reload Templates
**POST** `/api/admin/templates/reload`

Reload all system templates from filesystem and sync to database.

**Response:**
```json
{
  "success": true,
  "message": "Templates reloaded successfully",
  "count": 8
}
```

**Notes:**
- Updates existing templates if version changed
- Regenerates thumbnails for all templates
- Rebuilds template cache

---

## Template Object Structure

### Layout
```json
{
  "zones": [
    {
      "id": "header",
      "type": "text",
      "position": { "x": 50, "y": 20, "width": 80, "height": 15 },
      "constraints": {
        "minWidth": 40,
        "maxWidth": 90,
        "allowOverlap": false
      }
    }
  ]
}
```

### Default Styling
```json
{
  "colors": {
    "primary": "{{brandKit.primaryColor}}",
    "secondary": "{{brandKit.secondaryColor}}",
    "text": "#333333",
    "background": "#FFFFFF"
  },
  "fonts": {
    "heading": "{{brandKit.fontFamily}}",
    "body": "Inter"
  },
  "spacing": {
    "padding": 40,
    "gap": 20
  }
}
```

### Content Schema
```json
{
  "fields": [
    {
      "id": "title",
      "type": "text",
      "label": "Main Title",
      "required": true,
      "maxLength": 100,
      "placeholder": "Enter your title..."
    },
    {
      "id": "subtitle",
      "type": "text",
      "label": "Subtitle",
      "required": false,
      "maxLength": 200
    }
  ]
}
```

---

## Usage Examples

### Example 1: Update Template Name and Description
```bash
curl -X PUT http://localhost:3000/api/admin/templates/uuid-here \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Modern Hero Title",
    "description": "A sleek, modern hero title perfect for impact"
  }'
```

### Example 2: Change Template to Premium
```bash
curl -X PUT http://localhost:3000/api/admin/templates/uuid-here/access \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accessTier": "premium",
    "isEnabled": true
  }'
```

### Example 3: Set as Default Template
```bash
curl -X POST http://localhost:3000/api/admin/templates/uuid-here/set-default \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 4: Delete a Custom Template
```bash
curl -X DELETE http://localhost:3000/api/admin/templates/uuid-here \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes for Frontend Integration

When building the admin template editor:

1. **Fetch Template**: Use `GET /api/admin/templates/:templateId` to get full template data
2. **Edit Form**: Display all editable fields (name, description, category, etc.)
3. **Layout Editor**: Consider JSON editor or visual builder for complex layout objects
4. **Thumbnail**: Allow upload/paste of data URIs or show current SVG
5. **Preview**: Show live preview as admin edits
6. **Save**: Send `PUT /api/admin/templates/:templateId` with updated fields
7. **Validation**: Validate required fields before submitting

### Recommended Frontend Flow:
```
1. Click "Edit" button in template list
2. Fetch template details
3. Open modal/page with edit form
4. Show current values in form fields
5. Allow editing of:
   - Basic info (name, description, category)
   - Access settings (tier, enabled, default)
   - Display order
   - Tags
   - Advanced: layout, styling, content schema (JSON editors)
6. Preview changes in real-time (optional)
7. Submit updates
8. Close editor and refresh template list
```

---

## Security Notes

- Admin role checking is currently a placeholder
- Implement proper RBAC before production
- System templates are protected from deletion
- Custom templates can only be deleted by their creator
- All endpoints require authentication

