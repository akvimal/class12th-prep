CREATE TYPE "public"."phase_type" AS ENUM('FOUNDATION', 'SYLLABUS_COVERAGE', 'CONSOLIDATION', 'REVISION', 'PREBOARD', 'BOARD_EXAM');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('DRAFT', 'ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"board" text NOT NULL,
	"grade" integer NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "students_grade_range" CHECK ("students"."grade" between 1 and 12)
);
--> statement-breakpoint
CREATE TABLE "academic_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"year_label" text NOT NULL,
	"curriculum_version_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_years_student_label_unique" UNIQUE("student_id","year_label"),
	CONSTRAINT "academic_years_dates_ordered" CHECK ("academic_years"."start_date" < "academic_years"."end_date")
);
--> statement-breakpoint
CREATE TABLE "plan_phases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"preparation_plan_id" uuid NOT NULL,
	"phase_type" "phase_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_phases_plan_type_unique" UNIQUE("preparation_plan_id","phase_type"),
	CONSTRAINT "plan_phases_dates_ordered" CHECK ("plan_phases"."start_date" <= "plan_phases"."end_date")
);
--> statement-breakpoint
CREATE TABLE "preparation_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"status" "plan_status" DEFAULT 'DRAFT' NOT NULL,
	"start_date" date NOT NULL,
	"syllabus_target_date" date NOT NULL,
	"hard_completion_date" date NOT NULL,
	"revision_start_date" date NOT NULL,
	"exam_window_start" date NOT NULL,
	"exam_window_end" date NOT NULL,
	"weekday_capacity_minutes" integer NOT NULL,
	"weekend_capacity_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "preparation_plans_dates_ordered" CHECK ("preparation_plans"."start_date" <= "preparation_plans"."syllabus_target_date"
        and "preparation_plans"."syllabus_target_date" <= "preparation_plans"."hard_completion_date"
        and "preparation_plans"."hard_completion_date" <= "preparation_plans"."revision_start_date"
        and "preparation_plans"."revision_start_date" <= "preparation_plans"."exam_window_start"
        and "preparation_plans"."exam_window_start" <= "preparation_plans"."exam_window_end"),
	CONSTRAINT "preparation_plans_capacity_non_negative" CHECK ("preparation_plans"."weekday_capacity_minutes" >= 0 and "preparation_plans"."weekend_capacity_minutes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_phases" ADD CONSTRAINT "plan_phases_preparation_plan_id_preparation_plans_id_fk" FOREIGN KEY ("preparation_plan_id") REFERENCES "public"."preparation_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparation_plans" ADD CONSTRAINT "preparation_plans_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "preparation_plans_one_active_per_year" ON "preparation_plans" USING btree ("academic_year_id") WHERE "preparation_plans"."status" = 'ACTIVE';