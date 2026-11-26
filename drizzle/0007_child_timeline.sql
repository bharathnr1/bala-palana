-- v_child_timeline (02-schema § Views and functions, M2-03): one row per thing
-- that happened to a child, from whichever table records it. Later milestones
-- append their own UNION branch (assessments in M4, duty stints in M3).
--
-- The view returns restricted rows as they are; the query that reads it keeps
-- the visibility filter (D13), exactly as the entry queries do. That way a
-- coordinator still sees a health note on the timeline and a teacher never
-- receives it.

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
left join lookup g on g.id = en.grade_id;
