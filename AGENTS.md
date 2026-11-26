# AGENTS.md — Operating Manual

You are part of a team of agents building **Bāla Pālana**, a child-journey tracking system for a non-profit gurukula. Read this file fully before starting any task. It overrides your defaults.

## Read first (in order)

1. [docs/idea.md](docs/idea.md): what and why
2. [docs/design-doc.md](docs/design-doc.md): architecture and **decisions D1–D30**
3. [docs/architecture/](docs/architecture/): conventions, schema, auth, UI, ops, testing
4. [tasks/README.md](tasks/README.md): the board, then your task's spec

Don't re-explore what the docs already answer. If a doc answers the question, trust it; if it's wrong, fix it in your PR.

---

## 1. Non-negotiables

1. **₹0.** No paid service, API, plan or dependency that needs one (D1). If something seems to need money, stop and flag it.
2. **No real child data** in code, tests, fixtures, logs, screenshots, issues or PRs. Use `scripts/seed-demo.ts`.
3. **Privacy is enforced server-side.** Every read and write checks the permission matrix; restricted rows are filtered in the query ([03](docs/architecture/03-auth-and-access.md)).
4. **All writes go through `mutate()`**, so the audit trigger records the actor (D26).
5. **Personal project only.** Nothing here may reference, use or depend on any employer or company: no company email addresses, accounts, GitHub orgs, registries, CI runners, templates, internal tool names or wording. Use only the accounts listed in [tasks/H.md](tasks/H.md). This applies to code, docs, commits, package names and URLs.
6. **The code repo is public.** Nothing private goes in it: no real data, secrets, gurukula documents, or CI output that contains data. Anything that touches real data runs only in the private ops repo `bharathnr1/bala-palana-ops` (D29). Secrets live only in Vercel and the ops repo's settings; only `.env.example` is committed.
7. **Never delete or rewrite** merged migrations, `main` history, other agents' branches, or production data.

## 2. Ground rules: working efficiently

| Rule | What it means in practice |
|---|---|
| **Spec first, then code** | Read the task, its linked specs and the DoD before writing anything. Most questions are already answered. |
| **Smallest change that meets acceptance** | No gold-plating, speculative abstraction or "while I'm here" refactors. Log extras under *Follow-ups* in the PR. |
| **Vertical slices** | One PR delivers schema/query → server action → UI → tests for its task. A feature that half-works with no tests isn't progress. |
| **Small PRs** | Aim for ≤ 400 changed lines (excluding generated files and lockfiles). If bigger, split the task with the Integrator. |
| **Stop the line** | If `main` is red, fixing it beats every other task. Whoever broke it fixes it, or reverts. |
| **Prove it by running it** | Never call something done without running `pnpm check`, `pnpm test:db` and the relevant E2E. Report failures as they are; don't hide or skip tests. |
| **Two strikes, then escalate** | If the same failure survives two genuine fix attempts, stop. Write down what you tried and what you saw, set the task `blocked`, and move to another unblocked task. |
| **Reuse before you build** | Check `src/components`, `src/lib` and `src/server/*` before creating something new. If you create something reusable, put it in the shared location and mention it in the PR. |
| **Default, then configure** | When the gurukula's practice is unknown, pick a sensible default and make it a lookup or setting (D7). Note the choice in the PR. |
| **Write it down** | Communicate only through PRs, review comments and issues, in short factual sentences. No side channels. Decisions that change the design go into design-doc §10. |
| **Escalate only what agents can't decide** | Money, privacy, policy and account access go to the human (collect them in [open-questions](docs/open-questions.md)). Everything technical, decide. |
| **Demo-ready every time** | Each merged task works on the preview deploy with demo data, so the human can try it at any moment. |

## 3. Team roles

| Role | Responsibilities |
|---|---|
| **Integrator** (exactly one) | Owns `tasks/README.md` (the only agent who edits the board); assigns tasks so parallel work doesn't touch the same files; runs the risk-surface review; merges; keeps `main` green; writes the milestone summary for the human |
| **Platform** | M0 foundations, CI, nightly job, deploys, storage, cycles, exports |
| **Feature agents** (2–3) | Module tasks in parallel lanes |
| **QA** | End-to-end specs, permission tests, the accessibility and performance pass, and the fresh-eyes review on risky PRs |

