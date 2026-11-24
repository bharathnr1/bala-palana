CREATE TABLE "assessment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"academic_year" text NOT NULL,
	"grade_id" uuid,
	"term_id" uuid,
	"subject_id" uuid,
	"marks" numeric(6, 2),
	"max_marks" numeric(6, 2),
	"grade_letter" text,
	"remark" text,
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_child_year_term_subject_uq" UNIQUE("child_id","academic_year","term_id","subject_id"),
	CONSTRAINT "assessment_value_check" CHECK ("assessment"."marks" is not null or "assessment"."grade_letter" is not null or "assessment"."remark" is not null),
	CONSTRAINT "assessment_marks_check" CHECK ("assessment"."max_marks" is null or "assessment"."marks" is null or "assessment"."marks" <= "assessment"."max_marks")
);
--> statement-breakpoint
CREATE TABLE "admission" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"enquiry_on" date NOT NULL,
	"interview_on" date,
	"source_id" uuid,
	"status_id" uuid NOT NULL,
	"next_action" text,
	"follow_up_on" date,
	"assigned_to" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admission_child_id_uq" UNIQUE("child_id")
);
--> statement-breakpoint
CREATE TABLE "admission_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admission_id" uuid NOT NULL,
	"kind" "admission_event_kind" NOT NULL,
	"occurred_on" date NOT NULL,
	"status_id" uuid,
	"note" text,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "child" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"preferred_name" text,
	"dob" date,
	"photo_document_id" uuid,
	"stage" "child_stage" DEFAULT 'applicant' NOT NULL,
	"joined_on" date,
	"left_on" date,
	"left_reason" text,
	"own_phone" text,
	"own_email" text,
	"consent_given_at" timestamp with time zone,
	"notes" text,
	"anonymised_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "education_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"school" text NOT NULL,
	"from_year" integer,
	"to_year" integer,
	"grade_reached" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrolment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"academic_year" text NOT NULL,
	"grade_id" uuid,
	"group_id" uuid,
	"outside_school" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrolment_child_year_uq" UNIQUE("child_id","academic_year"),
	CONSTRAINT "enrolment_academic_year_check" CHECK ("enrolment"."academic_year" ~ '^\d{4}-\d{2}$')
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid,
	"kind_id" uuid,
	"title" text,
	"file_path" text NOT NULL,
	"mime" text,
	"size_bytes" integer,
	"issued_on" date,
	"restricted" boolean DEFAULT false NOT NULL,
	"uploaded_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_file_path_uq" UNIQUE("file_path")
);
--> statement-breakpoint
CREATE TABLE "cycle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"start_on" date NOT NULL,
	"end_on" date NOT NULL,
	"status" "cycle_status" DEFAULT 'planned' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cycle_dates_check" CHECK ("cycle"."end_on" >= "cycle"."start_on")
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_id" uuid NOT NULL,
	"duty_id" uuid,
	"label" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"role" "team_role" DEFAULT 'member' NOT NULL,
	"from_on" date,
	"to_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_member_team_child_uq" UNIQUE("team_id","child_id")
);
--> statement-breakpoint
CREATE TABLE "entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"note" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"subject_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"author_id" uuid NOT NULL,
	"visibility" "visibility" DEFAULT 'staff' NOT NULL,
	"follow_up_on" date,
	"status" "entry_status",
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"parent_id" uuid,
	"group_key" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entry_note_length_check" CHECK ("entry"."note" is null or char_length("entry"."note") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "entry_tag" (
	"entry_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entry_tag_entry_id_tag_id_pk" PRIMARY KEY("entry_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "child_guardian" (
	"child_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"relation_id" uuid,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "child_guardian_child_id_guardian_id_pk" PRIMARY KEY("child_id","guardian_id")
);
--> statement-breakpoint
CREATE TABLE "guardian" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"alt_phone" text,
	"email" text,
	"address" text,
	"occupation" text,
	"skills" text,
	"interests" text,
	"seva_involvement" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid,
	"audio_path" text,
	"duration_s" integer,
	"page_context" text,
	"transcript" text,
	"transcribed_at" timestamp with time zone,
	"status" "feedback_status" DEFAULT 'new' NOT NULL,
	"triage_note" text,
	"audio_deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"academic_year" text NOT NULL,
	"description" text NOT NULL,
	"amount_due_paise" bigint NOT NULL,
	"due_on" date,
	"created_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fee_amount_due_check" CHECK ("fee"."amount_due_paise" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fee_id" uuid NOT NULL,
	"amount_paise" bigint NOT NULL,
	"paid_on" date NOT NULL,
	"mode_id" uuid,
	"reference" text,
	"receipt_document_id" uuid,
	"recorded_by" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_amount_check" CHECK ("payment"."amount_paise" > 0)
);
--> statement-breakpoint
CREATE TABLE "health_profile" (
	"child_id" uuid PRIMARY KEY NOT NULL,
	"blood_group" text,
	"allergies" text,
	"conditions" text,
	"medical_alerts" text,
	"emergency_notes" text,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_grade_id_lookup_id_fk" FOREIGN KEY ("grade_id") REFERENCES "public"."lookup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_term_id_lookup_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."lookup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_subject_id_lookup_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."lookup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_recorded_by_app_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission" ADD CONSTRAINT "admission_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission" ADD CONSTRAINT "admission_source_id_lookup_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."lookup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission" ADD CONSTRAINT "admission_status_id_lookup_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission" ADD CONSTRAINT "admission_assigned_to_app_user_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_event" ADD CONSTRAINT "admission_event_admission_id_admission_id_fk" FOREIGN KEY ("admission_id") REFERENCES "public"."admission"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_event" ADD CONSTRAINT "admission_event_status_id_lookup_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."lookup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_event" ADD CONSTRAINT "admission_event_author_id_app_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "education_history" ADD CONSTRAINT "education_history_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolment" ADD CONSTRAINT "enrolment_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_kind_id_lookup_id_fk" FOREIGN KEY ("kind_id") REFERENCES "public"."lookup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_uploaded_by_app_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_cycle_id_cycle_id_fk" FOREIGN KEY ("cycle_id") REFERENCES "public"."cycle"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team" ADD CONSTRAINT "team_duty_id_lookup_id_fk" FOREIGN KEY ("duty_id") REFERENCES "public"."lookup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_category_id_lookup_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."lookup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_subject_id_lookup_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."lookup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_author_id_app_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_closed_by_app_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_parent_id_entry_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_tag" ADD CONSTRAINT "entry_tag_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_tag" ADD CONSTRAINT "entry_tag_tag_id_lookup_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."lookup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_guardian" ADD CONSTRAINT "child_guardian_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_guardian" ADD CONSTRAINT "child_guardian_guardian_id_guardian_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardian"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_guardian" ADD CONSTRAINT "child_guardian_relation_id_lookup_id_fk" FOREIGN KEY ("relation_id") REFERENCES "public"."lookup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_author_id_app_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee" ADD CONSTRAINT "fee_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee" ADD CONSTRAINT "fee_created_by_app_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_fee_id_fee_id_fk" FOREIGN KEY ("fee_id") REFERENCES "public"."fee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_mode_id_lookup_id_fk" FOREIGN KEY ("mode_id") REFERENCES "public"."lookup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_receipt_document_id_document_id_fk" FOREIGN KEY ("receipt_document_id") REFERENCES "public"."document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_recorded_by_app_user_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_profile" ADD CONSTRAINT "health_profile_child_id_child_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_profile" ADD CONSTRAINT "health_profile_updated_by_app_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."app_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessment_child_year_idx" ON "assessment" USING btree ("child_id","academic_year");--> statement-breakpoint
CREATE INDEX "admission_status_idx" ON "admission" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "admission_follow_up_idx" ON "admission" USING btree ("follow_up_on");--> statement-breakpoint
CREATE INDEX "admission_event_admission_idx" ON "admission_event" USING btree ("admission_id");--> statement-breakpoint
CREATE INDEX "child_full_name_trgm_idx" ON "child" USING gin ("full_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "child_stage_idx" ON "child" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "cycle_start_on_idx" ON "cycle" USING btree ("start_on");--> statement-breakpoint
CREATE INDEX "entry_child_occurred_idx" ON "entry" USING btree ("child_id","occurred_at" DESC NULLS LAST) WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "entry_open_follow_up_idx" ON "entry" USING btree ("status","follow_up_on") WHERE status = 'open';--> statement-breakpoint
CREATE INDEX "entry_author_idx" ON "entry" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "entry_category_idx" ON "entry" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "entry_parent_idx" ON "entry" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "fee_child_idx" ON "fee" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "fee_due_on_idx" ON "fee" USING btree ("due_on");--> statement-breakpoint
CREATE INDEX "payment_fee_idx" ON "payment" USING btree ("fee_id");