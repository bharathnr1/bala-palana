-- Duty queries (02-schema § Views and functions, M3-02).

-- Who was on duty for `p_duty` on the calendar day `p_on`. Membership is
-- bounded by the optional from/to dates (D9), so a mid-cycle swap returns the
-- outgoing child up to the day before the incoming one starts. A skipped
-- cycle has no duty roster at all; a paused one keeps its roster for the
-- record, since the team was still assigned.
create or replace function fn_on_duty(p_duty uuid, p_on date)
returns table (child_id uuid, team_id uuid, role team_role)
language sql
stable
as $$
  select tm.child_id, t.id as team_id, tm.role
  from team_member tm
  join team t on t.id = tm.team_id
  join cycle c on c.id = t.cycle_id
  where t.duty_id = p_duty
    and c.start_on <= p_on
    and c.end_on >= p_on
    and c.status <> 'skipped'
    and (tm.from_on is null or tm.from_on <= p_on)
    and (tm.to_on is null or tm.to_on >= p_on)
  order by tm.role, tm.created_at;
$$;

-- Cycles served per child, duty and academic year (M3-05). The academic year
-- starts on the `academic_year_start_month` setting (D15), labelled the way
-- `src/lib/academic-year.ts` labels it.
create or replace view v_duty_counts as
with cfg as (
  select coalesce(((select value from setting where key = 'academic_year_start_month') #>> '{}')::int, 6)
    as start_month
),
served as (
  select
    tm.child_id,
    t.duty_id,
    extract(year from c.start_on)::int as start_year,
    extract(month from c.start_on)::int as start_month,
    c.id as cycle_id
  from team_member tm
  join team t on t.id = tm.team_id
  join cycle c on c.id = t.cycle_id
  where t.duty_id is not null
    and c.status <> 'skipped'
),
labelled as (
  select
    served.child_id,
    served.duty_id,
    served.cycle_id,
    case
      when served.start_month >= (select start_month from cfg)
        then served.start_year
      else served.start_year - 1
    end as academic_start
  from served
)
select
  child_id,
  duty_id,
  academic_start::text || '-' || lpad(((academic_start + 1) % 100)::text, 2, '0') as academic_year,
  count(distinct cycle_id)::int as cycles_served
from labelled
group by child_id, duty_id, academic_start;

-- The profile's Journey tab learns about duty stints (M3-02): one row per
-- membership, dated at the cycle's first day.
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
  tm.child_id,
  (c.start_on::timestamp at time zone 'Asia/Kolkata') as at,
  'duty'::text as kind,
  coalesce(d.label, 'Duty') as title,
  'team_member'::text as ref_table,
  tm.id as ref_id,
  'staff'::visibility as visibility,
  null::text as category_key
from team_member tm
join team t on t.id = tm.team_id
join cycle c on c.id = t.cycle_id
left join lookup d on d.id = t.duty_id
where c.status <> 'skipped';
