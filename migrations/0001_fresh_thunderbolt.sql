CREATE TABLE "project_template_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"template_id" uuid NOT NULL,
	"styling_overrides" jsonb,
	"layout_overrides" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "slide_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"category" varchar NOT NULL,
	"description" text,
	"thumbnail" varchar,
	"layout" jsonb NOT NULL,
	"default_styling" jsonb NOT NULL,
	"content_schema" jsonb NOT NULL,
	"positioning_rules" jsonb,
	"access_tier" varchar DEFAULT 'premium' NOT NULL,
	"is_default" boolean DEFAULT false,
	"is_enabled" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"is_system" boolean DEFAULT true,
	"user_id" varchar,
	"tags" text[] DEFAULT '{}'::text[],
	"version" varchar DEFAULT '1.0',
	"usage_count" integer DEFAULT 0,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"tier" varchar DEFAULT 'free' NOT NULL,
	"status" varchar DEFAULT 'active' NOT NULL,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "project_template_overrides" ADD CONSTRAINT "project_template_overrides_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_template_overrides" ADD CONSTRAINT "project_template_overrides_template_id_slide_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."slide_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slide_templates" ADD CONSTRAINT "slide_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;