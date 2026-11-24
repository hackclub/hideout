ALTER TABLE "assignments" ADD COLUMN "kairos_project" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "kairos_projects" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ships" ADD COLUMN "kairos_projects" jsonb DEFAULT '[]'::jsonb NOT NULL;