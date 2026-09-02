CREATE TYPE "public"."revision_method" AS ENUM('ACTIVE_RECALL', 'BLANK_PAGE', 'PRACTISE', 'PYQ', 'FLASHCARDS');--> statement-breakpoint
CREATE TYPE "public"."revision_outcome" AS ENUM('STRONG', 'MODERATE', 'WEAK', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."revision_status" AS ENUM('SCHEDULED', 'DONE', 'MISSED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "revision_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"due_date" date NOT NULL,
	"method" "revision_method" NOT NULL,
	"status" "revision_status" DEFAULT 'SCHEDULED' NOT NULL,
	"outcome" "revision_outcome",
	"completed_on" date,
	"source_session_id" uuid,
	"algorithm_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revision_schedules_revision_number_positive" CHECK ("revision_schedules"."revision_number" >= 1)
);
--> statement-breakpoint
ALTER TABLE "revision_schedules" ADD CONSTRAINT "revision_schedules_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_schedules" ADD CONSTRAINT "revision_schedules_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "revision_schedules_one_active" ON "revision_schedules" USING btree ("academic_year_id","chapter_id") WHERE "revision_schedules"."status" = 'SCHEDULED';