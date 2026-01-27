-- Migration: Add themeId to decks table
-- This allows decks to track which theme was used for generation

-- Step 1: Add themeId column to decks (nullable initially for backward compatibility)
ALTER TABLE "decks" ADD COLUMN IF NOT EXISTS "theme_id" uuid;
--> statement-breakpoint

-- Step 2: Create index on theme_id for performance
CREATE INDEX IF NOT EXISTS "idx_decks_theme_id" ON "decks"("theme_id");
--> statement-breakpoint

-- Step 3: Add foreign key constraint
ALTER TABLE "decks" 
ADD CONSTRAINT "decks_theme_id_themes_id_fk" 
FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint


