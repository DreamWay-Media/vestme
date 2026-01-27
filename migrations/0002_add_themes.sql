-- Add slug field to slide_templates if it doesn't exist (for backward compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'slide_templates' AND column_name = 'slug'
    ) THEN
        ALTER TABLE "slide_templates" ADD COLUMN "slug" varchar UNIQUE;
        CREATE INDEX IF NOT EXISTS "idx_slide_templates_slug" ON "slide_templates"("slug");
    END IF;
END $$;
--> statement-breakpoint

-- Create themes table
CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar NOT NULL UNIQUE,
	"name" varchar NOT NULL,
	"description" text,
	"thumbnail" varchar,
	"access_tier" varchar DEFAULT 'premium' NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_enabled" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"tags" text[] DEFAULT '{}'::text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- Create theme_templates junction table (many-to-many relationship)
CREATE TABLE "theme_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"theme_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "theme_templates_theme_id_template_id_unique" UNIQUE("theme_id", "template_id")
);
--> statement-breakpoint

-- Create indexes for themes table
CREATE INDEX "idx_themes_slug" ON "themes"("slug");
CREATE INDEX "idx_themes_display_order" ON "themes"("display_order");
--> statement-breakpoint

-- Create indexes for theme_templates junction table
CREATE INDEX "idx_theme_templates_theme_id" ON "theme_templates"("theme_id");
CREATE INDEX "idx_theme_templates_template_id" ON "theme_templates"("template_id");
--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "theme_templates" ADD CONSTRAINT "theme_templates_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "theme_templates" ADD CONSTRAINT "theme_templates_template_id_slide_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."slide_templates"("id") ON DELETE cascade ON UPDATE no action;

