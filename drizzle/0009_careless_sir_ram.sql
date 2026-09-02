CREATE TYPE "public"."domain_event_delivery" AS ENUM('PENDING', 'DELIVERED', 'SUPPRESSED');--> statement-breakpoint
CREATE TYPE "public"."domain_event_type" AS ENUM('REVISION_DUE', 'REVISION_OVERDUE', 'SCHOOL_TEST_APPROACHING', 'PREBOARD_APPROACHING', 'STUDY_BLOCK_MISSED', 'PLAN_AT_RISK', 'WEEKLY_REVIEW_READY', 'REPEATED_ERROR_DETECTED', 'SYLLABUS_TARGET_AT_RISK');--> statement-breakpoint
CREATE TABLE "domain_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"event_type" "domain_event_type" NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"delivery_status" "domain_event_delivery" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domain_events_dedupe" UNIQUE("student_id","dedupe_key")
);
--> statement-breakpoint
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;