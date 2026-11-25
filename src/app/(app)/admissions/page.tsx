import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/placeholder-page";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";

export const metadata: Metadata = { title: strings.nav.admissions };

/** Route placeholder; the screen lands in a later milestone. */
export default async function AdmissionsPage() {
  await requireScreen("admission.read");
  return <PlaceholderPage title={strings.nav.admissions} />;
}
