CREATE TABLE "panel_logins" (
	"id" text PRIMARY KEY NOT NULL,
	"secret_hash" text NOT NULL,
	"code" text NOT NULL,
	"started_by" bigint,
	"tg_user" jsonb,
	"approved_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "panel_logins_secret_hash_unique" UNIQUE("secret_hash")
);
--> statement-breakpoint
CREATE INDEX "panel_logins_expires_idx" ON "panel_logins" USING btree ("expires_at");