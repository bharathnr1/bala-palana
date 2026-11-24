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

  errors: {
    invalidForm: "Please check the form.",
    unexpected: "Something went wrong.",
  },
} as const;

export type Strings = typeof strings;
