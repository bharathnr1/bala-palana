# 01 — Conventions

How the code is laid out and written. Every agent follows this; changing it needs a decision row in [design-doc §10](../design-doc.md#10-decisions).

## Toolchain

| Tool | Choice |
|---|---|
| Runtime | Node.js current LTS; pinned in `.nvmrc` and `package.json#engines` |
| Package manager | pnpm (pinned via `packageManager`) |
| Framework | Next.js, latest stable major at scaffold time, App Router, TypeScript `strict` |
| Styling | Tailwind CSS + shadcn/ui (components copied into `src/components/ui`) |
| DB | Drizzle ORM + drizzle-kit; `postgres` (postgres.js) driver |
| Validation | Zod, shared by forms, server actions and environment variables |
| Forms | React Hook Form + `@hookform/resolvers/zod` |
| Dates | `date-fns` + `@date-fns/tz` |
| Charts | Recharts |
| Tests | Vitest (unit and DB), Playwright (end-to-end) |
| Lint/format | ESLint (Next config) + Prettier; `pnpm check` runs lint, typecheck and unit tests |

Exact versions are pinned when M0-01 scaffolds the project. **No paid services, and no dependency that requires one** (D1). Add a dependency only when it removes real work, and name it in the PR description.

## Repository layout

```
.
├─ AGENTS.md, CLAUDE.md         agent operating manual
├─ docs/                        planning + architecture (this folder)
├─ tasks/                       task board and per-milestone task specs
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/          sign-in
│  │  ├─ auth/callback/         OAuth / code exchange route
│  │  ├─ (app)/                 signed-in shell (nav, header)
│  │  │  ├─ page.tsx            Home
│  │  │  ├─ children/           list, new, [id]/(tabs)
│  │  │  ├─ observe/            quick observation
│  │  │  ├─ follow-ups/
│  │  │  ├─ attention/          needs attention
│  │  │  ├─ duties/             board, lookup
│  │  │  ├─ academics/          bulk entry
│  │  │  ├─ admissions/
│  │  │  ├─ fees/               pending dues
│  │  │  ├─ alumni/
│  │  │  ├─ reports/
│  │  │  ├─ feedback/
│  │  │  └─ settings/           users, lists, preferences, audit, storage
│  │  └─ manifest.ts            PWA manifest
│  ├─ components/ui/            shadcn primitives (generated, don't hand-edit)
│  ├─ components/               shared app components (ChildPicker, ChipGroup, …)
│  ├─ features/<module>/        client components and forms for one module
│  ├─ server/
│  │  ├─ db/                    client.ts, schema/<module>.ts, mutate.ts
│  │  ├─ auth/                  session.ts, permissions.ts
│  │  ├─ storage.ts             signed URLs
│  │  └─ <module>/              queries.ts, actions.ts, *.test.ts
│  ├─ lib/                      pure helpers: dates, academic-year, cycles, money, strings, env
│  └─ middleware.ts
├─ drizzle/                     generated + custom SQL migrations (committed)
├─ scripts/                     seed-demo.ts, import helpers
├─ jobs/                        nightly job scripts (backup.sh, transcribe.py, storage-check.ts)
├─ tests/e2e/                   Playwright specs
└─ .github/workflows/           ci.yml (the nightly workflow lives in the private ops repo, D29)
```

**Modules:** `children`, `family`, `entries`, `duties`, `academics`, `admissions`, `health`, `documents`, `fees`, `alumni`, `reports`, `feedback`, `settings`, `users`. Each owns its `server/<module>/`, `features/<module>/` and `src/server/db/schema/<module>.ts`.

## Server patterns

**Reads**: `src/server/<module>/queries.ts`. They're called from Server Components.

```ts
export async function getChild(user: SessionUser, id: string) {
  assertCan(user, 'child.read');
  // filter restricted rows unless can(user, 'restricted.read')
}
```

**Writes**: `src/server/<module>/actions.ts` (`'use server'`). Every action has the same shape:

```ts
export const createEntry = action(CreateEntryInput, async (input, user) => {
  assertCan(user, 'entry.create');
  return mutate(user, async (tx) => { /* … */ });
});
```

- `action(schema, fn)` resolves the session user, parses input with Zod, runs `fn`, and returns `ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code; message; fieldErrors? } }`. It never throws to the client.
- `mutate(user, fn)` opens a transaction and runs `select set_config('app.user_id', <user.id>, true)` so the audit trigger records the actor ([02-schema](02-schema.md#audit)). **All writes go through `mutate`.**
- After a write, call `revalidatePath` for the affected routes.
- Domain errors: `throw new AppError('NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT' | 'INVALID', message)`.
- Every file under `src/server/` starts with `import 'server-only'`.

**Database client.** `src/server/db/client.ts` uses `DATABASE_URL` (transaction pooler) with `prepare: false`. The Supabase JS client is used **only** for Auth and Storage, never for table data.

## Data conventions

| Concern | Rule |
|---|---|
| Naming | DB `snake_case`; TS `camelCase` (Drizzle `casing: 'snake_case'`) |
| IDs | `uuid` with `gen_random_uuid()`; `audit_log` uses `bigserial` |
| Dates | `date` columns ↔ `'YYYY-MM-DD'` strings; instants are `timestamptz` |
| Timezone | Display and "today" always in `Asia/Kolkata` (`src/lib/dates.ts`) |
| Academic year | Label `'2026-27'`, computed by `academicYearOf(date, startMonth)` in `src/lib/academic-year.ts` (D15) |
| Money | Integer paise (`bigint`); format with `src/lib/money.ts`; never floats |
| Soft delete | `deleted_at timestamptz`; every query filters `deleted_at is null` |
| Configurable lists | `lookup` rows referenced by id; code refers to stable `key`s, never labels (D7) |

## UI conventions

- Server Components by default; `'use client'` only for interactive pieces.
- **Mobile-first**: design at 360 px wide, tap targets ≥ 44 px, primary action within thumb reach.
- **Minimal typing**: chips, pickers and defaults first; free text last and optional.
- All UI copy lives in `src/lib/strings.ts` (D2). No hard-coded user-facing strings in components.
- Every list page has loading (skeleton), empty and error states.
- Dates are shown as `24 Nov 2026`; relative dates ("in 3 days", "2 days overdue") for follow-ups.
- Accessibility: labelled inputs, visible focus, WCAG AA contrast, no meaning carried by colour alone.

See [04-ui-spec.md](04-ui-spec.md) for screens.

## Git, PRs and coding rules

See [AGENTS.md §5–6](../../AGENTS.md#5-git-rules).
