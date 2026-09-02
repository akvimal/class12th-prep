CREATE TYPE "public"."assessment_status" AS ENUM('ANNOUNCED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."assessment_type" AS ENUM('SCHOOL_CLASS_TEST', 'SCHOOL_UNIT_TEST', 'SCHOOL_HALF_YEARLY', 'PREBOARD', 'SELF_TEST', 'PYQ', 'SAMPLE_PAPER', 'FULL_MOCK');--> statement-breakpoint
CREATE TABLE "assessment_chapters" (
	"assessment_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	CONSTRAINT "assessment_chapters_assessment_id_chapter_id_pk" PRIMARY KEY("assessment_id","chapter_id")
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"type" "assessment_type" NOT NULL,
	"name" text NOT NULL,
	"exam_date" date NOT NULL,
	"max_marks" integer,
	"status" "assessment_status" DEFAULT 'ANNOUNCED' NOT NULL,
	"announced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_max_marks_positive" CHECK ("assessments"."max_marks" is null or "assessments"."max_marks" > 0)
);
--> statement-breakpoint
ALTER TABLE "assessment_chapters" ADD CONSTRAINT "assessment_chapters_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_chapters" ADD CONSTRAINT "assessment_chapters_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;