CREATE TYPE "public"."study_task_slot" AS ENUM('PRIMARY', 'OPTIONAL');--> statement-breakpoint
CREATE TYPE "public"."study_task_status" AS ENUM('SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "study_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"planned_date" date NOT NULL,
	"activity" "study_session_type" NOT NULL,
	"planned_minutes" integer NOT NULL,
	"slot" "study_task_slot" NOT NULL,
	"reason_codes" text[] DEFAULT '{}' NOT NULL,
	"priority_score" real,
	"status" "study_task_status" DEFAULT 'SCHEDULED' NOT NULL,
	"source_session_id" uuid,
	"algorithm_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "study_tasks_planned_minutes_non_negative" CHECK ("study_tasks"."planned_minutes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "study_tasks" ADD CONSTRAINT "study_tasks_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_tasks" ADD CONSTRAINT "study_tasks_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_tasks" ADD CONSTRAINT "study_tasks_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "study_tasks_one_open" ON "study_tasks" USING btree ("academic_year_id","chapter_id","planned_date") WHERE "study_tasks"."status" = 'SCHEDULED';--> statement-breakpoint
CREATE INDEX "study_tasks_year_date_idx" ON "study_tasks" USING btree ("academic_year_id","planned_date");--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_study_task_id_study_tasks_id_fk" FOREIGN KEY ("study_task_id") REFERENCES "public"."study_tasks"("id") ON DELETE set null ON UPDATE no action;