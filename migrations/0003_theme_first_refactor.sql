-- Migration: Theme-First Refactor
-- This migration refactors the template system to be theme-first:
-- 1. Templates inherit access tier from themes
-- 2. All templates must belong to a theme (direct FK, no junction table)
-- 3. Remove access_tier from slide_templates

-- Step 1: Add themeId column to slide_templates (nullable initially)
ALTER TABLE "slide_templates" ADD COLUMN IF NOT EXISTS "theme_id" uuid;
--> statement-breakpoint

-- Step 2: Create index on theme_id for performance
CREATE INDEX IF NOT EXISTS "idx_slide_templates_theme_id" ON "slide_templates"("theme_id");
--> statement-breakpoint

-- Step 3: Assign all existing templates to default theme
-- First, ensure we have a default theme (create if doesn't exist)
INSERT INTO "themes" ("slug", "name", "description", "access_tier", "is_default", "is_enabled", "display_order", "tags", "metadata")
SELECT 'default-theme-v1', 'Default Theme', 'Default theme for existing templates', 'free', true, true, 0, ARRAY['default'], '{"style": "default"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM "themes" WHERE "slug" = 'default-theme-v1'
)
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- Step 4: Get the default theme ID and assign all templates to it
UPDATE "slide_templates"
SET "theme_id" = (
  SELECT "id" FROM "themes" WHERE "slug" = 'default-theme-v1' LIMIT 1
)
WHERE "theme_id" IS NULL;
--> statement-breakpoint

-- Step 5: Make theme_id NOT NULL now that all templates have been assigned
ALTER TABLE "slide_templates" ALTER COLUMN "theme_id" SET NOT NULL;
--> statement-breakpoint

-- Step 6: Add foreign key constraint
ALTER TABLE "slide_templates" 
ADD CONSTRAINT "slide_templates_theme_id_themes_id_fk" 
FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Step 7: Remove access_tier column from slide_templates (templates inherit from theme)
ALTER TABLE "slide_templates" DROP COLUMN IF EXISTS "access_tier";
--> statement-breakpoint

-- Step 8: Drop the theme_templates junction table (no longer needed)
DROP TABLE IF EXISTS "theme_templates";
--> statement-breakpoint

-- Step 9: Update theme definitions to include all existing templates
-- This ensures theme JSON files stay in sync with database
-- Note: This is handled by the application layer, not in migration




