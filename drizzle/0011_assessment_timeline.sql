-- Assessments join v_child_timeline (M4-01): the view is re-created with the
-- third source. Columns, order and types are unchanged, so `create or replace`
-- works and 0007's contract still holds.
--
-- An assessment is recorded when it is written, so `created_at` is the moment
-- on the timeline; later edits update the row but do not move it. Visibility is
-- always `staff`: assessments are readable by every role (03-auth-and-access).

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
left join lookup t on t.id = a.term_id;
