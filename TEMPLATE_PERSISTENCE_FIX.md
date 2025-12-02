# Template Persistence Fix

## Problem
Admin modifications to templates were reverting back on server restart because system templates were being overwritten by JSON files during sync.

## Solution Implemented

### 1. Database Schema Change
Added a new column `customized_by_admin` to track when admins modify templates:

```sql
ALTER TABLE slide_templates ADD COLUMN customized_by_admin TIMESTAMP;
```

This field is set to the current timestamp whenever an admin makes changes via:
- Template editing (name, description, category, thumbnail, layout, styling, etc.)
- Setting a template as default
- Changing template access tier or enabled status

### 2. Sync Logic Update
Modified `TemplateManager.syncTemplateToDatabase()` to:
- Check if `customizedByAdmin` timestamp exists
- Skip sync if template has been customized by admin
- Log skipped templates with: `⊘ Skipped template: {name} (customized by admin at {timestamp})`

**Before:**
```typescript
if (!existing) {
  // Insert new template
} else {
  // Always update from JSON file (overwrites admin changes!)
}
```

**After:**
```typescript
if (!existing) {
  // Insert new template
} else {
  // Skip update if template has been customized by admin
  if (existing.customizedByAdmin) {
    console.log(`⊘ Skipped template: ${template.name}`);
    return;
  }
  // Update from JSON file (only if not customized)
}
```

### 3. Admin Update Methods
All admin update methods now set `customizedByAdmin`:
- `updateTemplate()` - Full template editing
- `setDefaultTemplate()` - Setting default
- `updateTemplateAccess()` - Access tier and enabled status

## How It Works

1. **Fresh Install:** Templates sync from JSON files normally
2. **Admin Edits Template:** `customizedByAdmin` is set to current timestamp
3. **Server Restart:** Sync checks `customizedByAdmin` and skips that template
4. **Your Changes Persist:** Admin modifications are preserved across restarts!

## Testing

To verify the fix:

1. Go to `/admin/templates`
2. Edit any template (change name, thumbnail, or styling)
3. Note the current template state
4. Restart the server: `npm run dev`
5. Refresh `/admin/templates`
6. Verify your changes are still there!

## Reverting to JSON Defaults

If you want to revert a customized template back to its JSON definition:

**Option 1: Manual Database Update**
```sql
UPDATE slide_templates 
SET customized_by_admin = NULL 
WHERE slug = 'template-slug';
```
Then restart the server to trigger re-sync.

**Option 2: Delete and Recreate**
Delete the template from admin dashboard. It will be recreated from JSON on next restart.

## Notes

- System templates (`isSystem: true`) with `customizedByAdmin = null` will still sync from JSON files
- Custom templates (created via UI) are never overwritten by JSON sync
- This only affects system templates that have been edited via admin dashboard
- Changes persist in the database, not in JSON files

