CREATE TYPE "public"."actor" AS ENUM('client', 'vendor', 'system', 'admin');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('new', 'reviewing', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('dekor', 'floristika');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'confirmed', 'declined', 'expired', 'cancelled', 'paid', 'completed');--> statement-breakpoint
CREATE TYPE "public"."request_type" AS ENUM('booking', 'quote');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('client', 'vendor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."vendor_status" AS ENUM('active', 'hidden');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"event_date" date,
	"context" jsonb,
	"handled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" uuid NOT NULL,
	"title" text NOT NULL,
	"includes" text DEFAULT '' NOT NULL,
	"price" bigint NOT NULL,
	"deposit_pct" integer DEFAULT 30 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partner_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"studio_name" text NOT NULL,
	"category" "category" NOT NULL,
	"district" text NOT NULL,
	"instagram" text,
	"legal_form" text NOT NULL,
	"contact_name" text NOT NULL,
	"phone" text NOT NULL,
	"status" "application_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"from_status" "request_status",
	"to_status" "request_status" NOT NULL,
	"actor" "actor" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"type" "request_type" NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"user_id" uuid NOT NULL,
	"vendor_id" uuid NOT NULL,
	"package_id" text,
	"event_date" date NOT NULL,
	"event_type" text,
	"guests" integer,
	"venue" text,
	"budget" text,
	"notes" text,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"price" bigint,
	"deposit" bigint,
	"respond_by" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requests_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"role" "user_role" DEFAULT 'client' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "vendor_days" (
	"vendor_id" uuid NOT NULL,
	"day" date NOT NULL,
	"booked" integer DEFAULT 0 NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	CONSTRAINT "vendor_days_vendor_id_day_pk" PRIMARY KEY("vendor_id","day")
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" "category" NOT NULL,
	"district" text NOT NULL,
	"rating" numeric(2, 1) DEFAULT 0 NOT NULL,
	"reviews_count" integer DEFAULT 0 NOT NULL,
	"price_from" bigint NOT NULL,
	"response_hours" integer DEFAULT 2 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"events" text[] DEFAULT '{}'::text[] NOT NULL,
	"daily_capacity" integer DEFAULT 3 NOT NULL,
	"rank" integer DEFAULT 1000 NOT NULL,
	"image_key" text NOT NULL,
	"about" text DEFAULT '' NOT NULL,
	"owner_id" uuid,
	"status" "vendor_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_days" ADD CONSTRAINT "vendor_days_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "otp_phone_created_idx" ON "otp_codes" USING btree ("phone","created_at");--> statement-breakpoint
CREATE INDEX "packages_vendor_idx" ON "packages" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "request_events_req_idx" ON "request_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "requests_user_idx" ON "requests" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "requests_vendor_day_idx" ON "requests" USING btree ("vendor_id","event_date");--> statement-breakpoint
CREATE UNIQUE INDEX "requests_open_unique" ON "requests" USING btree ("user_id","vendor_id","event_date") WHERE status in ('pending','confirmed','paid');--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vendor_days_day_idx" ON "vendor_days" USING btree ("day");--> statement-breakpoint
CREATE INDEX "vendors_cat_status_idx" ON "vendors" USING btree ("category","status");