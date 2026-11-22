CREATE TYPE "public"."assignment_status" AS ENUM('active', 'void');
--> statement-breakpoint

CREATE TYPE "public"."bug_status" AS ENUM(
	'waiting',
	'accepted',
	'disputed',
	'merged',
	'invalid',
	'duplicate',
	'withdrawn'
);
--> statement-breakpoint

CREATE TYPE "public"."hours_status" AS ENUM('none', 'pending', 'approved', 'rejected');
--> statement-breakpoint

CREATE TYPE "public"."item_category" AS ENUM('grant', 'physical', 'digital');
--> statement-breakpoint

CREATE TYPE "public"."ledger_reason" AS ENUM(
	'build_hours',
	'break_hours',
	'round_bonus',
	'season_prize',
	'purchase',
	'refund',
	'manual'
);
--> statement-breakpoint

CREATE TYPE "public"."order_status" AS ENUM(
	'pending',
	'approved',
	'fulfilled',
	'rejected',
	'cancelled'
);
--> statement-breakpoint

CREATE TYPE "public"."role" AS ENUM('user', 'reviewer', 'admin');
--> statement-breakpoint

CREATE TYPE "public"."round_status" AS ENUM('open', 'closed');
--> statement-breakpoint

CREATE TYPE "public"."severity" AS ENUM('minor', 'major', 'critical');
--> statement-breakpoint

CREATE TYPE "public"."ship_status" AS ENUM(
	'pending',
	'approved',
	'changes',
	'rejected',
	'withdrawn'
);
--> statement-breakpoint

CREATE TYPE "public"."unbreakable_verdict" AS ENUM(
	'attacked',
	'not_attacked',
	'unrunnable',
	'too_simple'
);
--> statement-breakpoint

CREATE TABLE "assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"raccoon_id" integer NOT NULL,
	"ship_id" integer NOT NULL,
	"status" "assignment_status" DEFAULT 'active' NOT NULL,
	"fork_url" text,
	"fork_demo_url" text,
	"fork_screenshot_url" text,
	"hackatime_project" text,
	"note" text,
	"claimed_hours" numeric(8, 2),
	"approved_hours" numeric(8, 2),
	"hours_status" "hours_status" DEFAULT 'none' NOT NULL,
	"hours_reviewer_id" integer,
	"hours_note" text,
	"hours_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" integer,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" integer,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "bugs" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"ship_id" integer NOT NULL,
	"assignment_id" integer NOT NULL,
	"raccoon_id" integer NOT NULL,
	"pr_url" text NOT NULL,
	"pr_number" integer NOT NULL,
	"pr_title" text NOT NULL,
	"proposed_severity" "severity" NOT NULL,
	"severity" "severity" NOT NULL,
	"note" text,
	"status" "bug_status" DEFAULT 'waiting' NOT NULL,
	"respond_by" timestamp with time zone NOT NULL,
	"auto_accepted" boolean DEFAULT false NOT NULL,
	"dispute_reason" text,
	"dispute_kind" text,
	"resolved_by" integer,
	"resolution_note" text,
	"resolved_at" timestamp with time zone,
	"merged_at" timestamp with time zone,
	"merged_by" text,
	"overturned" boolean DEFAULT false NOT NULL,
	"needs_check" boolean DEFAULT false NOT NULL,
	"checked_by" integer,
	"checked_at" timestamp with time zone,
	"check_result" text,
	"unmerged_reviewed" boolean DEFAULT false NOT NULL,
	"risky_files" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bugs_pr_url_unique" UNIQUE("pr_url")
);
--> statement-breakpoint

CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"blurb" text DEFAULT '' NOT NULL,
	"category" "item_category" NOT NULL,
	"price" integer NOT NULL,
	"image_url" text,
	"stock" integer,
	"max_per_user" integer,
	"active" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reason" "ledger_reason" NOT NULL,
	"round_id" integer,
	"ref_type" text,
	"ref_id" integer,
	"note" text,
	"actor_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"link" text,
	"read_at" timestamp with time zone,
	"slack_state" text DEFAULT 'queued' NOT NULL,
	"dedupe_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint

CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"total" integer NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"address" jsonb,
	"note" text,
	"staff_note" text,
	"tracking" text,
	"handled_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"repo_url" text NOT NULL,
	"demo_url" text,
	"run_steps" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "raiders" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "round_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"round_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"raccoon_points" numeric(10, 2) NOT NULL,
	"builder_points" numeric(10, 2) NOT NULL,
	"base_acorns" numeric(12, 2) NOT NULL,
	"bonus_acorns" numeric(12, 2) NOT NULL,
	"capped_acorns" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"season_id" integer NOT NULL,
	"number" integer NOT NULL,
	"build_starts_at" timestamp with time zone NOT NULL,
	"break_starts_at" timestamp with time zone NOT NULL,
	"break_ends_at" timestamp with time zone NOT NULL,
	"status" "round_status" DEFAULT 'open' NOT NULL,
	"assigned_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"rollover_in" numeric(14, 2) DEFAULT 0 NOT NULL,
	"rollover_out" numeric(14, 2),
	"pool" numeric(14, 2),
	"point_value" numeric(14, 4)
);
--> statement-breakpoint

CREATE TABLE "seasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"config" jsonb NOT NULL,
	"prize_pool" numeric(14, 2) DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "ships" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"round_id" integer NOT NULL,
	"repo_url" text NOT NULL,
	"demo_url" text,
	"run_steps" text,
	"commit_sha" text NOT NULL,
	"screenshot_url" text,
	"hackatime_projects" jsonb NOT NULL,
	"claimed_hours" numeric(8, 2) NOT NULL,
	"status" "ship_status" DEFAULT 'pending' NOT NULL,
	"tier" integer,
	"approved_hours" numeric(8, 2),
	"reviewer_id" integer,
	"review_note" text,
	"reviewed_at" timestamp with time zone,
	"verdict" "unbreakable_verdict",
	"verdict_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "unified_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"ship_id" integer,
	"assignment_id" integer,
	"state" text DEFAULT 'queued' NOT NULL,
	"error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unified_outbox_ship_id_unique" UNIQUE("ship_id"),
	CONSTRAINT "unified_outbox_assignment_id_unique" UNIQUE("assignment_id")
);
--> statement-breakpoint

CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"hca_id" text NOT NULL,
	"slack_id" text,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"birthday" date,
	"avatar_url" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"verification" text DEFAULT 'unknown' NOT NULL,
	"github_login" text,
	"hackatime_user_id" text,
	"hackatime_token" text,
	"address" jsonb,
	"banned" boolean DEFAULT false NOT NULL,
	"banned_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	CONSTRAINT "users_hca_id_unique" UNIQUE("hca_id")
);
--> statement-breakpoint

