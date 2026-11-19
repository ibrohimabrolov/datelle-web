CREATE TABLE "order_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"tg_user_id" bigint NOT NULL,
	"text" text,
	"sender_name" text,
	"parsed" jsonb NOT NULL,
	"parts" integer DEFAULT 1 NOT NULL,
	"bot_message_id" integer,
	"order_id" uuid,
	"consumed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_drafts" ADD CONSTRAINT "order_drafts_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_drafts_user_idx" ON "order_drafts" USING btree ("tg_user_id","updated_at");--> statement-breakpoint
CREATE INDEX "order_drafts_expires_idx" ON "order_drafts" USING btree ("expires_at");