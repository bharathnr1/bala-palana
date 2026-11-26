# Releases

Every milestone ends in a release. A tag names the app and the version:

- `bala-palana-<major>.<minor>` — a milestone release, e.g. `bala-palana-0.1`.
- `bala-palana-<major>.<minor>.<patch>` — a fix shipped on top of one, e.g. `bala-palana-0.1.1`.

No `v` prefix. `package.json#version` carries the same number without the name (`0.1.0` for `bala-palana-0.1`). Milestones bump the minor number (M0 → 0.1, M1 → 0.2, and so on); fixes between milestones bump the patch number.

## Releases

| Tag | Date | Milestone | What shipped |
|---|---|---|---|
| `bala-palana-0.2` | 2026-11-26 | M1 | Voice-note feedback: a floating mic on every page records up to three minutes with preview and re-record; the admin plays notes back, sees the page context and transcript state, and triages them. |
| `bala-palana-0.1` | 2026-11-25 | M0 | Skeleton: sign-in and permissions, the full domain schema, children list/profile/add/edit, settings (users, lists, preferences), CSV import, and the end-to-end smoke. Shipped together with the entries domain and the quick observation screen (M2-01, M2-02). Live at <https://bala-palana.vercel.app>. |

## Procedure

1. Merge the milestone's last task PR (the milestone wrap-up in [AGENTS.md](../AGENTS.md#7-milestone-wrap-up-integrator)).
2. In one `chore/release-<version>` PR: set `package.json#version`, add the row to the table above, and update the status line in [README](../README.md).
3. Merge it, then tag the merge commit and push the tag:
   ```sh
   git tag bala-palana-0.1 <merge-commit>
   git push origin bala-palana-0.1
   ```
4. Create the GitHub Release from that tag, with the table row as its notes:
   ```sh
   gh release create bala-palana-0.1 --title "bala-palana 0.1" --notes-file <notes.md>
   ```

A fix between milestones follows the same steps with a patch version, and does not change the table's milestone column.

## Rules

- A published tag is never moved, deleted or re-pointed; fix forward with the next patch.
- A release tag always points at a commit on `main` that CI passed.
- The GitHub Release notes are written for the gurukula: what changed and what to try, no internal process.
