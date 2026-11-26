-- v_open_follow_ups (02-schema § Views and functions, M2-05): every entry that
-- is still open and carries a follow-up date, with the child and the owner.
-- Admission follow-ups join this union in M5.
--
-- The view keeps restricted rows; the query filters them for a reader without
-- `restricted.read`, as with every other entry query (D13).

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
  e.visibility
from entry e
join lookup c on c.id = e.category_id
join child ch on ch.id = e.child_id
join app_user a on a.id = e.author_id
where e.deleted_at is null
  and e.status = 'open'
  and e.follow_up_on is not null
  and ch.anonymised_at is null;
