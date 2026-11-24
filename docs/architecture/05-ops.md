# 05 — Environments and Operations

## Environments

| Env | App | Database / Auth / Storage | Data |
|---|---|---|---|
| Local | `pnpm dev` | Supabase CLI local stack (`supabase start`, needs Docker) | `scripts/seed-demo.ts` fake data |
| Preview | Vercel preview deploy per PR | Supabase project **`bala-palana-dev`** | Fake data only |
| Production | Vercel production (`main`) | Supabase project **`bala-palana-prod`** (Mumbai) | Real data, **only after consent forms are in** |

**No real child data anywhere until the open questions on consent are resolved** ([open-questions](../open-questions.md)).

## Environment variables

Validated at startup by `src/lib/env.ts` (Zod).

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel, local | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel, local | Public (publishable) key, used for Auth only |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel, Actions | Server-only secret key, used for Storage signed URLs |
| `DATABASE_URL` | Vercel, local | Transaction pooler (port 6543), runtime queries |
| `DIRECT_URL` | Vercel, Actions | Session pooler (port 5432), migrations and `pg_dump` (Supabase's direct host is IPv6-only, and GitHub runners lack IPv6) |
| `APP_URL` | Vercel | Absolute URL for auth redirects |
| `BOOTSTRAP_ADMIN_EMAIL` | Vercel | First admin |
| `AUTH_MODE` | local / CI only | `test` enables test sign-in; forbidden in production |
| `BACKUP_AGE_PUBLIC_KEY` | Actions | Encrypts backups ([age](https://age-encryption.org) public key) |

A `.env.example` lists them all. Secrets never go in the repo.

## Human setup (one-time)

These need a person with the accounts. They are tasks **H1–H8** in [tasks/H.md](../../tasks/H.md).

1. The **public** code repo `bharathnr1/bala-palana` with branch protection on `main`, and the **private** ops repo `bharathnr1/bala-palana-ops` (D29). Personal account only.
2. Two Supabase projects (`dev`, `prod`) in region **ap-south-1 (Mumbai)**, on the free plan.
3. A Google Cloud project → OAuth consent screen (external, testing → production) + OAuth client; add the client ID and secret to both Supabase projects' Google provider.
4. A school Gmail account with 2-step verification + app password → Supabase *Auth → SMTP* settings (both projects).
5. Supabase settings: Data API exposed schemas without `public`; Site URL and redirect URLs (prod domain + `https://*-<team>.vercel.app/**` for previews).
6. A Vercel project linked to the repo (Hobby plan); env vars per environment.
7. An `age` key pair: the public key goes into GitHub secrets; the **private key is kept offline** by the admin (password manager + printed copy).
8. **Ops-repo** Actions secrets: `PROD_DIRECT_URL`, `PROD_SUPABASE_URL`, `PROD_SUPABASE_SERVICE_ROLE_KEY`, `BACKUP_AGE_PUBLIC_KEY`. The public repo holds no production secrets; its CI uses a throwaway Postgres container only.

## CI (`.github/workflows/ci.yml`)

On every PR and on push to `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint` · `pnpm typecheck`
3. `pnpm test` (Vitest unit)
4. `pnpm test:db`: a Postgres service container (same major version as Supabase), apply all migrations, run DB tests
5. `pnpm build` (with `AUTH_MODE=test` and dummy env)
6. `pnpm e2e`: Playwright, Pixel 7 viewport, against `next start` and the service-container DB, with `AUTH_MODE=test`

Target: under 10 minutes. Cache the pnpm store and Playwright browsers.

## Deploys <a id="deploys"></a>

- Vercel Git integration: a PR gets a preview deploy (dev Supabase); merging to `main` deploys production.
- The build command `pnpm vercel-build` runs `pnpm db:migrate && next build` against that environment's `DIRECT_URL`. Migrations must therefore be backward compatible ([02-schema](02-schema.md#migration-rules)).
- Rollback: Vercel "Promote previous deployment" (instant). Database changes are fixed forward with a new migration.

## Nightly job (`bala-palana-ops/.github/workflows/nightly.yml`, D14, D29)

The workflow lives in the private ops repo. It checks out the public repo and runs the scripts in `jobs/`. Scripts print counts and ids only, never names, notes or transcripts.

Cron `30 20 * * *` (02:00 IST), plus manual `workflow_dispatch`. It runs these steps in sequence and fails loudly; GitHub emails the repo owner on failure.

| Step | What |
|---|---|
| Backup | `pg_dump --format=custom` via `DIRECT_URL` with a matching client version (Docker `postgres:<major>`) → `age -r $BACKUP_AGE_PUBLIC_KEY` → upload as an artifact `backup-YYYY-MM-DD` with `retention-days: 30` |
| Keep-alive | `select 1` + one Storage list call (prevents the free-tier pause) |
| Transcribe | `jobs/transcribe.py`: `feedback` rows with `transcript is null` → download audio (service role) → faster-whisper `small`, `int8`, CPU, language auto → update `transcript`, `transcribed_at` |
| Audio retention | Delete audio older than `feedback_audio_retention_days` after transcription; set `audio_deleted_at` |
| Cycles | Make sure cycles exist for the current month and the next two months, per `cycle_rule` (idempotent) |
| Storage check | Sum bucket sizes; if above 70% of 1 GB, open (or update) a GitHub issue "Storage above 70%" |

## Restore runbook

1. Download the `backup-YYYY-MM-DD` artifact from the nightly workflow run.
2. `age -d -i <private-key> backup.dump.age > backup.dump`
3. Restore into the **dev** project first: `pg_restore --clean --if-exists --no-owner -d "$DEV_DIRECT_URL" backup.dump`
4. Verify (child count, latest entry date), then repeat against prod only if needed.

Storage files aren't in `pg_dump`. Documents can be re-uploaded from the paper originals; photos are low-risk. Revisit if the gurukula needs file backups.

## Monitoring (free)

- Vercel runtime logs and its built-in analytics (Hobby).
- Nightly workflow status + the auto-created storage issue.
- Supabase dashboard: database size, auth users, storage usage.
