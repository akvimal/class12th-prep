CREATE TYPE "public"."sat_domain" AS ENUM('INFORMATION_AND_IDEAS', 'CRAFT_AND_STRUCTURE', 'EXPRESSION_OF_IDEAS', 'STANDARD_ENGLISH_CONVENTIONS', 'ALGEBRA', 'ADVANCED_MATH', 'PROBLEM_SOLVING_DATA_ANALYSIS', 'GEOMETRY_TRIGONOMETRY');--> statement-breakpoint
CREATE TYPE "public"."sat_prep_plan_status" AS ENUM('ACTIVE', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "sat_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"test_date" date NOT NULL,
	"total_score" integer NOT NULL,
	"reading_writing_score" integer NOT NULL,
	"math_score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sat_attempts_student_number_unique" UNIQUE("student_id","attempt_number"),
	CONSTRAINT "sat_attempts_attempt_number_positive" CHECK ("sat_attempts"."attempt_number" >= 1),
	CONSTRAINT "sat_attempts_scores_in_range" CHECK ("sat_attempts"."total_score" between 400 and 1600
        and "sat_attempts"."reading_writing_score" between 200 and 800
        and "sat_attempts"."math_score" between 200 and 800)
);
--> statement-breakpoint
CREATE TABLE "sat_domain_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"domain" "sat_domain" NOT NULL,
	"performance_low" integer NOT NULL,
	"performance_high" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sat_domain_scores_attempt_domain_unique" UNIQUE("attempt_id","domain"),
	CONSTRAINT "sat_domain_scores_band_valid" CHECK ("sat_domain_scores"."performance_low" >= 0 and "sat_domain_scores"."performance_high" >= "sat_domain_scores"."performance_low")
);
--> statement-breakpoint
CREATE TABLE "sat_prep_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"test_date" date NOT NULL,
	"start_date" date NOT NULL,
	"weekly_target_minutes" integer NOT NULL,
	"status" "sat_prep_plan_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sat_prep_plans_dates_ordered" CHECK ("sat_prep_plans"."start_date" <= "sat_prep_plans"."test_date"),
	CONSTRAINT "sat_prep_plans_weekly_target_non_negative" CHECK ("sat_prep_plans"."weekly_target_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sat_prep_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"domain" "sat_domain",
	"session_date" date NOT NULL,
	"actual_minutes" integer NOT NULL,
	"full_practice_test" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sat_prep_sessions_actual_minutes_non_negative" CHECK ("sat_prep_sessions"."actual_minutes" >= 0)
);
--> statement-breakpoint
ALTER TABLE "sat_attempts" ADD CONSTRAINT "sat_attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sat_domain_scores" ADD CONSTRAINT "sat_domain_scores_attempt_id_sat_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."sat_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sat_prep_plans" ADD CONSTRAINT "sat_prep_plans_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sat_prep_sessions" ADD CONSTRAINT "sat_prep_sessions_plan_id_sat_prep_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."sat_prep_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sat_prep_plans_one_active_per_student" ON "sat_prep_plans" USING btree ("student_id") WHERE "sat_prep_plans"."status" = 'ACTIVE';