One agent may hold several roles in a small team; the Integrator is always exactly one agent.

## 4. Task workflow

1. **Pick**: a `todo` task whose dependencies are all `done`; lowest milestone first. The Integrator marks it `in-progress (<you>)`.
2. **Branch** from the latest `main` (see §5).
3. **Build** to the spec, the acceptance criteria and the [Definition of Done](docs/architecture/06-testing.md#definition-of-done-every-task).
4. **Open a PR** using [.github/pull_request_template.md](.github/pull_request_template.md). Draft PRs are fine for early feedback.
5. **Review** (risk-based; no reviewer panel):
   - The author runs `/code-review` on the diff at medium effort, then fixes or justifies every finding in the PR.
   - The Integrator reads the risk surface: auth guards, restricted filtering in queries, `mutate()` writes, migrations, storage, fees and dates. Time-box 10 minutes; post one comment naming what was checked.
   - On a PR touching schema, auth, storage or fees, spawn **one** fresh-context reviewer in the background with a brief of ≤ 3 files and 3 yes/no questions. Cap it at 10 minutes; if it returns no verdict, proceed on the other gates and note it in the PR.
   - Never spawn a panel and never block a merge on a reviewer that has not answered.
6. **Merge**: the Integrator squash-merges when CI is green, the DoD checklist is ticked, the mechanical rules in §6 are clean and step 5 is done; then deletes the branch and marks the task `done`.
7. **Blocked**: say why in the PR or issue; the Integrator sets `blocked (<reason>)`. Human-only blockers reference an `H` task.

## 5. Git rules

### Identity
Set this **in every clone, before the first commit** (repo-local, not global):

```sh
git config user.name  "Bharath Nallapeta"
git config user.email "bharath.nr1@gmail.com"
```

Check with `git config user.email` before committing. Commits with any other identity are rejected in review.

### GitHub account
- The repo is **`bharathnr1/bala-palana`**. All pushes, PRs, issues, comments and `gh` calls use the **`bharathnr1`** account and nothing else.
- The `bharathnr1` token is provided automatically: Claude Code sessions in this folder get `GH_TOKEN` from the git-ignored `.claude/settings.local.json`. Any other shell loads it from the git-ignored `.env` with `set -a; . ./.env; set +a`. Without it, `gh` falls back to a different account on this machine.
- Git identity and the remote are enforced for this folder by a conditional include in the owner's git config, plus local `pre-commit` / `pre-push` hooks. The hooks reject the wrong identity or remote, company names, and anything that looks like a token or database password. Never bypass them (`--no-verify` is forbidden).
- Before any `gh` command, check `gh api user --jq .login` prints `bharathnr1`. If it doesn't, **stop**. Don't switch accounts or log in yourself; ask the human.
- The remote must be `git@github-personal:bharathnr1/bala-palana.git` (an SSH alias with the personal key) or HTTPS authenticated as `bharathnr1`. Never change the remote or the credentials.

### Branches
- `main` is protected by GitHub: PRs only, CI required, linear history, no force-push. Required approvals is set to 0 because all agents share one account; **the Integrator enforces the review gates in §4** and is the only agent that merges.
- All agents push under the owner's single GitHub account, so GitHub's *Approve* button can't be used. Review comments state what was checked and what must change. `APPROVED` / `CHANGES REQUESTED` are optional labels, not a merge gate.
- Branch name: `task/<ID>-<short-slug>`, e.g. `task/M2-02-quick-observation`. Hotfixes use `fix/<short-slug>`.
- Keep up to date by **rebasing** on `main`, not merging. Force-push only your own branch, and only with `--force-with-lease`.
- Never push directly to `main`, never force-push `main`, and never rewrite merged history.

### Commits
- **One line**, imperative, ≤ 72 characters, prefixed with the task ID: `M3-03 add copy-last-cycle action`.
- No body. No `Co-Authored-By`, "Generated with" or any other AI attribution, in commits or PRs.
- Commit in small, working steps; they're squashed at merge anyway.

### PRs
- Title: `<ID> <task title>`. One task per PR.
- Body: use [.github/pull_request_template.md](.github/pull_request_template.md) — a short summary of what changed; the task's acceptance checklist (ticked); tests run; review evidence; screenshots at 360 px for UI work (demo data only); *Follow-ups* if any. Issue references go here, not in commits.

### Never commit
Secrets or `.env` files (other than `.env.example`), real data, database dumps, `node_modules`, build output, or binaries over 1 MB (test fixtures excepted, with a reason in the PR). Do commit the lockfile and all generated migrations.

### Migration conflicts <a id="migration-conflicts"></a>
If your branch and `main` both added migrations:
1. Rebase on `main`.
2. Delete **only your branch's unmerged** migration files and their journal entries.
3. Regenerate (`pnpm db:generate`, or re-create your custom SQL migration) so yours comes after `main`'s.
4. Re-run `pnpm test:db`.

D24 keeps this rare: the full schema lands in M0, and later tasks add only views and functions.

## 6. Coding rules

Layout, patterns and data conventions are in [01-conventions](docs/architecture/01-conventions.md). On top of those:

**Mechanical rules** (check these before every PR; they are what review used to spend its time on): no `any`, no non-null `!`, no `@ts-ignore`/`@ts-expect-error` without a reason and task ID, no `console.log` in `src/`, no SQL built by concatenation, `import 'server-only'` in every `src/server/**` file, no hard-coded colours, no strings outside `strings.ts`.

### TypeScript
- `strict` everywhere. No `any`: use `unknown` + Zod. No `@ts-ignore` / `@ts-expect-error` without a comment that names the reason and a task ID. No `!` non-null assertions outside tests.
- Validate at every boundary with Zod (action inputs, env, CSV rows, `entry.details`, URL params). Inside the boundary, trust the types.
- Prefer plain functions and data over classes. Use named exports, not default exports (Next.js route files excepted).

### Server and data
- `import 'server-only'` in every `src/server/**` file. Client code never imports the DB, the service-role key or `src/server/**`.
- Every query and action calls `assertCan`. Restricted filtering lives in the query.
- Writes only through `action()` + `mutate()`. Return `ActionResult`; never throw to the client.
- Use the Drizzle query builder. Raw SQL only through the `sql` tagged template (parameterised); **never build SQL by string concatenation**.
- No N+1 queries: fetch lists with joins or `inArray`. Paginate any list that can exceed 50 rows.
- Dates via `src/lib/dates.ts` (Asia/Kolkata), money via `src/lib/money.ts` (paise). No ad-hoc `Date` arithmetic in components.

### Privacy in code
- **No personal data in logs, errors, analytics or URLs' query strings.** Log ids, never names, phone numbers or notes.
- Files are served only through short-lived signed URLs. Never make a bucket or object public.
- No third-party scripts, trackers or telemetry SDKs.

### UI
- Server Components by default; `'use client'` only where interaction needs it. No global state library; filters live in URL search params.
- shadcn/ui + Tailwind using theme tokens. No hard-coded colours or inline styles.
- All user-facing text comes from `src/lib/strings.ts`.
- Mobile-first at 360 px; tap targets ≥ 44 px; labelled inputs; visible focus; WCAG AA contrast.
- Every data view has loading, empty and error states.
- Budget: a page is usable within 2 s on a mid-range Android over 4G. Keep client bundles lean; lazy-load charts and heavy widgets.

### Style
- Files `kebab-case.ts`, components `PascalCase`, functions are `camelCase` verbs, booleans `is*`/`has*`.
- Comments explain *why*, not *what*. No commented-out code. A `TODO` must name a task ID.
- Prettier and ESLint are law; disable a rule only on one line, with a reason.

### Dependencies
- Add one only if it removes real work. It must be maintained, permissively licensed (MIT/Apache/BSD), free, and without telemetry. Name it and justify it in the PR.

### Tests
- Follow [06-testing](docs/architecture/06-testing.md). Unit tests sit next to the code (`*.test.ts`); E2E tests go in `tests/e2e/`.
- Tests are deterministic: fixed seeds, fixed clocks, no `sleep`; wait on conditions instead.
- A bug fix comes with a test that failed before the fix.

## 7. Milestone wrap-up (Integrator)

When every task in a milestone is `done`:
1. Smoke-test the production deploy with demo data.
2. Update [docs/roadmap.md](docs/roadmap.md) if scope moved.
3. Tag `main` with the next release tag from [docs/releases.md](docs/releases.md) (e.g. `bala-palana-0.1`) and create a GitHub Release from it.
4. Write a short summary for the human: what shipped, what to try, anything that needs their action.
