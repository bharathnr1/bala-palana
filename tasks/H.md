# H — Human setup

These need a person with account access. Agents can't do them, but they can prepare instructions and verify the results. Details are in [05-ops § Human setup](../docs/architecture/05-ops.md#human-setup-one-time).

| ID | Task | Unblocks | Done when |
|---|---|---|---|
| H1 | Create the **public** repo `bharathnr1/bala-palana` (✓ done) and enable branch protection on `main` (PRs only, CI required, linear history, 0 required approvals); set up a separate SSH key and `github-personal` host alias for `bharathnr1`; give agents a fine-grained token for this repo only (`GH_TOKEN`); push this folder; enable Actions | Everything | `gh api user --jq .login` prints `bharathnr1` in the agents' environment, and agents can open PRs |
| H2 | Create Supabase projects `bala-palana-dev` and `bala-palana-prod` in **ap-south-1 (Mumbai)**, free plan; remove `public` from the Data API's exposed schemas | M0-11 | Connection strings and keys stored in Vercel and GitHub secrets |
| H3 | Google Cloud project → OAuth consent screen + web client; add the client ID and secret to both Supabase projects; set the Site URL and redirect URLs | M0-06 (real Google sign-in) | Google sign-in works on a preview deploy |
| H4 | School Gmail account → 2-step verification → app password → Supabase *Auth → SMTP* (both projects) | Email-code fallback | A code email arrives at a non-team address |
| H5 | Vercel project (Hobby) linked to the repo; env vars per environment ([05-ops](../docs/architecture/05-ops.md#environment-variables)) | M0-11 | Preview and production deploys succeed |
| H6 | `age-keygen`: public key → ops-repo secret `BACKUP_AGE_PUBLIC_KEY`; private key stored offline (password manager + printed copy) | M0-12 | First encrypted backup artifact exists |
| H7 | Create the **private** repo `bharathnr1/bala-palana-ops`; add its Actions secrets `PROD_DIRECT_URL`, `PROD_SUPABASE_URL`, `PROD_SUPABASE_SERVICE_ROLE_KEY`, `BACKUP_AGE_PUBLIC_KEY` (plus the `DEV_*` equivalents for the restore drill); extend the agents' token to cover this repo | M0-12, M1-04 | The nightly job runs green in the ops repo |
| H8 | Gurukula answers [open-questions](../docs/open-questions.md) #1–#4; consent forms collected | Real data in production | Integrator confirms the gate in [roadmap](../docs/roadmap.md#gate-before-real-data) |
