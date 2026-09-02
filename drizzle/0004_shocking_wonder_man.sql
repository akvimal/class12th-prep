CREATE TYPE "public"."chapter_state" AS ENUM('NOT_STARTED', 'LEARNING', 'LEARNED', 'PRACTISED', 'TESTED', 'REVISED', 'EXAM_READY');--> statement-breakpoint
CREATE TYPE "public"."confidence_level" AS ENUM('WEAK', 'MODERATE', 'STRONG');--> statement-breakpoint
CREATE TYPE "public"."interest_level" AS ENUM('DISLIKE', 'NEUTRAL', 'LIKE');--> statement-breakpoint
CREATE TYPE "public"."school_chapter_status" AS ENUM('NOT_TAUGHT', 'CURRENTLY_TEACHING', 'COMPLETED', 'REVISING');--> statement-breakpoint
CREATE TABLE "chapter_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"state" "chapter_state" DEFAULT 'NOT_STARTED' NOT NULL,
	"confidence" "confidence_level",
	"interest" "interest_level",
	"school_status" "school_chapter_status" DEFAULT 'NOT_TAUGHT' NOT NULL,
	"concept_score" integer DEFAULT 0 NOT NULL,
	"practice_score" integer DEFAULT 0 NOT NULL,
	"test_score" integer DEFAULT 0 NOT NULL,
	"recall_score" integer DEFAULT 0 NOT NULL,
	"revision_score" integer DEFAULT 0 NOT NULL,
	"effective_readiness" double precision,
	"last_studied_at" timestamp with time zone,
	"last_revised_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapter_progress_year_chapter_unique" UNIQUE("academic_year_id","chapter_id"),
	CONSTRAINT "chapter_progress_scores_in_range" CHECK ("chapter_progress"."concept_score" between 0 and 100
        and "chapter_progress"."practice_score" between 0 and 100
        and "chapter_progress"."test_score" between 0 and 100
        and "chapter_progress"."recall_score" between 0 and 100
        and "chapter_progress"."revision_score" between 0 and 100),
	CONSTRAINT "chapter_progress_readiness_in_range" CHECK ("chapter_progress"."effective_readiness" is null or ("chapter_progress"."effective_readiness" >= 0 and "chapter_progress"."effective_readiness" <= 100))
);
--> statement-breakpoint
ALTER TABLE "chapter_progress" ADD CONSTRAINT "chapter_progress_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapter_progress" ADD CONSTRAINT "chapter_progress_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;