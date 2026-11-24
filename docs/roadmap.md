# Bāla Pālana — Roadmap

Milestones are **release order**: each ends with a production deploy and a round of voice-note feedback from the gurukula. Task-level detail, dependencies and status live in [tasks/](../tasks/README.md). Agents may work ahead on any task whose dependencies are done.

| # | Milestone | Goal / exit criteria | Target |
|---|---|---|---|
| H | Human setup | Repo, Supabase, Vercel now ([tasks/H.md](../tasks/H.md)); Google, Gmail, backup key, ops repo at the end | Before M0 deploy |
| M0 | Skeleton | Installable app live; sign-in; full schema; children CRUD; settings; CSV import | Week 1–2 |
| M1 | Voice-note feedback | The gurukula records feedback from any page; the admin plays it back | Week 2 |
| M2 | Observations and follow-ups | Teacher records an observation in ≤ 15 s; follow-ups and needs-attention work | Week 3–4 |
| M3 | Duties and responsibilities | Cycles auto-generated and editable; duty board; "who was on duty" in ≤ 10 s | Week 5–6 |
| M4 | Academics | Marks, grades or remarks per term; academics tab; grade summary | Week 7 |
| M5 | Admissions | Enquiry → stages → convert to student, with history kept | Week 8 |
| M6 | Health, documents, family, achievements | Restricted health; document uploads; full family; skills and achievements | Week 9–10 |
| M7 | Fees | Dues and payments; pending list | Week 11 |
| M8 | Reports, alumni, pilot | All reports with CSV and print; alumni; user guide; pilot sign-off | Week 12–13 |
| M9 | Go-live | Private ops repo; nightly backups, keep-alive, transcription, storage checks; proven restore; Google sign-in + email codes; preview isolation; password reset | Week 14 |

## Gate before real data

Production holds **only fake data** until both of these are done:
- Consent forms are collected ([open-questions](open-questions.md) #2).
- M9 is done: nightly backups run, a restore has been verified, previews can't reach the data, and the database password has been reset (M9-01 … M9-05).

## Later (not committed)

- Web push reminders for follow-ups (D20)
- Senior children (akkas) manage teams themselves (D22)
- Regional-language UI (D2)
- Limited view for parents
- File backups for Storage
