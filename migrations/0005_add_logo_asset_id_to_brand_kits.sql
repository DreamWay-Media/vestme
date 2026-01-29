-- Migration: Add logo_asset_id to brand_kits table
-- This allows brand kits to reference media library assets for logos
-- Note: This migration assumes the media_assets table exists. 
-- If it doesn't, create it first using drizzle-kit push or the media library migration.

-- Step 1: Add logo_asset_id column to brand_kits (nullable for backward compatibility)
ALTER TABLE "brand_kits" ADD COLUMN IF NOT EXISTS "logo_asset_id" uuid;
--> statement-breakpoint

-- Step 2: Create index on logo_asset_id for performance
CREATE INDEX IF NOT EXISTS "idx_brand_kits_logo_asset_id" ON "brand_kits"("logo_asset_id");
--> statement-breakpoint

-- Step 3: Add foreign key constraint to media_assets
-- This will fail if media_assets table doesn't exist - create it first if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'media_assets'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND constraint_name = 'brand_kits_logo_asset_id_media_assets_id_fk'
        ) THEN
            ALTER TABLE "brand_kits" 
            ADD CONSTRAINT "brand_kits_logo_asset_id_media_assets_id_fk" 
            FOREIGN KEY ("logo_asset_id") REFERENCES "public"."media_assets"("id") 
            ON DELETE set null ON UPDATE no action;
        END IF;
    ELSE
        RAISE NOTICE 'media_assets table does not exist. Skipping foreign key constraint.';
        RAISE NOTICE 'Please create media_assets table first, then re-run this migration or add the constraint manually.';
    END IF;
END $$;
--> statement-breakpoint

