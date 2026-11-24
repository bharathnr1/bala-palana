# 02 — Database Schema

The source of truth for tables, constraints, views and seed data. The [design doc](../design-doc.md#3-domain-model) explains *why*; this file says *exactly what*.

Postgres (Supabase), schema `public`. Conventions are in [01-conventions](01-conventions.md#data-conventions). Every table has `created_at timestamptz not null default now()`; mutable tables also have `updated_at` (kept current by a trigger). These two columns aren't repeated below.

## Extensions

`pgcrypto` (uuid), `citext` (case-insensitive email), `pg_trgm` (name search), `btree_gist` (no-overlap constraint on cycles).

## Enums (fixed by code)

| Enum | Values |
|---|---|
| `user_role` | `admin`, `management`, `coordinator`, `teacher` |
| `child_stage` | `applicant`, `student`, `alumna`, `not_admitted`, `withdrawn` |
| `visibility` | `staff`, `restricted` |
| `entry_status` | `open`, `closed` |
| `admission_event_kind` | `status_change`, `interview`, `assessment`, `activity`, `observation`, `note` |
| `cycle_status` | `planned`, `active`, `paused`, `skipped`, `done` |
| `team_role` | `lead`, `member` |
| `feedback_status` | `new`, `triaged`, `done` |

Anything the gurukula may want to rename or extend is a **lookup**, not an enum (D7).

## Tables

### Configuration and users

**`lookup`**: every configurable list.
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| kind | text not null | one of the kinds in [Seeds](#seeds) |
| key | text not null | stable slug used by code; unique with `kind` |
| label | text not null | shown in UI; editable |
| sort | int not null default 0 | |
| active | bool not null default true | inactive = hidden from pickers, kept for history |
| meta | jsonb not null default '{}' | per-kind extras (see Seeds) |

Unique `(kind, key)`; index `(kind, active, sort)`.

**`setting`**: `key text pk`, `value jsonb not null`, `updated_by uuid → app_user`.

**`app_user`**
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| auth_user_id | uuid unique null | Supabase `auth.users.id`, linked on first sign-in |
| email | citext unique not null | the invite allowlist |
| name | text not null | |
| role | user_role not null | |
| active | bool not null default true | |
| last_seen_at | timestamptz | |

### Child and family

**`child`**
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| full_name | text not null | trigram index for search |
| preferred_name | text | |
| dob | date | |
| photo_document_id | uuid null → document | |
| stage | child_stage not null default 'applicant' | index |
| joined_on, left_on | date | |
| left_reason | text | |
| own_phone, own_email | text | used once she's an alumna |
| consent_given_at | timestamptz | required to move to `student` |
| notes | text | |
| anonymised_at | timestamptz | set by removal on request ([design §6](../design-doc.md#6-privacy-and-data-protection)) |

**`guardian`**: id, name (not null), phone, alt_phone, email, address, occupation, skills, interests, seva_involvement, notes.

**`child_guardian`**: `child_id → child`, `guardian_id → guardian`, `relation_id → lookup(relation)`, `is_primary bool default false`. PK `(child_id, guardian_id)`. Siblings share guardian rows.

**`enrolment`**: id, `child_id → child`, `academic_year text` (check `^\d{4}-\d{2}$`), `grade_id → lookup(grade)`, `group_id → lookup(group)` null, `outside_school text`. Unique `(child_id, academic_year)`.

**`education_history`**: id, `child_id`, school (not null), from_year int, to_year int, grade_reached text, note.

### Admissions

**`admission`**: id, `child_id` unique → child, `enquiry_on date not null`, `interview_on date`, `source_id → lookup(admission_source)`, `status_id → lookup(admission_status)` not null, `next_action text`, `follow_up_on date`, `assigned_to → app_user` null. Indexes `(status_id)`, `(follow_up_on)`.

**`admission_event`**: id, `admission_id → admission`, `kind admission_event_kind`, `occurred_on date not null`, `status_id → lookup(admission_status)` null (set for `status_change`), `note text`, `author_id → app_user`.

### Timeline

**`entry`**: the backbone (D6).
| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| child_id | uuid not null → child | |
| category_id | uuid not null → lookup(entry_category) | |
| note | text | ≤ 2000 chars (check) |
| details | jsonb not null default '{}' | validated in code by the category's Zod schema |
| subject_id | uuid null → lookup(subject) | |
| occurred_at | timestamptz not null default now() | |
| author_id | uuid not null → app_user | |
| visibility | visibility not null default 'staff' | default taken from category `meta.restricted` |
| follow_up_on | date | |
| status | entry_status null | `open` when a follow-up or concern is pending |
| closed_at, closed_by | timestamptz, uuid → app_user | |
| parent_id | uuid null → entry | follow-up / corrective-action thread |
| group_key | uuid null | same value for rows created together (D23) |
| deleted_at | timestamptz | soft delete |

Indexes: `(child_id, occurred_at desc) where deleted_at is null`; `(status, follow_up_on) where status = 'open'`; `(author_id)`; `(category_id)`; `(parent_id)`.

**`entry_tag`**: `entry_id → entry`, `tag_id → lookup(tag)`; PK both.

### Academics and health

**`assessment`**: id, child_id, academic_year, `grade_id → lookup(grade)`, `term_id → lookup(term)`, `subject_id → lookup(subject)`, `marks numeric(6,2)`, `max_marks numeric(6,2)`, `grade_letter text`, `remark text`, `recorded_by → app_user`.
- Unique `(child_id, academic_year, term_id, subject_id)`.
- Check: at least one of marks / grade_letter / remark is not null; `marks <= max_marks` when both are set (D10).

**`health_profile`**: `child_id pk → child`, blood_group, allergies, conditions, `medical_alerts` (visible to all staff, D13), emergency_notes, `updated_by → app_user`.

### Files

**`document`**: id, `child_id → child` null, `kind_id → lookup(document_kind)`, title, `file_path text not null` (unique), mime, size_bytes int, issued_on date, `restricted bool not null` (default from kind `meta.restricted`), `uploaded_by → app_user`, deleted_at.

Storage buckets (private, no storage policies, so only the service role can access them; D16):
- `child-files`: path `children/{child_id}/{document_id}.{ext}`
- `feedback-audio`: path `feedback/{feedback_id}.webm`

### Duties

**`cycle`**: id, `start_on date not null`, `end_on date not null` (check `end_on >= start_on`), `status cycle_status not null default 'planned'`, note.
- Exclusion constraint: `exclude using gist (daterange(start_on, end_on, '[]') with &&)`, so cycles never overlap.

**`team`**: id, `cycle_id → cycle`, `duty_id → lookup(duty)`, `label text` (e.g. "Team A"), sort int.

**`team_member`**: id, `team_id → team`, `child_id → child`, `role team_role not null default 'member'`, `from_on date` null, `to_on date` null (null means the cycle boundary; D9). Unique `(team_id, child_id)`. The app checks that from/to fall inside the cycle.

### Fees

**`fee`**: id, child_id, academic_year, description (not null), `amount_due_paise bigint not null check (>= 0)`, due_on, `created_by → app_user`, deleted_at.

**`payment`**: id, `fee_id → fee`, `amount_paise bigint not null check (> 0)`, `paid_on date not null`, `mode_id → lookup(payment_mode)`, reference, `receipt_document_id → document` null, `recorded_by → app_user`, deleted_at.

### Feedback and audit

**`feedback`**: id, `author_id → app_user`, audio_path, duration_s int, page_context text, transcript text, transcribed_at, `status feedback_status default 'new'`, triage_note text, audio_deleted_at.

**`audit_log`** <a id="audit"></a>: `id bigserial pk`, `at timestamptz default now()`, `actor_id uuid` (from `current_setting('app.user_id', true)`), table_name, row_id text, op (`INSERT`/`UPDATE`/`DELETE`), `before jsonb`, `after jsonb`. Indexes `(table_name, row_id)`, `(at)`.

The trigger function `audit_row()` is attached `after insert or update or delete` on every domain table (all except `audit_log`).

## Row-level security

- `enable row level security` on **every** table, with **no policies** for `anon` or `authenticated`. The public Supabase API key can therefore read nothing.
- The app connects with the database connection string (owner role), which bypasses RLS. **Authorization is enforced in the server layer** ([03-auth-and-access](03-auth-and-access.md)).
- In Supabase settings, also remove `public` from the Data API's exposed schemas.

## Views and functions

Each is created in the milestone that needs it (see [tasks](../../tasks/README.md)) and covered by DB tests.

| Name | Returns | Milestone |
|---|---|---|
| `fn_on_duty(p_duty uuid, p_on date)` | child_id, team_id, role for members active on that date | M3 |
| `v_duty_counts` | child_id, duty_id, academic_year, cycles_served | M3 |
| `v_open_follow_ups` | open entries and admissions with follow_up_on, owner, child | M2 (admissions added in M5) |
| `v_needs_attention` | child_id, open_concerns, overdue_follow_ups, concern_subjects, days_since_last_entry, reasons[] | M2 |
| `v_child_timeline` | child_id, at, kind, title, ref_table, ref_id, visibility (union of entries, admission events, enrolments, assessments, duty stints) | M2 (sources added by later milestones) |
| `v_fee_balance` | fee_id, child_id, due, paid, balance | M7 |
| `v_grade_subject_summary` | academic_year, grade, term, subject, avg_pct, n | M4 |
| `v_achievements` | child_id, academic_year, area, level, result | M6 |
| `v_admissions_funnel` | status, count, follow_ups_due | M5 |
| `v_yearly_trends` | academic_year, metric, value | M8 |

## Seeds

Applied by a custom migration (idempotent: `on conflict (kind, key) do nothing`). Labels are editable later.

| Kind | Default keys → labels | `meta` |
|---|---|---|
| `admission_status` | application_received, selected_for_interview, invited, selected_as_student, not_interested, not_eligible, admission_not_taken, follow_up_later (the requirements' wording) | `{ terminal: bool }` |
| `admission_source` | word_of_mouth, existing_family, alumna, website_social, event, school_referral, other | |
| `entry_category` | observation, concern, corrective_action, academic, skill, achievement, responsibility, health, alumni_interaction | `{ restricted, opens_follow_up, details_schema }` (D6) |
| `tag` | improving, excellent, needs_help, homework_done, homework_pending, participation, leadership, kindness, discipline, punctuality, confidence, wellbeing | `{ categories?: string[] }` limits which categories show it |
| `subject` | english, hindi, sanskrit, mathematics, science, social_studies, computer, lalita_sahasranama, vishnu_sahasranama, bhagavad_gita | `{ group: academic \| language \| stotra }`; the admin adds the regional language |
| `term` | term_1, term_2, annual | |
| `grade` | grade_1 … grade_12 | `{ order }` |
| `group` | (empty; the admin adds houses or groups if used) | |
| `duty` | pooja, hall_cleaning | |
| `relation` | mother, father, guardian, grandparent, sibling, other | |
| `document_kind` | birth_certificate, aadhaar, transfer_certificate, report_card, medical, certificate, photo, other | `{ restricted }`: aadhaar and medical are restricted |
| `skill_area` | music, dance, art, sport, chanting, speaking, writing, crafts, other | |
| `achievement_level` | gurukula, school, inter_school, district, state, national, international | `{ order }` |
| `achievement_result` | participated, special_mention, third, second, first, winner | `{ order }` |
| `payment_mode` | cash, upi, bank_transfer, cheque | |
| `alumni_contact_mode` | call, visit, event, message | |

**Settings seed:** `academic_year_start_month = 6`, `cycle_rule = {"type":"half_month"}`, `needs_attention_days = 30`, `feedback_audio_retention_days = 90`.

**Bootstrap admin:** the seed creates an `app_user` with role `admin` for `BOOTSTRAP_ADMIN_EMAIL`, if that user doesn't already exist.

## Entry `details` schemas

Registry in `src/server/entries/categories.ts`, keyed by category `key`. An unknown key means empty details.

| Category key | `details` |
|---|---|
| concern | `{}` (subject goes in `subject_id`); creates `status = 'open'` |
| corrective_action | `{}`; requires `parent_id` pointing to a concern |
| academic | `{ termId? }` |
| skill | `{ areaId }` |
| achievement | `{ event: string, levelId, resultId, certificateDocumentId? }` |
| responsibility | `{ title: string, from: date, to?: date }` |
| alumni_interaction | `{ modeId }` |

## Migration rules

- Tables: edit `src/server/db/schema/*.ts`, then run `pnpm db:generate`. Views, functions, triggers, RLS and seeds: `pnpm db:generate --custom` and hand-write the SQL.
- Never edit a migration that has been merged. Fix forward.
- Migrations must be **backward compatible** with the previous deploy (expand, then contract), because they run during the Vercel build while the old version is still serving ([05-ops](05-ops.md#deploys)).
- If two branches generate migrations at once, see the conflict rule in [AGENTS.md](../../AGENTS.md#migration-conflicts).
