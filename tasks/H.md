# H — Human setup

These need a person with account access. Agents can't do them, but they can prepare instructions and verify the results. Details are in [05-ops § Human setup](../docs/architecture/05-ops.md#human-setup-one-time).

**Now** (unblocks building and deploying):

| ID | Task | Unblocks | Status |
|---|---|---|---|
| H1 | Public repo `bharathnr1/bala-palana` ✓; branch protection on `main` (PRs only, CI required, linear history, 0 required approvals); a fine-grained token for agents (`GH_TOKEN`, this repo only) | Everything | Repo done; protection + token pending |
| H2 | Supabase project `bala-palana` ✓. Remaining: sign-ups off, Site and redirect URLs, Data API without `public`, create the bootstrap admin user (05-ops §3) | M0-11 | Project done; settings pending |
| H5 | Vercel project ✓ linked to the repo ✓; env vars for Production + Preview; Vercel Authentication on for previews | M0-11 | Project done; env vars pending |

**At the end (M9, before go-live):**

| ID | Task | Unblocks |
|---|---|---|
| H3 | Google Cloud OAuth client → Supabase Google provider | M9-04 |
| H4 | School Gmail + app password → Supabase SMTP | M9-04 |
| H6 | `age` key pair for backups; private key kept offline | M9-01 |
| H7 | Private ops repo `bharathnr1/bala-palana-ops` + its secrets; extend the agents' token to it | M9-01, M9-02 |
| H8 | Gurukula answers [open-questions](../docs/open-questions.md) #1–#4; consent forms collected | Real data |
| H9 | Reset the Supabase database password; update `DATABASE_URL` / `DIRECT_URL` in Vercel and the ops repo | M9-05 |
