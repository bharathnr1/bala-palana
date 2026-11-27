# Task Board

The **Integrator** is the only agent who edits this file ([AGENTS.md](../AGENTS.md#3-team-roles)). Task specs live in the per-milestone files; this board tracks status.

**Status values:** `todo` · `in-progress (<agent>)` · `review` · `blocked (<reason>)` · `done`

**Picking order:** the lowest milestone first, then the critical path. Work ahead on a later milestone only when no current-milestone task is unblocked.

## Critical path

```
M0-01 → M0-03 → M0-04 → M0-06 → M0-07 → M0-08 → M2-02 → M2-04 → M2-05 → M2-07
                                    └→ M1-01 → M1-02 (feedback live by week 2)
```

## Parallel lanes after M0-04 / M0-06

| Lane | Can start in parallel |
|---|---|
| Platform | M0-05, M0-11*, M1-01, M3-01 → M3-02 |
| Feature A | M0-07 → M0-08 → M2-02 … |
| Feature B | M0-09, M2-01 → M2-03, M2-06 |
| QA | Playwright harness early, then each milestone's E2E |

\* also needs human tasks H2 and H5. H3, H4, H6, H7 and H9 are needed only for M9, at the end.

## Board

| ID | Task | Lane | Depends on | Status |
|---|---|---|---|---|
| **H** | **Human setup** ([H.md](H.md)) | | | |
| H1 | Repo ✓, branch protection, agents' token | Human | — | in-progress |
| H2 | Supabase project ✓ + auth/API settings, bootstrap admin | Human | — | in-progress |
| H5 | Vercel ✓ + env vars | Human | H2 | in-progress |
| H3 | Google OAuth client (for M9) | Human | H2 | todo |
| H4 | School Gmail SMTP (for M9) | Human | H2 | todo |
| H6 | Backup encryption key pair (for M9) | Human | — | todo |
| H7 | Private ops repo + its secrets (for M9) | Human | H1 | todo |
| H8 | Open questions + consent forms | Human | — | todo |
| H9 | Reset database password (for M9) | Human | — | todo |
| **M0** | **Skeleton** ([M0.md](M0.md)) | | | |
| M0-01 | Scaffold the app | Platform | H1 | done |
| M0-02 | CI workflow | Platform | M0-01 | done |
| M0-03 | Database foundation | Platform | M0-01 | done |
| M0-04 | Full domain schema | Platform | M0-03 | done |
| M0-05 | Seeds and demo data | Platform | M0-04 | done |
| M0-06 | Authentication and permissions | Platform | M0-04 | done |
| M0-07 | App shell and PWA | Feature A | M0-06 | done |
| M0-08 | Children list, profile, add/edit | Feature A | M0-07 | done |
| M0-09 | Settings: users, lists, preferences | Feature B | M0-07 | done |
| M0-10 | CSV import | Feature B | M0-08 | done |
| M0-11 | Deploy pipeline | Platform | M0-04, H2, H5 | done |
| M0-13 | E2E smoke | QA | M0-08, M0-09 | done |
| **M1** | **Voice-note feedback** ([M1.md](M1.md)) | | | |
| M1-01 | Storage helper | Platform | M0-06 | done |
| M1-02 | Record feedback | Feature A | M1-01, M0-07 | done |
| M1-03 | Feedback list | Feature A | M1-02 | done |
| **M2** | **Observations and follow-ups** ([M2.md](M2.md)) | | | |
| M2-01 | Entries domain | Feature B | M0-06 | done |
| M2-02 | Quick observation screen | Feature A | M2-01, M0-08 | done |
| M2-03 | Journey tab + timeline view | Feature B | M2-01 | done |
| M2-04 | Entry sheet and threads | Feature B | M2-03 | done |
| M2-05 | Home and follow-ups | Feature A | M2-04 | done |
| M2-06 | Needs attention | Feature B | M2-01 | done |
| M2-07 | E2E and role checks | QA | M2-02, M2-05, M2-06 | done |
| **M3** | **Duties and responsibilities** ([M3.md](M3.md)) | | | |
| M3-01 | Cycle engine | Platform | M0-04 | done |
| M3-02 | Duty queries | Platform | M3-01 | done |
| M3-03 | Duty board | Feature A | M3-01, M0-08 | done |
| M3-04 | Who was on duty | Feature B | M3-02 | done |
| M3-05 | Responsibilities and duties tab | Feature B | M3-02, M2-01 | done |
| M3-06 | E2E | QA | M3-03, M3-04 | done |
| **M4** | **Academics** ([M4.md](M4.md)) | | | |
| M4-01 | Assessments domain | Feature A | M0-04 | done |
| M4-02 | Bulk entry | Feature A | M4-01 | todo |
| M4-03 | Academics tab | Feature B | M4-01, M2-01 | todo |
| M4-04 | Grade summary report | Feature B | M4-01 | todo |
| **M5** | **Admissions** ([M5.md](M5.md)) | | | |
| M5-01 | Admissions domain | Feature A | M0-04 | todo |
| M5-02 | Admissions board | Feature A | M5-01 | todo |
| M5-03 | Convert to student | Feature B | M5-01 | todo |
| M5-04 | E2E | QA | M5-02, M5-03 | todo |
| **M6** | **Health, documents, family, achievements** ([M6.md](M6.md)) | | | |
| M6-01 | Health | Feature A | M2-01 | todo |
| M6-02 | Documents | Feature B | M1-01 | todo |
| M6-03 | Family and education history | Feature A | M0-08 | todo |
| M6-04 | Skills and achievements | Feature B | M2-02, M6-02 | todo |
| M6-05 | Role and privacy tests | QA | M6-01, M6-02 | todo |
| **M7** | **Fees** ([M7.md](M7.md)) | | | |
| M7-01 | Fees domain | Feature A | M0-04 | todo |
| M7-02 | Fees UI | Feature A | M7-01, M6-02 | todo |
| **M8** | **Reports, alumni, pilot** ([M8.md](M8.md)) | | | |
| M8-01 | Child journey report | Feature A | M2-03, M4-03, M6-04 | todo |
| M8-02 | Remaining reports | Feature B | M3-02, M5-01, M6-04 | todo |
| M8-03 | Exports | Platform | M8-02 | todo |
| M8-04 | Alumni | Feature A | M2-01 | todo |
| M8-05 | Audit viewer and storage usage | Platform | M0-09 | todo |
| M8-06 | Pilot readiness | QA | M8-01 … M8-05 | todo |
| M8-07 | User guide | QA | M8-06 | todo |
| **M9** | **Go-live** ([M9.md](M9.md)) | | | |
| M9-01 | Nightly backup, keep-alive, storage check | Platform | M0-11, H6, H7 | todo |
| M9-02 | Nightly transcription + retention | Platform | M1-02, M9-01 | todo |
| M9-03 | Ops readiness check | QA | M9-01, M9-02, M9-04, M9-05 | todo |
| M9-04 | Google sign-in and email codes | Platform | M0-06, H3, H4 | todo |
| M9-05 | Go-live hardening | Platform | M9-01, H9 | todo |

## Task spec format

Each task in `M*.md` has: **Lane**, **Depends**, **Spec** (links to the docs that define it), a short *what to build*, and an **Accept** checklist. The Definition of Done in [06-testing](../docs/architecture/06-testing.md#definition-of-done-every-task) applies to every task on top of its own checklist.
