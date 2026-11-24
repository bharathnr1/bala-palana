-- Triggers and row-level security (02-schema § Audit, § Row-level security).

-- Keep `updated_at` current on every mutable table.
create trigger app_user_set_updated_at
  before update on app_user
  for each row execute function set_updated_at();
create trigger lookup_set_updated_at
  before update on lookup
  for each row execute function set_updated_at();
create trigger setting_set_updated_at
  before update on setting
  for each row execute function set_updated_at();

-- Audit every write (D26). `audit_log` itself is never audited.
create trigger app_user_audit
  after insert or update or delete on app_user
  for each row execute function audit_row();
create trigger lookup_audit
  after insert or update or delete on lookup
  for each row execute function audit_row();
create trigger setting_audit
  after insert or update or delete on setting
  for each row execute function audit_row();

-- Logged in with the public API key, nobody can read anything (D25). The app
-- connects as the table owner and enforces access in the server layer
-- (03-auth-and-access).
alter table app_user enable row level security;
alter table audit_log enable row level security;
alter table lookup enable row level security;
alter table setting enable row level security;
