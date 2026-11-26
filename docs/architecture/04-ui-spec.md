# 04 — UI Spec

Mobile-first (360 px), Android Chrome as the primary target; desktop gets wider layouts with the same screens. Conventions are in [01-conventions](01-conventions.md#ui-conventions).

## Look and feel

- Calm and warm: off-white background, one accent colour (saffron/terracotta, e.g. `#C2571A`), neutral greys, and status colours only for status.
- Tokens are defined as CSS variables in `globals.css` (shadcn theming), with light and dark themes. Dark is the default; the switch in the header and on sign-in remembers the choice per device in `localStorage`.
- Type: system font stack; base 16 px; names stand out (weight 600).
- Child photos shown as round avatars, with an initials fallback.

## Navigation

| Mobile: bottom bar | Desktop: left sidebar |
|---|---|
| Home · Children · **＋ Observe** (centre, prominent) · Duties · More | Home, Children, Observe, Follow-ups, Needs attention, Duties, Academics, Admissions, Fees, Alumni, Reports, Feedback, Settings |

*More* (mobile) lists everything else. Menu items the role can't use are hidden ([03](03-auth-and-access.md#permission-matrix)). A floating **feedback mic** button sits on every page, above the bottom bar.

## Shared components

| Component | Behaviour |
|---|---|
| `ChildPicker` | Search by name (trigram), filter chips for grade and group, "Recent" row (last 10 viewed); single or multi-select; "select whole team / grade" shortcuts |
| `ChipGroup` | Single or multi select chips from a lookup kind; shows only active items |
| `FollowUpChips` | None · 1 week · 2 weeks · 1 month · Pick date |
| `EntryCard` | Category icon, tags, note (2 lines), author, relative time, follow-up badge; tap opens `EntrySheet` |
| `EntrySheet` | Bottom sheet with the full entry, its thread (follow-ups, corrective actions), and actions: add follow-up, close, edit, delete |
| `AlertBanner` | Profile header strip for medical alerts and open-concern count |
| `EmptyState`, `ListSkeleton`, `ErrorState` | Standard states |
| `Spinner`, `Skeleton` | Pending and placeholder building blocks |
| `SubmitButton` | Submit control that shows a spinner, swaps to its pending label and blocks double submits |
| `RecordButton` | Feedback mic: hold or tap to record, timer, up to 3 min, re-record, send |

## Feedback and loading

Every action acknowledges the tap at once.

- **Route changes**: a thin indeterminate bar at the top of the screen, shown after a 120 ms delay so prefetched screens do not flash it; it completes when the URL settles.
- **Links**: the tapped nav item's icon becomes a spinner while its route loads.
- **Forms**: submit buttons disable, show a spinner and swap to a pending label (`Saving…`, `Signing in…`). Buttons whose only content is an icon show just the spinner.
- **Messages**: one `Alert` style for errors and successes; errors interrupt a screen reader, successes are announced politely.
- **Password fields**: a show/hide control, and the field keeps its autocomplete hint.
- **Empty results**: a filtered list whose search finds nothing offers "Clear filters" instead of a dead end.
- **Skeletons**: each route group has a `loading.tsx` that mirrors the screen, and each screen fades in briefly. Skeletons announce themselves through `role="status"`.
- **Longer reads**: the CSV preview says "Reading file…" while the browser parses the chosen file.
- **Filters and search**: they navigate through the router inside a transition, so a filter change applies immediately rather than waiting for a second tap.

## Screens

### Home `/`
1. Greeting + date.
2. **My follow-ups**: overdue (red badge), due today, next 7 days. Each row shows child, what, and when; tap opens `EntrySheet`.
3. **Needs attention** count card (if `report.attention`).
4. **Recently viewed** children (avatars).

### Quick observation `/observe` (target ≤ 15 s; D23)
Single page, top to bottom:
1. `ChildPicker` (multi). Pre-filled when opened from a profile.
2. Category chips (default: Observation).
3. Tag chips (filtered by category).
4. Subject chips (shown only for Concern and Academic).
5. Note (optional, a 3-line textarea; the hint mentions keyboard voice typing).
6. Category-specific fields (Achievement: event, level, result; Skill: area; Responsibility: title, from, to).
7. `FollowUpChips` (Concern defaults to 1 week).
8. Sticky **Save** button. A toast says "Saved for 3 children", with Undo for 10 s (soft delete).

### Children `/children`
Search bar, filter chips (grade, group, stage = student by default), a list on mobile and a photo grid on desktop. Admin and coordinator get **＋ Add child** and **Import CSV**.

### Child profile `/children/[id]`
- Header: avatar, name, grade/group, stage badge, `AlertBanner`, an **Observe** button.
- Tabs (scrollable on mobile): **Journey** · Academics · Skills & achievements · Responsibilities & duties · Health · Family · Documents · Fees · Admission. Tabs the role can't access are hidden.
- **Journey**: a timeline grouped under academic-year headings (newest first), a category filter, and `EntryCard`s, plus system events (joined, grade change, duty stints, assessments) shown as compact rows.

### Follow-ups `/follow-ups`
Tabs Mine / All (coordinator+), grouped Overdue / Today / Upcoming. Admission follow-ups are included from M5.

### Needs attention `/attention`
A list of children with reason chips ("2 open concerns", "follow-up 5 days overdue", "no entry in 34 days", "concerns in 3 subjects"), filters for grade and teacher, and a sort by severity.

### Duties `/duties`
- Cycle switcher (‹ 1–15 Nov 2026 ›), status badge, and actions: copy last cycle, pause, skip, edit dates, split, merge.
- **Board**: one card per duty, holding team cards with member avatars and a lead star. Mobile: tap a child to choose "Move to team… / Make lead / Set dates / Remove". Desktop: drag and drop. "＋ Team" and "＋ Add children" (opens `ChildPicker` multi).
- **Who was on duty** `/duties/lookup`: pick duty + date → team members with leads; links to profiles.

### Academics `/academics`
Bulk entry: pick year, grade, term and subject → a list of children, each with marks / max (or a grade letter or remark) input. Autosave per row.

### Admissions `/admissions`
Mobile: status tabs with counts. Desktop: kanban columns. Cards show name, enquiry date, next action and follow-up date. Card detail: family and contact, events timeline, **Add event**, **Change status**, **Convert to student** (consent checkbox + joined date + grade).

### Fees `/fees/pending`
For admin, management and coordinator: children with a balance due, sorted by due date and amount; tap to open the profile's Fees tab.

### Alumni `/alumni`
List with contact details and last interaction; tap to log an interaction.

### Reports `/reports`
Index cards → each report page has filters, a chart and table, **Export CSV** and **Print**. The child journey report has a print stylesheet (A4).

### Feedback `/feedback`
Admin: a list with player, transcript, page context, status, and a triage note. Others: their own submissions.

### Settings `/settings` (admin)
Users (add, role, deactivate) · Lists (one tab per lookup kind: add, rename, reorder, deactivate) · Preferences (academic-year start month, cycle rule, needs-attention days, audio retention) · Audit log · Storage usage.

## PWA

- `app/manifest.ts`: name "Bāla Pālana", short name "Bāla Pālana", `display: standalone`, theme colour = accent, 192/512 px icons plus a maskable icon.
- A minimal service worker (no offline caching, D19) so it's installable everywhere.
- An "Install app" hint on Home for first-time Android users who aren't in standalone mode.
