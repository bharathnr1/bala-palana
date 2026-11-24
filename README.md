# Bāla Pālana

*Bāla* (child) + *Pālana* (care, upbringing).

A child-journey tracking system for a gurukula. It keeps one lifelong record per child, from admission enquiry through her Gurukula years to alumni life. That record covers academics, health, skills, achievements, responsibilities and duty rotation, observations and follow-ups, and fees. Teachers use it from their phones; coordinators and trustees use it for reports.

**Status:** Planning complete; ready for build. See the [task board](tasks/README.md).

## Docs

| Doc | What's in it |
|---|---|
| [AGENTS.md](AGENTS.md) | Operating manual for the agent team: rules, roles, workflow |
| [docs/idea.md](docs/idea.md) | Problem, vision, users, scope |
| [docs/design-doc.md](docs/design-doc.md) | Architecture, domain model, privacy, reports, **decisions D1–D29**, free-tier budget |
| [docs/architecture/](docs/architecture/) | Detailed specs: [conventions](docs/architecture/01-conventions.md), [schema](docs/architecture/02-schema.md), [auth & access](docs/architecture/03-auth-and-access.md), [UI](docs/architecture/04-ui-spec.md), [ops](docs/architecture/05-ops.md), [testing](docs/architecture/06-testing.md) |
| [docs/roadmap.md](docs/roadmap.md) | Milestones M0–M8 and the real-data gate |
| [tasks/](tasks/README.md) | Task board and per-milestone task specs |
| [docs/open-questions.md](docs/open-questions.md) | What's still open for the gurukula |
| `docs/inputs/` | Kick-off call transcript and the gurukula's requirements. **Kept locally, not in git** (D29); agents get them from the owner if needed |

## Stack

Next.js + TypeScript as an installable web app (PWA) on Vercel · Postgres, Auth and Storage on Supabase · Drizzle ORM · Tailwind + shadcn/ui · GitHub Actions for CI, backups and transcription.

The whole stack runs on free tiers and costs ₹0. See [design-doc §11](docs/design-doc.md#11-free-tier-budget).

## Development

Setup, run and deploy instructions will be added by task M0-01.
