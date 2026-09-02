CREATE TYPE "public"."study_window_day_type" AS ENUM('WEEKDAY', 'WEEKEND', 'DAILY');--> statement-breakpoint
CREATE TABLE "study_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"day_type" "study_window_day_type" NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"label" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"reminder_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "study_windows_time_ordered" CHECK ("study_windows"."end_time" > "study_windows"."start_time")
);
--> statement-breakpoint
ALTER TABLE "study_windows" ADD CONSTRAINT "study_windows_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;