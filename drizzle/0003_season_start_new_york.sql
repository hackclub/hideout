UPDATE "rounds" SET
	"build_starts_at" = "build_starts_at" + interval '5 hours',
	"break_starts_at" = "break_starts_at" + interval '5 hours',
	"break_ends_at" = "break_ends_at" + interval '5 hours'
WHERE "season_id" IN (SELECT "id" FROM "seasons" WHERE "starts_at" = '2026-11-24T00:00:00Z');
--> statement-breakpoint
UPDATE "seasons" SET "starts_at" = '2026-11-24T05:00:00Z' WHERE "starts_at" = '2026-11-24T00:00:00Z';
