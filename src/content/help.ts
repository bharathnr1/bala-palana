/**
 * The help corpus (Tier 0). One article per task a person actually does,
 * written for the people who use the app (not for developers): short, in the
 * order they would do it, naming the on-screen labels.
 *
 * This is content, not UI copy: the screen's chrome and every label around an
 * article still comes from `src/lib/strings.ts` (D2).
 *
 * Rules for adding an article:
 * - Only describe screens that exist. A half-built feature in help is worse
 *   than no help.
 * - Lead with the plain answer, then the steps.
 * - `keywords` carries the words people type that do not appear in the text
 *   (synonyms, plurals, spelling variants) — the search is lexical.
 */

export type HelpSection = "start" | "children" | "duties" | "admissions" | "academics" | "admin";

export type HelpArticle = {
  /** Anchor id and stable key. Never change it once published. */
  slug: string;
  section: HelpSection;
  title: string;
  summary: string;
  keywords: readonly string[];
  steps: readonly string[];
  /** A caveat, permission rule or thing that often goes wrong. */
  note?: string;
  /** Where the reader carries on. */
  link?: { href: string; label: string };
};

/** Display order of the sections, also the browse order on the help page. */
export const HELP_SECTIONS: readonly HelpSection[] = [
  "start",
  "children",
  "duties",
  "admissions",
  "academics",
  "admin",
];