ALTER TABLE "assignments"
	ADD CONSTRAINT "assignments_round_id_rounds_id_fk"
	FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "assignments"
	ADD CONSTRAINT "assignments_raccoon_id_users_id_fk"
	FOREIGN KEY ("raccoon_id") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "assignments"
	ADD CONSTRAINT "assignments_ship_id_ships_id_fk"
	FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "assignments"
	ADD CONSTRAINT "assignments_hours_reviewer_id_users_id_fk"
	FOREIGN KEY ("hours_reviewer_id") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "audit"
	ADD CONSTRAINT "audit_actor_id_users_id_fk"
	FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "bugs"
	ADD CONSTRAINT "bugs_round_id_rounds_id_fk"
	FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "bugs"
	ADD CONSTRAINT "bugs_ship_id_ships_id_fk"
	FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "bugs"
	ADD CONSTRAINT "bugs_assignment_id_assignments_id_fk"
	FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "bugs"
	ADD CONSTRAINT "bugs_raccoon_id_users_id_fk"
	FOREIGN KEY ("raccoon_id") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "bugs"
	ADD CONSTRAINT "bugs_resolved_by_users_id_fk"
	FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "bugs"
	ADD CONSTRAINT "bugs_checked_by_users_id_fk"
	FOREIGN KEY ("checked_by") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ledger"
	ADD CONSTRAINT "ledger_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ledger"
	ADD CONSTRAINT "ledger_round_id_rounds_id_fk"
	FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ledger"
	ADD CONSTRAINT "ledger_actor_id_users_id_fk"
	FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "notifications"
	ADD CONSTRAINT "notifications_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "orders"
	ADD CONSTRAINT "orders_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "orders"
	ADD CONSTRAINT "orders_item_id_items_id_fk"
	FOREIGN KEY ("item_id") REFERENCES "public"."items"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "orders"
	ADD CONSTRAINT "orders_handled_by_users_id_fk"
	FOREIGN KEY ("handled_by") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "projects"
	ADD CONSTRAINT "projects_owner_id_users_id_fk"
	FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "raiders"
	ADD CONSTRAINT "raiders_round_id_rounds_id_fk"
	FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "raiders"
	ADD CONSTRAINT "raiders_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "round_scores"
	ADD CONSTRAINT "round_scores_round_id_rounds_id_fk"
	FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "round_scores"
	ADD CONSTRAINT "round_scores_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "rounds"
	ADD CONSTRAINT "rounds_season_id_seasons_id_fk"
	FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "sessions"
	ADD CONSTRAINT "sessions_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
	ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ships"
	ADD CONSTRAINT "ships_project_id_projects_id_fk"
	FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ships"
	ADD CONSTRAINT "ships_user_id_users_id_fk"
	FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ships"
	ADD CONSTRAINT "ships_round_id_rounds_id_fk"
	FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ships"
	ADD CONSTRAINT "ships_reviewer_id_users_id_fk"
	FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "ships"
	ADD CONSTRAINT "ships_verdict_by_users_id_fk"
	FOREIGN KEY ("verdict_by") REFERENCES "public"."users"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "unified_outbox"
	ADD CONSTRAINT "unified_outbox_ship_id_ships_id_fk"
	FOREIGN KEY ("ship_id") REFERENCES "public"."ships"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "unified_outbox"
	ADD CONSTRAINT "unified_outbox_assignment_id_assignments_id_fk"
	FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id")
	ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

CREATE UNIQUE INDEX "assignments_unique" ON "assignments"
	USING btree ("round_id","raccoon_id","ship_id");
--> statement-breakpoint

CREATE INDEX "audit_target" ON "audit" USING btree ("target_type","target_id");
--> statement-breakpoint

CREATE INDEX "bugs_ship" ON "bugs" USING btree ("ship_id");
--> statement-breakpoint

CREATE INDEX "bugs_raccoon" ON "bugs" USING btree ("raccoon_id");
--> statement-breakpoint

CREATE INDEX "ledger_user" ON "ledger" USING btree ("user_id");
--> statement-breakpoint

CREATE UNIQUE INDEX "ledger_ref" ON "ledger" USING btree ("reason","ref_type","ref_id");
--> statement-breakpoint

CREATE INDEX "notifications_user" ON "notifications" USING btree ("user_id");
--> statement-breakpoint

CREATE INDEX "orders_user" ON "orders" USING btree ("user_id");
--> statement-breakpoint

CREATE UNIQUE INDEX "raiders_round_user" ON "raiders" USING btree ("round_id","user_id");
--> statement-breakpoint

CREATE UNIQUE INDEX "round_scores_unique" ON "round_scores" USING btree ("round_id","user_id");
--> statement-breakpoint

CREATE UNIQUE INDEX "rounds_season_number" ON "rounds" USING btree ("season_id","number");
--> statement-breakpoint

CREATE INDEX "ships_round" ON "ships" USING btree ("round_id");
--> statement-breakpoint

CREATE INDEX "ships_user" ON "ships" USING btree ("user_id");
--> statement-breakpoint

CREATE UNIQUE INDEX "ships_user_round" ON "ships"
	USING btree ("user_id","round_id")
	WHERE status <> 'withdrawn';
--> statement-breakpoint

CREATE UNIQUE INDEX "users_hackatime_user_id" ON "users"
	USING btree ("hackatime_user_id")
	WHERE hackatime_user_id is not null;
--> statement-breakpoint

CREATE UNIQUE INDEX "users_github_login" ON "users"
	USING btree (lower(github_login))
	WHERE github_login is not null;
