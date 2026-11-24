-- Extensions and trigger functions (02-schema § Extensions, § Audit).
-- Tables arrive in the next migration; these must exist first.

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists citext;     -- case-insensitive emails
create extension if not exists pg_trgm;    -- name search
create extension if not exists btree_gist; -- no-overlap constraint on cycles

-- Keeps `updated_at` current on every mutable table (02-schema § Tables).
-- `clock_timestamp()` rather than `now()`: `now()` is the transaction start
-- time, so two updates in one transaction would leave `updated_at` unchanged.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

-- Records every write, with the acting user (D26). `mutate()` sets
-- `app.user_id` for the transaction; outside it the actor is null.
-- `row_id` prefers `id`, then the primary keys of tables that have no `id`.
-- The fields are read through `to_jsonb` because a table without that column
-- would otherwise raise "record has no field" when the trigger runs.
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
    row_key := coalesce(to_jsonb(old)->>'id', to_jsonb(old)->>'key', to_jsonb(old)->>'child_id');
    insert into audit_log (actor_id, table_name, row_id, op, before)
    values (actor, tg_table_name, row_key, tg_op, to_jsonb(old));
    return old;
  elsif tg_op = 'UPDATE' then
    row_key := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'key', to_jsonb(new)->>'child_id');
    insert into audit_log (actor_id, table_name, row_id, op, before, after)
    values (actor, tg_table_name, row_key, tg_op, to_jsonb(old), to_jsonb(new));
    return new;
  end if;

  row_key := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'key', to_jsonb(new)->>'child_id');
  insert into audit_log (actor_id, table_name, row_id, op, after)
  values (actor, tg_table_name, row_key, tg_op, to_jsonb(new));
  return new;
end;
$$;
