import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/placeholder-page";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";

export const metadata: Metadata = { title: strings.duties.lookup };

/** Route placeholder; the screen lands in a later milestone. */
export default async function DutyLookupPage() {
  await requireScreen("duty.read");
  return <PlaceholderPage title={strings.duties.lookup} />;
}
