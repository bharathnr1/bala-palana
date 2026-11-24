/**
 * Every user-facing string lives here (D2) so that translation touches one
 * file and never the screens. Screens may not hard-code copy.
 */
export const strings = {
  appName: "Bāla Pālana",
  appTagline: "Every child's journey, in one place",
} as const;

export type Strings = typeof strings;
