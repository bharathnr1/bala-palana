# Bāla Pālana — Open Questions

Only what a technical decision can't settle. Everything else is decided in [design-doc.md §10](design-doc.md#10-decisions) with configurable defaults.

## Still open

1. **Existing records:** where are student records kept today (register, Excel, forms)? Can we get a copy for the initial import?
2. **Consent:** can the gurukula collect a signed consent form from each parent or guardian? The DPDP Act 2023 requires it before child data goes in.
3. **People:** who are the coordinators and trustees who need accounts? Who approves features and gives feedback?
4. **Call transcript:** something was described as "a separate unit, additional CHO". What does "CHO" refer to?

## Defaults to confirm

These are policy choices; the system ships with the default and can change in Settings.

| Topic | Default |
|---|---|
| Health visibility | Coordinators, management and admin see health records; all staff see medical alerts (D13) |
| Fee visibility | Admin and management; coordinators read-only; teachers none |
| Academic year | Starts in June (D15) |
| Needs attention | A child with no entry in 30 days is listed |
| Duty cycles | 1st–15th and 16th–month end, editable (D8) |

## Answered

| Question | Answer |
|---|---|
| Number of children | ~120 (girls) |
| Number of teachers | About five |
| Devices | Smartphones (Android) |
| Internet | Good, so no offline mode (D19) |
| Email for staff | Yes (D3) |
| Teams, team sizes, swaps, leads, holidays | Unconstrained by design (D8, D9) |
| Fee structure, receipts | Dues + any number of payments, optional receipts (D11) |
| Subjects, stages, duties, tags | Configurable lists with defaults (D7) |
| Who closes a concern | Any teacher or coordinator; who closed it is recorded |
| Assessment format | Marks, grades or remarks (D10) |
