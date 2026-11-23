DROP INDEX "ships_user_round";--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "repo_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "update_description" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "hackatime_projects" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "screenshots" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ships" ADD COLUMN "screenshots" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
UPDATE "ships" SET "screenshots" = jsonb_build_array("screenshot_url") WHERE "screenshot_url" IS NOT NULL;--> statement-breakpoint
UPDATE "projects" SET "hackatime_projects" = "latest"."hackatime_projects", "screenshots" = "latest"."screenshots"
FROM (SELECT DISTINCT ON ("project_id") "project_id", "hackatime_projects", "screenshots" FROM "ships" ORDER BY "project_id", "id" DESC) AS "latest"
WHERE "latest"."project_id" = "projects"."id";--> statement-breakpoint
DELETE FROM "ships" WHERE "status" = 'withdrawn'
	AND NOT EXISTS (SELECT 1 FROM "assignments" WHERE "assignments"."ship_id" = "ships"."id")
	AND NOT EXISTS (SELECT 1 FROM "bugs" WHERE "bugs"."ship_id" = "ships"."id")
	AND NOT EXISTS (SELECT 1 FROM "unified_outbox" WHERE "unified_outbox"."ship_id" = "ships"."id");--> statement-breakpoint
UPDATE "ships" SET "status" = 'rejected' WHERE "status" = 'withdrawn';--> statement-breakpoint
DO $$
DECLARE
	s record;
	pid integer;
BEGIN
	FOR s IN
		SELECT * FROM "ships"
		WHERE EXISTS (SELECT 1 FROM "ships" AS "later" WHERE "later"."project_id" = "ships"."project_id" AND "later"."id" > "ships"."id")
		ORDER BY "id"
	LOOP
		INSERT INTO "projects" ("owner_id", "name", "description", "repo_url", "demo_url", "run_steps", "hackatime_projects", "screenshots", "created_at", "updated_at")
		SELECT "owner_id", "name", "description", s.repo_url, s.demo_url, s.run_steps, s.hackatime_projects, s.screenshots, s.created_at, s.created_at
		FROM "projects" WHERE "id" = s.project_id
		RETURNING "id" INTO pid;
		UPDATE "ships" SET "project_id" = pid WHERE "id" = s.id;
	END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "ships" DROP COLUMN "screenshot_url";--> statement-breakpoint
ALTER TABLE "ships" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ships" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."ship_status";--> statement-breakpoint
CREATE TYPE "public"."ship_status" AS ENUM('pending', 'approved', 'changes', 'rejected');--> statement-breakpoint
ALTER TABLE "ships" ALTER COLUMN "status" SET DATA TYPE "public"."ship_status" USING "status"::"public"."ship_status";--> statement-breakpoint
ALTER TABLE "ships" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."ship_status";--> statement-breakpoint
CREATE UNIQUE INDEX "ships_project" ON "ships" USING btree ("project_id");
