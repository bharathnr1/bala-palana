import { strings } from "./strings";
import { can, type Action, type Role } from "./permissions";

/**
 * The signed-in navigation as data (04-ui-spec § Navigation). Pure, so the
 * layout and the client menu render the same list and a unit test can prove
 * the role filtering.
 */
export type NavIcon =
  | "home"
  | "children"
  | "observe"
  | "followUps"
  | "attention"
  | "duties"
  | "academics"
  | "admissions"
  | "fees"
  | "alumni"
  | "reports"
  | "feedback"
  | "settings";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  /** The permission from 03-auth-and-access that shows this item. */
  requires: Action;
};

/** Every signed-in screen, in sidebar order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/", label: strings.nav.home, icon: "home", requires: "child.read" },
  { href: "/children", label: strings.nav.children, icon: "children", requires: "child.read" },
  { href: "/observe", label: strings.nav.observe, icon: "observe", requires: "entry.create" },
  {
    href: "/follow-ups",
    label: strings.nav.followUps,
    icon: "followUps",
    requires: "entry.create",
  },
  { href: "/attention", label: strings.nav.attention, icon: "attention", requires: "report.attention" },
  { href: "/duties", label: strings.nav.duties, icon: "duties", requires: "duty.read" },
  { href: "/academics", label: strings.nav.academics, icon: "academics", requires: "assessment.read" },
  { href: "/admissions", label: strings.nav.admissions, icon: "admissions", requires: "admission.read" },
  { href: "/fees/pending", label: strings.nav.fees, icon: "fees", requires: "fee.read" },
  { href: "/alumni", label: strings.nav.alumni, icon: "alumni", requires: "alumni.write" },
  { href: "/reports", label: strings.nav.reports, icon: "reports", requires: "report.read" },
  { href: "/feedback", label: strings.nav.feedback, icon: "feedback", requires: "feedback.create" },
  { href: "/settings", label: strings.nav.settings, icon: "settings", requires: "settings.manage" },
];

/** The mobile bottom bar, in order; Observe sits in the centre (04-ui-spec). */
export const MOBILE_PRIMARY_HREFS: readonly string[] = ["/", "/children", "/observe", "/duties"];

/** The items this role may see. */
export function navFor(user: { role: Role }): NavItem[] {
  return NAV_ITEMS.filter((item) => can(user, item.requires));
}

/** The slice of {@link navFor} that goes in the mobile bottom bar. */
export function mobilePrimaryFor(user: { role: Role }): NavItem[] {
  const visible = navFor(user);
  return MOBILE_PRIMARY_HREFS.map((href) => visible.find((item) => item.href === href)).filter(
    (item): item is NavItem => item !== undefined,
  );
}
