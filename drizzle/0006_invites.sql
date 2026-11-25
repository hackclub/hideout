ALTER TYPE "public"."ledger_reason" ADD VALUE 'referral';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_code" text DEFAULT substr(md5(random()::text), 1, 10) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invited_by" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_hidden" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_invited_by" ON "users" USING btree ("invited_by");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invite_code_unique" UNIQUE("invite_code");