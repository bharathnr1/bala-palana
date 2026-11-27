# Bāla Pālana

_Bāla_ (child) + _Pālana_ (care, upbringing).

A child-journey tracking system for a gurukula. It keeps one lifelong record per child, from admission enquiry through her Gurukula years to alumni life. That record covers academics, health, skills, achievements, responsibilities and duty rotation, observations and follow-ups, and fees. Teachers use it from their phones; coordinators and trustees use it for reports.

**Status:** v0.4 (M3) released — sign-in and permissions, the full schema, children, settings, CSV import, voice-note feedback, the quick observation screen, the journey timeline, entry sheets with follow-ups, home follow-ups, needs attention, duty cycles and the duty board. Live at <https://bala-palana.vercel.app>. See the [task board](tasks/README.md) for what is next.

## Docs

| Doc                                              | What's in it                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                           | Operating manual for the agent team: rules, roles, workflow                                                                                                                                                                                                                                   |
| [docs/idea.md](docs/idea.md)                     | Problem, vision, users, scope                                                                                                                                                                                                                                                                 |
| [docs/design-doc.md](docs/design-doc.md)         | Architecture, domain model, privacy, reports, **decisions D1–D30**, free-tier budget                                                                                                                                                                                                          |
| [docs/architecture/](docs/architecture/)         | Detailed specs: [conventions](docs/architecture/01-conventions.md), [schema](docs/architecture/02-schema.md), [auth & access](docs/architecture/03-auth-and-access.md), [UI](docs/architecture/04-ui-spec.md), [ops](docs/architecture/05-ops.md), [testing](docs/architecture/06-testing.md) |
| [docs/roadmap.md](docs/roadmap.md)               | Milestones M0–M9 and the real-data gate                                                                                                                                                                                                                                                       |
| [docs/releases.md](docs/releases.md)             | Released versions, the tag convention and the release procedure                                                                                                                                                                                                                               |
| [tasks/](tasks/README.md)                        | Task board and per-milestone task specs                                                                                                                                                                                                                                                       |
| [docs/open-questions.md](docs/open-questions.md) | What's still open for the gurukula                                                                                                                                                                                                                                                            |
| `docs/inputs/`                                   | Kick-off call transcript and the gurukula's requirements. **Kept locally, not in git** (D29); agents get them from the owner if needed                                                                                                                                                        |

## Stack

Next.js + TypeScript as an installable web app (PWA) on Vercel · Postgres, Auth and Storage on Supabase · Drizzle ORM · Tailwind + shadcn/ui · GitHub Actions for CI, backups and transcription.

The whole stack runs on free tiers and costs ₹0. See [design-doc §11](docs/design-doc.md#11-free-tier-budget).

## Development

Requirements: Node 26 (see `.nvmrc`), pnpm 10 (`corepack enable`), Docker (for the local Supabase stack).

```sh
pnpm install
cp .env.example .env          # fill in the values below
pnpm dev                      # http://localhost:3000
```

| Command                                | What it does                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm dev`                             | Local dev server                                                               |
| `pnpm build`                           | Production build                                                               |
| `pnpm check`                           | Lint, typecheck and unit tests — run before every push                         |
| `pnpm test` / `pnpm test:db`           | Unit tests / database tests (needs `DATABASE_URL`)                             |
| `pnpm e2e`                             | Playwright end-to-end tests                                                    |
| `pnpm db:generate` / `pnpm db:migrate` | Create a migration from the Drizzle schema / apply migrations                  |
| `pnpm seed:demo`                       | Load deterministic demo data (never real child data)                           |
| `pnpm seed:bootstrap`                  | Create the first admin from `BOOTSTRAP_ADMIN_EMAIL` (no-op if set/unset twice) |
| `pnpm format`                          | Prettier                                                                       |

Configuration is read from `.env`, validated at startup by `src/lib/env.ts`; the full list of variables is in [docs/architecture/05-ops.md](docs/architecture/05-ops.md#environment-variables). Never commit `.env` or any secret.

Code layout and conventions: [docs/architecture/01-conventions.md](docs/architecture/01-conventions.md).
