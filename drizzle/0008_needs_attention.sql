-- v_needs_attention (02-schema § Views and functions, M2-06): the children who
-- need a coordinator today, with the reasons they are there.
--
-- Only staff-visible entries feed it. The view is read by every role that holds
-- `report.attention`, teachers included, and an aggregate cannot be filtered
-- per reader afterwards — so a restricted follow-up must not create a flag a
-- teacher would see (D13).
--
-- The threshold comes from `needs_attention_days` (D7); "today" is the IST
-- calendar day, matching the rest of the app (D15).

create or replace view v_needs_attention as
with cfg as (
  select coalesce(((select value from setting where key = 'needs_attention_days') #>> '{}')::int, 30) as days
),
today as (
  select (now() at time zone 'Asia/Kolkata')::date as d
),
staff_entries as (
  select
    e.child_id,
    e.status,
    e.follow_up_on,
    e.subject_id,
    e.occurred_at,
    e.category_id,
    e.author_id
  from entry e
  where e.deleted_at is null
    and e.visibility = 'staff'
),
counted as (
  select
    c.id as child_id,
    count(*) filter (where cat.key = 'concern' and s.status = 'open')::int as open_concerns,
    count(*) filter (
      where s.status = 'open'
        and s.follow_up_on is not null
        and s.follow_up_on < (select d from today)
    )::int as overdue_follow_ups,
    count(distinct s.subject_id) filter (
      where cat.key = 'concern' and s.status = 'open'
    )::int as concern_subjects,
    max(s.occurred_at) as last_entry_at,
    (
      select a.author_id
      from staff_entries a
      where a.child_id = c.id
      order by a.occurred_at desc
      limit 1
    ) as last_author_id,
    coalesce(c.joined_on, c.created_at::date) as first_seen
  from child c
  left join staff_entries s on s.child_id = c.id
  left join lookup cat on cat.id = s.category_id
  where c.stage = 'student'
    and c.anonymised_at is null
  group by c.id
),
measured as (
  select
    counted.*,
    (
      (select d from today)
      - coalesce((counted.last_entry_at at time zone 'Asia/Kolkata')::date, counted.first_seen)
    )::int as days_since_last_entry
  from counted
),
flagged as (
  select
    measured.*,
    array_remove(
      array[
        case when measured.open_concerns > 0 then 'open_concerns' end,
        case when measured.overdue_follow_ups > 0 then 'overdue_follow_ups' end,
        case when measured.concern_subjects >= 2 then 'concern_subjects' end,
        case when measured.days_since_last_entry >= (select days from cfg) then 'stale' end
      ]::text[],
      null
    ) as reasons
  from measured
)
select
  child_id,
  open_concerns,
  overdue_follow_ups,
  concern_subjects,
  days_since_last_entry,
  last_author_id,
  reasons
from flagged
where array_length(reasons, 1) > 0;
