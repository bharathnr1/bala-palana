-- Fix forward for `audit_row()`: tables whose primary key is not `id`, `key`
-- or `child_id` (currently only `entry_tag`, keyed by entry and tag) produced
-- a NULL `row_id`, which `audit_log.row_id` rejects. The function is replaced
-- rather than edited in 0000, which is already merged.

create or replace function audit_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  row_key text;
begin
  actor := nullif(current_setting('app.user_id', true), '')::uuid;

  if tg_op = 'DELETE' then
    row_key := coalesce(
      to_jsonb(old)->>'id', to_jsonb(old)->>'key', to_jsonb(old)->>'child_id',
      to_jsonb(old)->>'entry_id', to_jsonb(old)->>'team_id', to_jsonb(old)->>'admission_id',
      to_jsonb(old)->>'fee_id', to_jsonb(old)->>'guardian_id', to_jsonb(old)->>'cycle_id'
    );
    insert into audit_log (actor_id, table_name, row_id, op, before)
    values (actor, tg_table_name, row_key, tg_op, to_jsonb(old));
    return old;
  elsif tg_op = 'UPDATE' then
    row_key := coalesce(
      to_jsonb(new)->>'id', to_jsonb(new)->>'key', to_jsonb(new)->>'child_id',
      to_jsonb(new)->>'entry_id', to_jsonb(new)->>'team_id', to_jsonb(new)->>'admission_id',
      to_jsonb(new)->>'fee_id', to_jsonb(new)->>'guardian_id', to_jsonb(new)->>'cycle_id'
    );
    insert into audit_log (actor_id, table_name, row_id, op, before, after)
    values (actor, tg_table_name, row_key, tg_op, to_jsonb(old), to_jsonb(new));
    return new;
  end if;

  row_key := coalesce(
    to_jsonb(new)->>'id', to_jsonb(new)->>'key', to_jsonb(new)->>'child_id',
    to_jsonb(new)->>'entry_id', to_jsonb(new)->>'team_id', to_jsonb(new)->>'admission_id',
    to_jsonb(new)->>'fee_id', to_jsonb(new)->>'guardian_id', to_jsonb(new)->>'cycle_id'
  );
  insert into audit_log (actor_id, table_name, row_id, op, after)
  values (actor, tg_table_name, row_key, tg_op, to_jsonb(new));
  return new;
end;
$$;
