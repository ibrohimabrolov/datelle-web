CREATE TABLE "prop_bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"prop_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"qty" integer NOT NULL,
	"back" integer DEFAULT 0 NOT NULL,
	"broken" integer DEFAULT 0 NOT NULL,
	"lost" integer DEFAULT 0 NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prop_bookings_counts" CHECK ("prop_bookings"."qty" > 0 and "prop_bookings"."back" >= 0 and "prop_bookings"."broken" >= 0 and "prop_bookings"."lost" >= 0 and "prop_bookings"."back" + "prop_bookings"."broken" + "prop_bookings"."lost" <= "prop_bookings"."qty")
);
--> statement-breakpoint
CREATE TABLE "props" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"category" text NOT NULL,
	"total" integer NOT NULL,
	"repair" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "props_counts" CHECK ("props"."total" >= 0 and "props"."repair" >= 0 and "props"."repair" <= "props"."total")
);
--> statement-breakpoint
ALTER TABLE "prop_bookings" ADD CONSTRAINT "prop_bookings_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prop_bookings" ADD CONSTRAINT "prop_bookings_prop_id_props_id_fk" FOREIGN KEY ("prop_id") REFERENCES "public"."props"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prop_bookings" ADD CONSTRAINT "prop_bookings_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prop_bookings" ADD CONSTRAINT "prop_bookings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "props" ADD CONSTRAINT "props_studio_id_studios_id_fk" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "props" ADD CONSTRAINT "props_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prop_bookings_prop_order" ON "prop_bookings" USING btree ("prop_id","order_id");--> statement-breakpoint
CREATE INDEX "prop_bookings_order_idx" ON "prop_bookings" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "props_studio_idx" ON "props" USING btree ("studio_id");--> statement-breakpoint
CREATE UNIQUE INDEX "props_studio_code" ON "props" USING btree ("studio_id","code") WHERE deleted_at is null;