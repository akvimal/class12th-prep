CREATE TYPE "public"."curriculum_scope_type" AS ENUM('SUBJECT', 'UNIT', 'CHAPTER', 'TOPIC');--> statement-breakpoint
CREATE TYPE "public"."weight_source_type" AS ENUM('OFFICIAL', 'DERIVED_SQP', 'DERIVED_PYQ', 'SCHOOL_TEACHER', 'USER');--> statement-breakpoint
CREATE TYPE "public"."weight_unit" AS ENUM('PERCENT', 'MARKS', 'COUNT', 'RELATIVE');--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_version_id" uuid NOT NULL,
	"unit_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapters_version_key_unique" UNIQUE("curriculum_version_id","key"),
	CONSTRAINT "chapters_id_version_unique" UNIQUE("id","curriculum_version_id")
);
--> statement-breakpoint
CREATE TABLE "curriculum_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board" text NOT NULL,
	"grade" integer NOT NULL,
	"academic_year_label" text NOT NULL,
	"version" text NOT NULL,
	"source_reference" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "curriculum_versions_identity_unique" UNIQUE("board","grade","academic_year_label","version"),
	CONSTRAINT "curriculum_versions_grade_range" CHECK ("curriculum_versions"."grade" between 1 and 12)
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_version_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_version_key_unique" UNIQUE("curriculum_version_id","key"),
	CONSTRAINT "subjects_id_version_unique" UNIQUE("id","curriculum_version_id")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_version_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "topics_version_key_unique" UNIQUE("curriculum_version_id","key")
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_version_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "units_version_key_unique" UNIQUE("curriculum_version_id","key"),
	CONSTRAINT "units_id_version_unique" UNIQUE("id","curriculum_version_id")
);
--> statement-breakpoint
CREATE TABLE "academic_weights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"curriculum_version_id" uuid NOT NULL,
	"scope_type" "curriculum_scope_type" NOT NULL,
	"subject_id" uuid,
	"unit_id" uuid,
	"chapter_id" uuid,
	"topic_id" uuid,
	"value" double precision NOT NULL,
	"unit" "weight_unit" NOT NULL,
	"source_type" "weight_source_type" NOT NULL,
	"source_reference" text,
	"confidence" double precision,
	"effective_from" date NOT NULL,
	"retrieved_at" timestamp with time zone,
	"parser_version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "academic_weights_exactly_one_scope" CHECK (num_nonnulls("academic_weights"."subject_id", "academic_weights"."unit_id", "academic_weights"."chapter_id", "academic_weights"."topic_id") = 1),
	CONSTRAINT "academic_weights_scope_type_matches" CHECK (("academic_weights"."scope_type" = 'SUBJECT' and "academic_weights"."subject_id" is not null)
        or ("academic_weights"."scope_type" = 'UNIT' and "academic_weights"."unit_id" is not null)
        or ("academic_weights"."scope_type" = 'CHAPTER' and "academic_weights"."chapter_id" is not null)
        or ("academic_weights"."scope_type" = 'TOPIC' and "academic_weights"."topic_id" is not null)),
	CONSTRAINT "academic_weights_official_needs_reference" CHECK ("academic_weights"."source_type" <> 'OFFICIAL' or "academic_weights"."source_reference" is not null),
	CONSTRAINT "academic_weights_confidence_range" CHECK ("academic_weights"."confidence" is null or ("academic_weights"."confidence" >= 0 and "academic_weights"."confidence" <= 1))
);
--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_unit_fk" FOREIGN KEY ("unit_id","curriculum_version_id") REFERENCES "public"."units"("id","curriculum_version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_curriculum_version_id_curriculum_versions_id_fk" FOREIGN KEY ("curriculum_version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topics" ADD CONSTRAINT "topics_chapter_fk" FOREIGN KEY ("chapter_id","curriculum_version_id") REFERENCES "public"."chapters"("id","curriculum_version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "units" ADD CONSTRAINT "units_subject_fk" FOREIGN KEY ("subject_id","curriculum_version_id") REFERENCES "public"."subjects"("id","curriculum_version_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_weights" ADD CONSTRAINT "academic_weights_curriculum_version_id_curriculum_versions_id_fk" FOREIGN KEY ("curriculum_version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_weights" ADD CONSTRAINT "academic_weights_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_weights" ADD CONSTRAINT "academic_weights_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_weights" ADD CONSTRAINT "academic_weights_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_weights" ADD CONSTRAINT "academic_weights_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_curriculum_version_id_curriculum_versions_id_fk" FOREIGN KEY ("curriculum_version_id") REFERENCES "public"."curriculum_versions"("id") ON DELETE restrict ON UPDATE no action;