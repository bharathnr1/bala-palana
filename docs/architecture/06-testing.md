# 06 — Testing and Definition of Done

## Layers

| Layer | Tool | Covers | Runs |
|---|---|---|---|
| Unit | Vitest | Pure logic in `src/lib` (academic year, cycle generation, money, dates); Zod schemas; permission matrix | `pnpm test` |
| DB | Vitest + real Postgres | Queries, views, functions, constraints, audit trigger, restricted filtering | `pnpm test:db` |
| End-to-end | Playwright (Pixel 7 + desktop Chrome) | One happy path per milestone, plus role visibility | `pnpm e2e` |

Mocks: don't mock the database. DB tests run against Postgres with all migrations applied. Each test file uses a transaction that rolls back, or a fresh schema.

## Fixtures

- `scripts/seed-demo.ts`: deterministic fake data (fixed faker seed, `en_IN` locale). It creates one user per role, ~120 children across grades 1–12, guardians, 6 months of cycles and teams, entries across categories, some open and overdue follow-ups, assessments for two terms, admissions in every status, and a few alumnae. Used for local runs, previews, E2E and demos.
- **Never** use real child data in tests, fixtures, screenshots or PR descriptions.

## Required tests by area

| Area | Must test |
|---|---|
| Permissions | The matrix matches [03](03-auth-and-access.md#permission-matrix); a teacher never receives restricted rows |
| Entries | Group create gives N rows with one `group_key`; a concern opens a follow-up; corrective action requires a concern parent; edit-own vs edit-any; the 24-hour self-delete |
| Duties | `fn_on_duty` with mid-cycle swaps; cycle generation for Feb (28/29), 30- and 31-day months; no-overlap constraint; copy last cycle |
| Needs attention | Each reason triggers at its threshold and clears when resolved |
| Academics | Marks/grade/remark check constraint; `marks <= max_marks` |
| Admissions | A status change logs an event; convert without consent is rejected |
| Fees | Balance with several payments; soft-deleted payments are excluded |
| Audit | An insert, update or delete writes a row with the actor id |

## Definition of Done (every task)

- [ ] Acceptance criteria in the task are met and ticked in the PR
- [ ] Tests added per the table above; `pnpm check`, `pnpm test:db` and `pnpm e2e` pass in CI
- [ ] Permissions enforced server-side for any new read or write
- [ ] Loading, empty and error states for any new screen; works at 360 px
- [ ] All strings in `src/lib/strings.ts`
- [ ] Docs updated if behaviour or schema changed (`02-schema.md`, the design doc's decisions table)
- [ ] No new paid service; any new dependency justified in the PR
- [ ] Review per [AGENTS.md §4](../../AGENTS.md#4-task-workflow): `/code-review` findings fixed or justified, and the risk-surface read done
