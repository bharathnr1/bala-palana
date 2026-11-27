-- M5-01: two new views and two extended ones for admissions.
--
-- v_open_follow_ups gains an admission branch. An admission is "open" while its
-- stage is not terminal and it carries a follow-up date; the owner is
-- `assigned_to`, so Home's Mine list works the same as it does for entries.
-- `admission_id` is appended at the end, which `create or replace` allows.
--
-- v_child_timeline gains admission events (an interview, a stage change, a
-- note). They are staff content by role, not restricted content, so the
-- visibility column stays 'staff' and the reading query also excludes them for
-- a user without `admission.read` (D13).
--
-- v_admissions_funnel is new: one row per active stage, including stages with
-- no admissions, so the board can show zero counts.

create or replace view v_open_follow_ups as
select
  e.id as entry_id,
  e.child_id,
  ch.full_name as child_name,
  c.key as category_key,
  c.label as category_label,
  e.note,
  e.follow_up_on,
  e.status,
  e.author_id,
  a.name as author_name,
  e.parent_id,
  e.visibility,
  null::uuid as admission_id
from entry e
join lookup c on c.id = e.category_id
join child ch on ch.id = e.child_id
join app_user a on a.id = e.author_id
where e.deleted_at is null
  and e.status = 'open'
  and e.follow_up_on is not null
  and ch.anonymised_at is null
union all
select
  null::uuid as entry_id,
  ad.child_id,
  ch.full_name as child_name,
  'admission'::text as category_key,
  sl.label as category_label,
  ad.next_action as note,
  ad.follow_up_on,
  'open'::entry_status as status,
  ad.assigned_to as author_id,
  u.name as author_name,
  null::uuid as parent_id,
  'staff'::visibility as visibility,
  ad.id as admission_id
from admission ad
join child ch on ch.id = ad.child_id
join lookup sl on sl.id = ad.status_id
left join app_user u on u.id = ad.assigned_to
where ad.follow_up_on is not null
  and ch.anonymised_at is null
  and coalesce((sl.meta ->> 'terminal')::boolean, false) = false;

create or replace view v_child_timeline as
select
  e.child_id,
  e.occurred_at as at,
  'entry'::text as kind,
  coalesce(nullif(btrim(e.note), ''), c.label) as title,
  'entry'::text as ref_table,
  e.id as ref_id,
  e.visibility,
  c.key as category_key
from entry e
join lookup c on c.id = e.category_id
where e.deleted_at is null
union all
select
  en.child_id,
  en.created_at as at,
  'enrolment'::text as kind,
  coalesce(g.label, en.academic_year) as title,
  'enrolment'::text as ref_table,
  en.id as ref_id,
  'staff'::visibility as visibility,
  null::text as category_key
from enrolment en
left join lookup g on g.id = en.grade_id
union all
select
  a.child_id,
  a.created_at as at,
  'assessment'::text as kind,
  concat_ws(' · ', s.label, t.label) as title,
  'assessment'::text as ref_table,
  a.id as ref_id,
  'staff'::visibility as visibility,
  null::text as category_key
from assessment a
left join lookup s on s.id = a.subject_id
left join lookup t on t.id = a.term_id
union all
select
  ad.child_id,
  (ev.occurred_on::timestamp at time zone 'Asia/Kolkata') as at,
  'admission'::text as kind,
  coalesce(
    nullif(concat_ws(' · ', sl.label, nullif(btrim(ev.note), '')), ''),
    ev.kind::text
  ) as title,
  'admission_event'::text as ref_table,
  ev.id as ref_id,
  'staff'::visibility as visibility,
  null::text as category_key
from admission_event ev
join admission ad on ad.id = ev.admission_id
left join lookup sl on sl.id = ev.status_id;

create or replace view v_admissions_funnel as
select
  s.label as status,
  cast(count(a.id) filter (where ch.anonymised_at is null) as int) as count,
  cast(
    count(a.id) filter (
      where ch.anonymised_at is null
        and coalesce((s.meta ->> 'terminal')::boolean, false) = false
        and a.follow_up_on <= (now() at time zone 'Asia/Kolkata')::date
    ) as int
  ) as follow_ups_due,
  s.sort as sort
from lookup s
left join admission a on a.status_id = s.id
left join child ch on ch.id = a.child_id
where s.kind = 'admission_status'
  and s.active
group by s.id, s.label, s.sort
order by s.sort;
