/**
 * Every user-facing string lives here (D2) so that translation touches one
 * file and never the screens. Screens may not hard-code copy.
 */
export const strings = {
  appName: "Bāla Pālana",
  appTagline: "Every child's journey, in one place",

  auth: {
    title: "Sign in",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    signOut: "Sign out",
    testModeTitle: "Test sign-in",
    testModeHint: "Choose an account to continue.",
    notInvited: "You haven't been invited. Ask the admin.",
    inactive: "This account is deactivated. Ask the admin.",
    invalidCredentials: "Email or password is not correct.",
    signedInAs: "Signed in as",
    account: "Account",
    changePassword: "Change password",
    newPassword: "New password",
    newPasswordHint: "At least 8 characters.",
    passwordChanged: "Password changed.",
    passwordChangeFailed: "The password could not be changed.",
    passwordChangeTestMode: "Password changes are disabled in test mode.",
  },

  account: {
    title: "Account",
    role: "Role",
  },

  nav: {
    mainNav: "Main navigation",
    primaryNav: "Primary navigation",
    skipToContent: "Skip to content",
    home: "Home",
    children: "Children",
    observe: "Observe",
    followUps: "Follow-ups",
    attention: "Needs attention",
    duties: "Duties",
    academics: "Academics",
    admissions: "Admissions",
    fees: "Fees",
    alumni: "Alumni",
    reports: "Reports",
    feedback: "Feedback",
    settings: "Settings",
    more: "More",
    closeMore: "Close menu",
  },

  home: {
    greeting: "Hello",
    followUpsTitle: "My follow-ups",
    attentionTitle: "Needs attention",
    recentTitle: "Recently viewed",
    followUpsEmpty: "No follow-ups are due. Anything you schedule will show up here.",
    attentionEmpty: "No children need attention right now.",
    recentEmpty: "Children you open will appear here.",
  },

  install: {
    title: "Install app",
    body: "Add Bāla Pālana to your home screen for one-tap access.",
    action: "Install",
    dismiss: "Not now",
  },

  children: {
    add: "Add child",
    profile: "Child profile",
  },

  duties: {
    lookup: "Who was on duty",
  },

  states: {
    loading: "Loading…",
    emptyTitle: "Nothing here yet",
    errorTitle: "Something went wrong",
    errorBody: "Please try again. If it keeps happening, tell the admin.",
    errorRetry: "Try again",
    pageMissing: "This screen is not available to your role.",
  },

  placeholder: {
    comingSoon: "This screen arrives in a later milestone.",
  },

  errors: {
    invalidForm: "Please check the form.",
    unexpected: "Something went wrong.",
  },
} as const;

export type Strings = typeof strings;
