import {
  AlertTriangle,
  Award,
  BarChart3,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  Home,
  IndianRupee,
  Mic,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import type { NavIcon } from "@/lib/nav";

/**
 * Icons live in this map, not in the nav data: a Server Component cannot pass
 * a component as a prop, but it can pass the serialisable {@link NavIcon} key.
 */
export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  home: Home,
  children: Users,
  observe: Mic,
  followUps: CalendarClock,
  attention: AlertTriangle,
  duties: UsersRound,
  academics: GraduationCap,
  admissions: ClipboardList,
  fees: IndianRupee,
  alumni: Award,
  reports: BarChart3,
  feedback: Mic,
  settings: Settings,
};
