CREATE TABLE "subject_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"theory_max_marks" integer,
	"practical_max_marks" integer,
	"target_marks" integer,
	"board_exam_date" date,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_enrollments_year_subject_unique" UNIQUE("academic_year_id","subject_id"),
	CONSTRAINT "subject_enrollments_marks_non_negative" CHECK (("subject_enrollments"."theory_max_marks" is null or "subject_enrollments"."theory_max_marks" >= 0)
        and ("subject_enrollments"."practical_max_marks" is null or "subject_enrollments"."practical_max_marks" >= 0)
        and ("subject_enrollments"."target_marks" is null or "subject_enrollments"."target_marks" >= 0))
);
--> statement-breakpoint
ALTER TABLE "subject_enrollments" ADD CONSTRAINT "subject_enrollments_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subject_enrollments" ADD CONSTRAINT "subject_enrollments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE restrict ON UPDATE no action;