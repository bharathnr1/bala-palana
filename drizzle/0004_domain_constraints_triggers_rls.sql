-- Constraints that Drizzle cannot express, then triggers and RLS for every
-- table added in 0003 (02-schema § Audit, § Row-level security).

-- `child` and `document` reference each other; the child side is added here so
-- the TypeScript schema has no import cycle.
alter table "child"
  add constraint "child_photo_document_id_document_id_fk"
  foreign key ("photo_document_id") references "public"."document"("id");

-- Cycles never overlap (D8). Needs btree_gist for the range exclusion.
alter table "cycle"
  add constraint "cycle_no_overlap_excl"
  exclude using gist (daterange("start_on", "end_on", '[]') with &&);

-- Keep `updated_at` current on every mutable table.
create trigger child_set_updated_at before update on child
  for each row execute function set_updated_at();
create trigger guardian_set_updated_at before update on guardian
  for each row execute function set_updated_at();
create trigger child_guardian_set_updated_at before update on child_guardian
  for each row execute function set_updated_at();
create trigger enrolment_set_updated_at before update on enrolment
  for each row execute function set_updated_at();
create trigger education_history_set_updated_at before update on education_history
  for each row execute function set_updated_at();
create trigger admission_set_updated_at before update on admission
  for each row execute function set_updated_at();
create trigger admission_event_set_updated_at before update on admission_event
  for each row execute function set_updated_at();
create trigger entry_set_updated_at before update on entry
  for each row execute function set_updated_at();
create trigger assessment_set_updated_at before update on assessment
  for each row execute function set_updated_at();
create trigger health_profile_set_updated_at before update on health_profile
  for each row execute function set_updated_at();
create trigger document_set_updated_at before update on document
  for each row execute function set_updated_at();
create trigger cycle_set_updated_at before update on cycle
  for each row execute function set_updated_at();
create trigger team_set_updated_at before update on team
  for each row execute function set_updated_at();
create trigger team_member_set_updated_at before update on team_member
  for each row execute function set_updated_at();
create trigger fee_set_updated_at before update on fee
  for each row execute function set_updated_at();
create trigger payment_set_updated_at before update on payment
  for each row execute function set_updated_at();
create trigger feedback_set_updated_at before update on feedback
  for each row execute function set_updated_at();

-- Audit every write except on `audit_log` itself (D26).
create trigger child_audit after insert or update or delete on child
  for each row execute function audit_row();
create trigger guardian_audit after insert or update or delete on guardian
  for each row execute function audit_row();
create trigger child_guardian_audit after insert or update or delete on child_guardian
  for each row execute function audit_row();
create trigger enrolment_audit after insert or update or delete on enrolment
  for each row execute function audit_row();
create trigger education_history_audit after insert or update or delete on education_history
  for each row execute function audit_row();
create trigger admission_audit after insert or update or delete on admission
  for each row execute function audit_row();
create trigger admission_event_audit after insert or update or delete on admission_event
  for each row execute function audit_row();
create trigger entry_audit after insert or update or delete on entry
  for each row execute function audit_row();
create trigger entry_tag_audit after insert or update or delete on entry_tag
  for each row execute function audit_row();
create trigger assessment_audit after insert or update or delete on assessment
  for each row execute function audit_row();
create trigger health_profile_audit after insert or update or delete on health_profile
  for each row execute function audit_row();
create trigger document_audit after insert or update or delete on document
  for each row execute function audit_row();
create trigger cycle_audit after insert or update or delete on cycle
  for each row execute function audit_row();
create trigger team_audit after insert or update or delete on team
  for each row execute function audit_row();
create trigger team_member_audit after insert or update or delete on team_member
  for each row execute function audit_row();
create trigger fee_audit after insert or update or delete on fee
  for each row execute function audit_row();
create trigger payment_audit after insert or update or delete on payment
  for each row execute function audit_row();
create trigger feedback_audit after insert or update or delete on feedback
  for each row execute function audit_row();

-- Public API key reads nothing; the server layer enforces access (D25).
alter table child enable row level security;
alter table guardian enable row level security;
alter table child_guardian enable row level security;
alter table enrolment enable row level security;
alter table education_history enable row level security;
alter table admission enable row level security;
alter table admission_event enable row level security;
alter table entry enable row level security;
alter table entry_tag enable row level security;
alter table assessment enable row level security;
alter table health_profile enable row level security;
alter table document enable row level security;
alter table cycle enable row level security;
alter table team enable row level security;
alter table team_member enable row level security;
alter table fee enable row level security;
alter table payment enable row level security;
alter table feedback enable row level security;
