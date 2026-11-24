# Bāla Pālana — Idea

> *Bāla* (child) + *Pālana* (care, upbringing). A system that helps a gurukula care for each child by keeping her whole journey in one place.

Inputs: the kick-off call and the gurukula's requirements document (kept locally in `docs/inputs/`, not published; D29).

## The question it must answer

> "Who is this child, where is she in her journey, how is she growing, what are her strengths, what needs attention, what support has been provided, and how has she progressed over time?"

## Problem

About 120 girls live and learn in the gurukula. They also attend an outside school, and they take part in Pooja, cleaning, stotra recitation, competitions and other activities. Today:

- No single place shows a child's journey: admission, academics, health, skills, duties, achievements, concerns and support given.
- Teachers' observations and corrective actions aren't recorded, so they can't be followed up or seen by others.
- Duty teams change every 15 days and are decided by the senior children (akkas). Nobody can say who was responsible on a given day without asking around.
- Admission enquiries, interviews and follow-ups are tracked informally.
- After a child leaves, the connection with her is lost.

## Vision

**A lifelong, child-centric record**: from the first enquiry, through her Gurukula years, into alumni life. Open a child's profile and see her whole journey, year by year.

```
Enquiry ──▶ Admission process ──▶ Gurukula child ──▶ Alumna
           (stages, interviews)   (grade by grade)   (stays in touch)
```

## Users

| Role | Uses the system to |
|---|---|
| Teacher / Mentor | Record quick observations from a phone; schedule and close follow-ups |
| Coordinator (academic / gurukula) | Monitor progress, spot concerns, plan corrective actions, run admissions and duties |
| Management / Trustee | See trends, outcomes and institutional reports |
| Admin | Manage users, settings, fees and records |

About five teachers, all with smartphones and email. Internet at the gurukula is good. Children and parents don't log in.

## Core capabilities

1. **Child profile and journey**: personal details, family, education history, documents, and a year-by-year timeline.
2. **Quick observations and follow-ups**: a teacher records an observation in seconds (pick child → pick category → tap tags → optional short note → optional follow-up date). Every entry carries its date, time and author.
3. **Admissions pipeline**: track enquiries through stages to a decision. Selected children become Gurukula children on the same record, so their admission history stays.
4. **Academic progress**: subject-wise progress per grade and term, plus extra-help flags (for example English, Sanskrit, stotras such as Lalita Sahasranama).
5. **Health and well-being**: health profile and records, visible only to those who need them.
6. **Skills, talents, achievements**: interests and abilities; competitions and performances, with level and result.
7. **Responsibilities and duty rotation**: 15-day duty teams (Pooja, hall cleaning, …) and longer-held roles. Answers "who was on duty that day?" and "how often has she done this duty?"
8. **Fees**: what parents have paid toward the outside school, and what's pending.
9. **Alumni**: stay in touch and log interactions after she leaves.
10. **Reports**: child journey; grade/group summaries and trends; children needing attention; achievements and participation.
11. **Voice-note feedback**: the gurukula gives feedback on the system by recording a voice note inside it.

## Out of scope (v1)

- Timetables, attendance, report-card generation
- Logins for children or parents; messaging parents
- Online payments
- A Play Store app (it's an installable web app instead)

## Success looks like

- A teacher records an observation on her phone in **under 15 seconds**.
- A coordinator opens "Needs attention" and sees every open concern and overdue follow-up, without asking anyone.
- Anyone can answer "whose duty was this?" in under 10 seconds.
- A trustee can see year-on-year trends without anyone building a spreadsheet.

## Approach

- Build from scratch on a **₹0, free-tier stack**. It's a non-profit and the work is volunteered.
- Everything list-like (stages, tags, subjects, duties, cycles, team sizes) is **configurable with sensible defaults**, so the system adapts to how the gurukula actually works.
- Ship a skeleton first, then add a feature every week, shaped by voice-note feedback.
