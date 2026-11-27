-- v_grade_subject_summary (02-schema § Views, M4-04): per academic year,
-- grade, term and subject, the average percentage of the recorded marks and
-- how many assessments it is based on.
--
-- Only rows with a usable maximum join the average; a remark or a grade letter
-- alone still shows on the child's tab but cannot be averaged (D10).

create or replace view v_grade_subject_summary as
select
  a.academic_year,
  coalesce(g.label, '') as grade,
  coalesce(t.label, '') as term,
  coalesce(s.label, '') as subject,
  round(avg(a.marks / a.max_marks * 100)::numeric, 1) as avg_pct,
  count(*)::int as n
from assessment a
left join lookup g on g.id = a.grade_id
left join lookup t on t.id = a.term_id
left join lookup s on s.id = a.subject_id
where a.marks is not null and a.max_marks is not null and a.max_marks > 0
group by a.academic_year, g.label, t.label, s.label;
