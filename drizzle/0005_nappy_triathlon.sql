CREATE TYPE "public"."session_completion" AS ENUM('YES', 'PARTIAL', 'NO');--> statement-breakpoint
CREATE TYPE "public"."study_session_type" AS ENUM('LEARN', 'PRACTISE', 'ACTIVE_RECALL', 'REVISION', 'PYQ', 'CHAPTER_TEST', 'UNIT_TEST', 'SAMPLE_PAPER', 'FULL_PAPER', 'ERROR_CORRECTION', 'SCHOOL_HOMEWORK');--> statement-breakpoint
CREATE TABLE "study_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"subject_id" uuid,
	"chapter_id" uuid,
	"study_task_id" uuid,
	"type" "study_session_type" NOT NULL,
	"completion" "session_completion" NOT NULL,
	"session_date" date NOT NULL,
	"planned_minutes" integer,
	"actual_minutes" integer NOT NULL,
	"attempted" integer,
	"correct" integer,
	"confidence_after" "confidence_level",
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_sessions_actual_minutes_non_negative" CHECK ("study_sessions"."actual_minutes" >= 0),
	CONSTRAINT "study_sessions_planned_minutes_non_negative" CHECK ("study_sessions"."planned_minutes" is null or "study_sessions"."planned_minutes" >= 0),
	CONSTRAINT "study_sessions_attempted_non_negative" CHECK ("study_sessions"."attempted" is null or "study_sessions"."attempted" >= 0),
	CONSTRAINT "study_sessions_correct_valid" CHECK ("study_sessions"."correct" is null
        or ("study_sessions"."correct" >= 0 and ("study_sessions"."attempted" is null or "study_sessions"."correct" <= "study_sessions"."attempted"))),
	CONSTRAINT "study_sessions_chapter_implies_subject" CHECK ("study_sessions"."chapter_id" is null or "study_sessions"."subject_id" is not null),
	CONSTRAINT "study_sessions_times_ordered" CHECK ("study_sessions"."started_at" is null or "study_sessions"."ended_at" is null or "study_sessions"."ended_at" >= "study_sessions"."started_at")
);
--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_sessions" ADD CONSTRAINT "study_sessions_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "study_sessions_year_date_idx" ON "study_sessions" USING btree ("academic_year_id","session_date");