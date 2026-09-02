CREATE TYPE "public"."readiness_scope_type" AS ENUM('CHAPTER', 'SUBJECT', 'ACADEMIC_YEAR');--> statement-breakpoint
CREATE TABLE "readiness_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"scope_type" "readiness_scope_type" NOT NULL,
	"scope_id" uuid NOT NULL,
	"readiness" double precision NOT NULL,
	"raw" double precision NOT NULL,
	"recency_factor" double precision NOT NULL,
	"component_json" jsonb NOT NULL,
	"algorithm_version" text NOT NULL,
	"calculated_for" date NOT NULL,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "readiness_snapshots_readiness_in_range" CHECK ("readiness_snapshots"."readiness" >= 0 and "readiness_snapshots"."readiness" <= 100),
	CONSTRAINT "readiness_snapshots_raw_in_range" CHECK ("readiness_snapshots"."raw" >= 0 and "readiness_snapshots"."raw" <= 100),
	CONSTRAINT "readiness_snapshots_recency_positive" CHECK ("readiness_snapshots"."recency_factor" > 0)
);
--> statement-breakpoint
ALTER TABLE "readiness_snapshots" ADD CONSTRAINT "readiness_snapshots_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "readiness_snapshots_scope_idx" ON "readiness_snapshots" USING btree ("academic_year_id","scope_type","scope_id","calculated_at");