export const HELP_ARTICLES: readonly HelpArticle[] = [
  // ------------------------------------------------------------ getting started
  {
    slug: "sign-in-first-time",
    section: "start",
    title: "Sign in for the first time",
    summary: "There is no email to wait for. The admin hands you a temporary password.",
    keywords: ["login", "log in", "first time", "temporary password", "welcome", "access"],
    steps: [
      "Open the app and enter the email address the admin added for you.",
      "Enter the temporary password the admin shared with you (in person or on the phone).",
      "Tap Sign in.",
      "Go to Account in the top bar and choose Change password to set your own password.",
    ],
    note: "No email is sent, so there is nothing to confirm and no link to click.",
    link: { href: "/account/password", label: "Change password" },
  },
  {
    slug: "get-an-account",
    section: "start",
    title: "Get an account (there is no sign-up page)",
    summary: "Accounts are invite-only. The admin creates yours from Settings → Users.",
    keywords: ["signup", "sign up", "register", "join", "invite", "invited", "no account"],
    steps: [
      "Ask the admin to add you. They need your name, email address and the role you should have.",
      "The admin opens Settings → Users, taps Add user, and enters those details.",
      "The admin copies the temporary password it shows once, and shares it with you.",
      "Sign in with that email and temporary password, then change the password.",
    ],
    note: "Self sign-up is turned off on purpose: only people the admin adds can sign in. If you see “You haven't been invited”, the admin has not added your email yet.",
  },
  {
    slug: "forgot-password",
    section: "start",
    title: "Forgot your password",
    summary: "There is no reset email. The admin resets it from Settings → Users.",
    keywords: ["forgot", "reset", "locked out", "cannot sign in", "lost password"],
    steps: [
      "Ask the admin to reset your password.",
      "The admin opens Settings → Users, finds your name and taps Reset password.",
      "The admin shares the new temporary password with you; it is shown only once.",
      "Sign in with it, then change it under Account → Change password.",
    ],
    note: "A user who has never signed in has no sign-in account yet, so there is nothing to reset — the admin adds them again instead.",
  },
  {
    slug: "change-password",
    section: "start",
    title: "Change your password",
    summary: "Account → Change password. At least 8 characters.",
    keywords: ["password", "account", "security", "new password", "change"],
    steps: [
      "Tap Account in the top bar.",
      "Enter the new password (at least 8 characters).",
      "Tap Change password. A confirmation appears when it is saved.",
    ],
    note: "You are not asked for the current password, so sign out on a shared phone when you are finished.",
    link: { href: "/account/password", label: "Change password" },
  },
  {
    slug: "roles",
    section: "start",
    title: "What each role can do",
    summary: "Admin, Management, Coordinator and Teacher see and change different things.",
    keywords: ["roles", "permissions", "access", "admin management coordinator teacher", "who can"],
    steps: [
      "Admin — runs the app: users, settings, fees, everything.",
      "Management — trustees: reads everything and the reports, changes nothing.",
      "Coordinator — day-to-day work: child records, admissions, duties, observations, health notes, assessments.",
      "Teacher — observations, follow-ups, assessments and duty read; never restricted health notes or fees.",
    ],
    note: "The menu only shows screens your role can open, so a missing item usually means “not for this role” rather than a fault.",
  },
  {
    slug: "navigation",
    section: "start",
    title: "Find your way around",
    summary: "Sidebar on a computer, bottom bar and “More” on a phone.",
    keywords: ["menu", "navigation", "sidebar", "bottom bar", "more", "where", "home"],
    steps: [
      "On a computer, every screen is in the left sidebar.",
      "On a phone, the bottom bar holds Home, Children, Observe and Duties; everything else is under More.",
      "Home shows your follow-ups, the number of children needing attention, and children you opened recently.",
      "Account and Sign out are in the top bar.",
    ],
  },
  {
    slug: "install-on-phone",
    section: "start",
    title: "Add the app to your phone's home screen",
    summary: "Works like an app, opens in one tap, no store needed.",
    keywords: ["install", "home screen", "app", "icon", "offline", "shortcut"],
    steps: [
      "Open the app in Chrome on Android (or Safari on iPhone).",
      "Tap the Install banner on Home, or use the browser menu and choose “Add to Home screen”.",
      "Confirm. An icon appears on your home screen.",
    ],
    note: "Installing does not download any child's data — the app still asks you to sign in and checks your role on every screen.",
  },
  {
    slug: "send-feedback",
    section: "start",
    title: "Send feedback to the admin",
    summary: "Record a voice note from any screen. Up to 3 minutes.",
    keywords: ["feedback", "voice note", "suggestion", "problem", "report a bug", "recording"],
    steps: [
      "Tap the feedback button, then Record, and speak.",
      "Tap Stop when you are done; you can re-record before sending.",
      "Tap Send. The admin sees it in Feedback with the screen it was recorded from.",
    ],
    note: "Use Chrome with the microphone allowed. A transcript appears after the nightly job; the audio is deleted after the retention period set in Settings → Preferences.",
    link: { href: "/feedback", label: "Feedback" },
  },

  // ------------------------------------------------------ children & observations
  {
    slug: "add-a-child",
    section: "children",
    title: "Add a child",
    summary: "Children → Add child. Name is required; the rest can come later.",
    keywords: ["new child", "add student", "enrol", "admission", "profile", "create"],
    steps: [
      "Open Children and tap Add child.",
      "Fill in the child's name, and the preferred name, date of birth and stage if you have them.",
      "Add the primary guardian's name, phone and relation.",
      "Add the enrolment: academic year, grade, group, and whether the child studies outside school.",
      "Tick Consent recorded only when the parent has agreed, then save.",
    ],
    note: "Consent is needed before a child can become a Student; the app refuses the move without it.",
    link: { href: "/children/new", label: "Add child" },
  },
  {
    slug: "import-children-csv",
    section: "children",
    title: "Import children from a CSV file",
    summary: "Children → Import. Download the template, fill it, review, import.",
    keywords: ["import", "csv", "spreadsheet", "excel", "bulk", "upload", "many children"],
    steps: [
      "Open Children and choose Import CSV.",
      "Tap Download template and fill one row per child.",
      "Choose the file (up to 1 MB). Each row is checked: Ready, or a problem to fix.",
      "Untick any row you do not want, then tap Import selected rows.",
    ],
    note: "Rows for children who already exist are skipped, so importing the same file twice is safe.",
  },
  {
    slug: "find-a-child",
    section: "children",
    title: "Find a child",
    summary: "Search by name, or filter by grade, group and stage.",
    keywords: ["search", "find", "filter", "look up", "child list", "grade group"],
    steps: [
      "Open Children.",
      "Type part of the name in Search and tap Search.",
      "Or pick a grade, group or stage and apply the filters.",
      "Tap a child's row to open the profile.",
    ],
    note: "Clear filters resets the list. Recently viewed children also appear on Home.",
  },
  {
    slug: "child-profile-tabs",
    section: "children",
    title: "What is on a child's profile",
    summary:
      "Journey, Academics, Skills, Responsibilities, Health, Family, Documents, Fees and Admission.",
    keywords: ["profile", "tabs", "journey", "history", "child record", "timeline"],
    steps: [
      "Open the child from Children.",
      "Journey is the full history, newest first: observations, follow-ups, duties, assessments and admission events.",
      "Academics shows marks by term; Responsibilities shows roles and duty counts; Admission shows the enquiry history.",
      "Use Edit on the profile to change the child's details.",
    ],
    note: "Some tabs are still being built and say so when opened. They will fill in as the app grows; nothing you record is lost.",
  },
  {
    slug: "record-an-observation",
    section: "children",
    title: "Record an observation",
    summary: "Observe, pick one or more children, choose a category, write the note.",
    keywords: ["observe", "observation", "note", "quick", "record", "daily", "behaviour"],
    steps: [
      "Tap Observe (it is the centre button on a phone).",
      "Pick one or more children — recent children are at the top.",
      "Choose a category and any tags; add a subject where one is offered.",
      "Type the note, or use your keyboard's voice typing.",
      "Optionally choose Follow up (1 week, 2 weeks, 1 month or a date), then Save.",
    ],
    note: "The same note can be saved for several children at once. Right after saving you can Undo.",
    link: { href: "/observe", label: "Observe" },
  },
  {
    slug: "observation-categories",
    section: "children",
    title: "Which category to choose",
    summary: "What each category is for, and which ones open a follow-up.",
    keywords: ["category", "concern", "achievement", "skill", "health", "corrective", "tags"],
    steps: [
      "Observation — something you noticed, with nothing to act on.",
      "Concern / needs help — something needs attention; this can open a follow-up.",
      "Corrective action — what was done about a concern; attach it to that concern.",
      "Academic, Skill / talent, Achievement — progress and wins worth keeping.",
      "Responsibility — a role the child held. Health / well-being — visible only to admin, management and coordinators.",
      "Alumni interaction — a contact with a former student.",
    ],
    note: "Health notes are restricted: teachers do not see them anywhere, and a coordinator should record them knowingly.",
  },
  {
    slug: "follow-ups",
    section: "children",
    title: "Work through follow-ups",
    summary: "Follow-ups lists what is overdue, due today and coming up.",
    keywords: ["follow up", "followup", "due", "overdue", "reminder", "close", "concern"],
    steps: [
      "Open Follow-ups. Mine is your own list; coordinators and admins can switch to All.",
      "Work through Overdue first, then Today.",
      "Tap a child to open the entry and add what was done (Add a follow-up or Add a corrective action).",
      "When it is dealt with, tap Close follow-up.",
    ],
    note: "A closed follow-up stays in the child's Journey. Reopen it if it comes back.",
    link: { href: "/follow-ups", label: "Follow-ups" },
  },
  {
    slug: "needs-attention",
    section: "children",
    title: "Use “Needs attention”",
    summary: "One list of children with open concerns, overdue follow-ups or no recent notes.",
    keywords: ["attention", "risk", "overdue", "concerns", "stale", "who needs help"],
    steps: [
      "Open Needs attention.",
      "Each child shows why they are there: overdue follow-ups, open concerns, concerns in several subjects, or no entry for many days.",
      "Filter by grade or by the last teacher who wrote an entry.",
      "Open a child to act; the row disappears when the reason is resolved.",
    ],
    note: "The “no entry in N days” threshold is set by the admin in Settings → Preferences.",
    link: { href: "/attention", label: "Needs attention" },
  },
  {
    slug: "edit-or-delete-an-entry",
    section: "children",
    title: "Edit or delete an entry",
    summary: "Open the entry from the Journey. Your own entry can be deleted within 24 hours.",
    keywords: ["edit", "delete", "mistake", "wrong note", "undo", "change note"],
    steps: [
      "Open the child's Journey and tap the entry.",
      "Tap Edit, change the note, and save.",
      "To remove your own entry, tap Delete — allowed within 24 hours of writing it.",
    ],
    note: "Admins and coordinators can edit or delete any entry at any time. Teachers can change only their own entries.",
  },
  {
    slug: "restricted-health-and-documents",
    section: "children",
    title: "Who can see health notes and private documents",
    summary: "Health entries and restricted documents are hidden from teachers.",
    keywords: ["health", "restricted", "private", "documents", "aadhaar", "medical", "who can see"],
    steps: [
      "Health / well-being entries are visible to Admin, Management and Coordinator only.",
      "Restricted document kinds (Aadhaar, Medical) behave the same way.",
      "Everything else on the profile is visible to every signed-in role.",
    ],
    note: "Documents open through short-lived signed links; there are no public file links.",
  },

  // -------------------------------------------------------------------- duties
  {
    slug: "add-a-duty",
    section: "duties",
    title: "Add a new duty",
    summary: "Duties live in Settings → Lists. Add one there and it appears on the board.",
    keywords: ["duty", "duties", "add duty", "new duty", "chore", "rota", "cleaning", "pooja"],
    steps: [
      "Open Settings and choose the Lists tab.",
      "Choose Duty from the list names.",
      "Type the duty in New item — for example “Bathroom cleaning” — and tap Add item.",
      "Open Duties: the new duty can now be added as a team.",
    ],
    note: "Only an admin can change lists. Names can be renamed or deactivated later without losing history.",
    link: { href: "/settings?tab=lists", label: "Settings → Lists" },
  },
  {
    slug: "duty-board",
    section: "duties",
    title: "Understand the duty board",
    summary: "A cycle is roughly half a month; each duty has one team per cycle.",
    keywords: ["duty board", "cycle", "teams", "schedule", "roster", "unassigned"],
    steps: [
      "Open Duties. Use Previous cycle and Next cycle to move between cycles.",
      "Each card is one duty: its team, its lead, and the children in it.",
      "An Unassigned card is a duty with no team yet in this cycle.",
      "Cycles are created automatically for this month and the next two.",
    ],
    note: "Only students can be added to a team — applicants and alumnae are not in the picker.",
    link: { href: "/duties", label: "Duties" },
  },
  {
    slug: "add-a-team",
    section: "duties",
    title: "Add a team and put children in it",
    summary: "＋ Team for the duty, then ＋ Add children to fill it.",
    keywords: ["team", "add team", "assign", "children", "members", "duty"],
    steps: [
      "On the duty board, tap ＋ Team.",
      "Choose the duty and, if you like, a label for this team; save.",
      "On the new card, tap ＋ Add children and pick the students.",
      "Use the menu on a child to make them Lead, set dates, move them to another team, or remove them.",
    ],
    note: "A child cannot be in the same team twice. Moving a child only works within the same cycle.",
    link: { href: "/duties", label: "Duties" },
  },
  {
    slug: "team-lead-and-swaps",
    section: "duties",
    title: "Set a lead, or swap children mid-cycle",
    summary: "One lead per team; dates let two children share a slot.",
    keywords: [
      "lead",
      "captain",
      "swap",
      "shift",
      "rotate",
      "dates",
      "half cycle",
      "from to",
      "mid cycle",
    ],
    steps: [
      "Open the team's menu on the duty board.",
      "Tap Make lead on the child who should lead.",
      "For a swap, tap Set dates on a child and give the days they hold the duty.",
      "Add the other child and give them the rest of the cycle.",
    ],
    note: "Both dates must fall inside the cycle. “Who was on duty” then answers correctly for each day.",
  },
  {
    slug: "copy-last-cycle",
    section: "duties",
    title: "Copy the last cycle's teams",
    summary: "Reuse the previous cycle's teams instead of rebuilding them.",
    keywords: ["copy", "last cycle", "reuse", "same teams", "repeat", "again"],
    steps: [
      "Open the cycle you want to fill.",
      "Tap Copy last cycle.",
      "The teams and children from the previous cycle are added to this one.",
    ],
    note: "Copying refuses to run when the cycle already has teams. Clear it first, then copy. There must also be an earlier cycle to copy from.",
  },
  {
    slug: "cycle-actions",
    section: "duties",
    title: "Pause, skip, split or merge a cycle",
    summary: "Adjust the calendar when holidays or events change it.",
    keywords: ["pause", "skip", "split", "merge", "holiday", "dates", "cycle"],
    steps: [
      "Pause stops the cycle being current without deleting anything; Resume puts it back.",
      "Skip marks a cycle that will not run, for example a holiday.",
      "Split starts a new cycle from a day inside this one — pick a day after the first.",
      "Merge with next joins this cycle to the one after it; the next cycle is removed.",
    ],
    note: "Cycles cannot overlap. If the app refuses a date change, adjust the neighbouring cycle first.",
  },
  {
    slug: "who-was-on-duty",
    section: "duties",
    title: "See who was on duty on a day",
    summary: "Duties → Who was on duty: pick the duty and the day.",
    keywords: ["who", "on duty", "lookup", "which day", "roster", "history"],
    steps: [
      "Open Duties and choose Who was on duty.",
      "Pick the duty and the day.",
      "Tap Show. The children on duty that day appear, with the lead marked.",
    ],
    note: "It answers for today by default, so the common question needs no choices at all.",
    link: { href: "/duties/lookup", label: "Who was on duty" },
  },
  {
    slug: "manage-duty-names",
    section: "duties",
    title: "Rename, reorder or retire a duty",
    summary: "Settings → Lists → Duty: rename, move up or down, or deactivate.",
    keywords: ["rename", "reorder", "delete duty", "remove duty", "inactive", "retire", "lists"],
    steps: [
      "Open Settings → Lists and choose Duty.",
      "Rename a duty by editing its label and tapping Rename.",
      "Change the order with Move up and Move down.",
      "Deactivate a duty that is no longer used; Activate brings it back.",
    ],
    note: "Deactivating hides a duty from the board's picker but keeps past teams and history intact. Lists that do not exist yet cannot be created from this screen.",
  },

  // ---------------------------------------------------------------- admissions
  {
    slug: "new-enquiry",
    section: "admissions",
    title: "Start a new enquiry",
    summary: "Admissions → New enquiry. It creates the child record and the admission record.",
    keywords: ["admission", "enquiry", "inquiry", "apply", "new applicant", "application"],
    steps: [
      "Open Admissions and tap New enquiry.",
      "Enter the child's name (the only required field), and the date of birth or preferred name if known.",
      "Add the guardian's name, phone and relation.",
      "Record the enquiry date, source and stage, then save.",
    ],
    note: "An enquiry is the first step of the admission journey. The child appears as an Applicant until converted.",
    link: { href: "/admissions/new", label: "New enquiry" },
  },
  {
    slug: "admissions-board",
    section: "admissions",
    title: "Read the admissions board",
    summary: "One column per stage, most urgent first, with follow-up counts.",
    keywords: ["board", "stages", "columns", "applicants", "admissions", "overview"],
    steps: [
      "Open Admissions. Each column is a stage.",
      "Cards show the enquiry date, the interview date, the owner and the next action.",
      "A badge shows how many follow-ups are due in that stage.",
      "Closed stages (selected, not interested, not eligible, admission not taken) are hidden behind Show closed stages.",
    ],
    note: "The board shows the most urgent enquiries first; the count line tells you when it is showing only the first N.",
    link: { href: "/admissions", label: "Admissions" },
  },
  {
    slug: "move-an-enquiry",
    section: "admissions",
    title: "Move an enquiry to the next stage",
    summary: "Open the enquiry, tap Change status, and record what happened.",
    keywords: ["stage", "status", "move", "interview", "selected", "reject", "events"],
    steps: [
      "Open the enquiry from the board.",
      "Tap Change status and choose the new stage.",
      "Add an event when there is something to remember: interview, assessment, activity, observation or a note.",
      "Save. The stage change appears in the enquiry's events and on the child's Admission tab.",
    ],
    note: "Closed stages end the journey. If the family comes back later, start a new enquiry.",
  },
  {
    slug: "next-action-and-follow-up",
    section: "admissions",
    title: "Set a next action and follow-up",
    summary: "Every follow-up needs an owner, otherwise nobody is reminded.",
    keywords: ["next action", "follow up", "owner", "assign", "reminder", "admission"],
    steps: [
      "Open the enquiry.",
      "Tap Next action and follow-up.",
      "Write the next action, choose the follow-up date and pick the owner.",
      "Save. The follow-up appears in that person's Follow-ups on the due date.",
    ],
    note: "The app will not save a follow-up without an owner. Choose None to clear the follow-up instead.",
  },
  {
    slug: "convert-to-student",
    section: "admissions",
    title: "Convert an applicant to a student",
    summary: "Consent is required; then set the joining date, grade and group.",
    keywords: ["convert", "student", "admit", "enrol", "joined", "consent", "accept"],
    steps: [
      "Open the enquiry and tap Convert to student.",
      "Tick Parental consent recorded — it is required.",
      "Enter the joining date, grade, group and whether the child studies outside school.",
      "Confirm. The child's stage changes from Applicant to Student.",
    ],
    note: "Only an applicant can be converted, and the app refuses without consent. Duties and assessments pick the child up immediately.",
  },
  {
    slug: "admission-history",
    section: "admissions",
    title: "See an enquiry from the child's profile",
    summary: "The Admission tab holds the enquiry, its events and a link to the board.",
    keywords: ["admission tab", "profile", "history", "events", "child"],
    steps: [
      "Open the child's profile.",
      "Choose the Admission tab.",
      "The enquiry, its stage, owner and events are listed; Open on the board takes you to the card.",
    ],
    note: "A child with no enquiry says so — add one from Admissions → New enquiry.",
  },

  // ------------------------------------------------------- academics & reports
  {
    slug: "enter-marks",
    section: "academics",
    title: "Enter assessment marks for a class",
    summary: "Choose year, grade, term and subject, then type the marks.",
    keywords: ["marks", "assessment", "exam", "grades", "academics", "class", "results"],
    steps: [
      "Open Academics.",
      "Choose the academic year, grade, term and subject, then tap Show children.",
      "Type each child's marks and the maximum, plus an optional grade letter or remark.",
      "Each cell saves on its own as you go.",
    ],
    note: "Marks cannot be more than the maximum. Management can read assessments but not change them.",
    link: { href: "/academics", label: "Academics" },
  },
  {
    slug: "grade-summary-report",
    section: "academics",
    title: "Export a grade summary",
    summary: "Reports → Grade summary: per-subject averages by term, downloadable as CSV.",
    keywords: ["report", "summary", "average", "csv", "export", "term", "analysis"],
    steps: [
      "Open Reports and choose Grade summary.",
      "Pick the academic year, grade and term, then tap Show.",
      "Check the per-subject averages in the table and chart.",
      "Tap Export CSV to download the table.",
    ],
    note: "No rows means no assessments match those filters — try a different term or grade.",
    link: { href: "/reports/grade-summary", label: "Grade summary" },
  },

  // --------------------------------------------------------------------- admin
  {
    slug: "add-a-user",
    section: "admin",
    title: "Add a user (admin)",
    summary: "Settings → Users → Add user. The temporary password is shown once.",
    keywords: ["add user", "new user", "account", "invite", "staff", "teacher", "admin"],
    steps: [
      "Open Settings → Users and tap Add user.",
      "Enter the name, email address and role.",
      "Save. A temporary password is shown — copy it now, it is not shown again.",
      "Share it with the person by phone or in person. No email is sent.",
    ],
    note: "The person signs in with that password and changes it under Account → Change password. An email that is already on the list is refused.",
    link: { href: "/settings?tab=users", label: "Settings → Users" },
  },
  {
    slug: "reset-a-password",
    section: "admin",
    title: "Reset someone's password (admin)",
    summary: "Settings → Users → Reset password. The new temporary password is shown once.",
    keywords: ["reset password", "forgot", "locked out", "temporary password", "admin"],
    steps: [
      "Open Settings → Users and find the person.",
      "Tap Reset password.",
      "Copy the new temporary password and share it with them.",
      "Ask them to change it after signing in.",
    ],
    note: "A person who has never signed in has no sign-in account yet, so there is nothing to reset.",
  },
  {
    slug: "deactivate-a-user",
    section: "admin",
    title: "Deactivate or reactivate a user (admin)",
    summary: "Deactivating signs the person out on their next request; nothing is deleted.",
    keywords: ["deactivate", "disable", "remove user", "leaver", "inactive", "reactivate"],
    steps: [
      "Open Settings → Users.",
      "Tap Deactivate next to the person.",
      "Tap Reactivate to let them back in.",
    ],
    note: "The last active admin cannot be deactivated, and you cannot deactivate yourself.",
  },
  {
    slug: "lists-explained",
    section: "admin",
    title: "What Settings → Lists controls",
    summary: "The lists behind every picker: duties, grades, subjects, tags and more.",
    keywords: ["lists", "lookup", "options", "dropdown", "configure", "rename", "settings"],
    steps: [
      "Open Settings → Lists. Each name is one list.",
      "Add item appends to that list; Rename changes the label shown in the app.",
      "Move up and Move down change the order everywhere the list appears.",
      "Deactivate hides an item from pickers without touching history; Activate brings it back.",
    ],
    note: "You can add entries to a list that already exists, but a brand-new list has to be added by the developers — the screen only shows lists that exist.",
  },
  {
    slug: "preferences",
    section: "admin",
    title: "Change the app's preferences",
    summary: "Academic year start, duty cycle rule, attention threshold and audio retention.",
    keywords: [
      "preferences",
      "settings",
      "academic year",
      "cycle rule",
      "retention",
      "attention days",
    ],
    steps: [
      "Open Settings → Preferences.",
      "Change the academic year start month, the duty cycle rule, how many days without an entry counts as “needs attention”, or how long feedback audio is kept.",
      "Tap Save preferences.",
    ],
    note: "Changing the cycle rule affects cycles created from then on, not the existing calendar.",
  },
];
