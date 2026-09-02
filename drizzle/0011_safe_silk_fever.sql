CREATE TYPE "public"."error_state" AS ENUM('NEW', 'REVIEWED', 'CORRECTED', 'RETEST_DUE', 'MASTERED');--> statement-breakpoint
CREATE TYPE "public"."error_type" AS ENUM('CONCEPT', 'FORMULA_RECALL', 'MEMORY', 'CALCULATION', 'MISREAD_QUESTION', 'WRONG_METHOD', 'INCOMPLETE_STEPS', 'PRESENTATION', 'TIME_MANAGEMENT', 'CARELESS', 'UNKNOWN');--> statement-breakpoint
CREATE TABLE "assessment_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"max_marks" integer NOT NULL,
	"time_taken_minutes" integer,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_results_assessment_id_unique" UNIQUE("assessment_id"),
	CONSTRAINT "assessment_results_score_range" CHECK ("assessment_results"."score" >= 0 and "assessment_results"."score" <= "assessment_results"."max_marks")
);
--> statement-breakpoint
CREATE TABLE "question_errors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_result_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"marks_lost" integer NOT NULL,
	"error_type" "error_type" NOT NULL,
	"state" "error_state" DEFAULT 'NEW' NOT NULL,
	"notes" text,
	"retest_due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_errors_marks_lost_positive" CHECK ("question_errors"."marks_lost" > 0)
);
--> statement-breakpoint
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_errors" ADD CONSTRAINT "question_errors_assessment_result_id_assessment_results_id_fk" FOREIGN KEY ("assessment_result_id") REFERENCES "public"."assessment_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_errors" ADD CONSTRAINT "question_errors_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_errors" ADD CONSTRAINT "question_errors_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;