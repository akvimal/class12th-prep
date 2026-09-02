CREATE TYPE "public"."school_event_type" AS ENUM('NORMAL_SCHOOL_DAY', 'HOLIDAY', 'STUDY_LEAVE', 'EXAM_DAY', 'PRACTICAL_DAY', 'VACATION', 'UNAVAILABLE');--> statement-breakpoint
CREATE TABLE "school_calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"type" "school_event_type" NOT NULL,
	"title" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"capacity_override" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_calendar_events_dates_ordered" CHECK ("school_calendar_events"."start_date" <= "school_calendar_events"."end_date"),
	CONSTRAINT "school_calendar_events_capacity_non_negative" CHECK ("school_calendar_events"."capacity_override" is null or "school_calendar_events"."capacity_override" >= 0)
);
--> statement-breakpoint
ALTER TABLE "school_calendar_events" ADD CONSTRAINT "school_calendar_events_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;