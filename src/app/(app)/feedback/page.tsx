import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/placeholder-page";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";

export const metadata: Metadata = { title: strings.nav.feedback };

/** Route placeholder; the screen lands in a later milestone. */
export default async function FeedbackPage() {
  await requireScreen("feedback.create");
  return <PlaceholderPage title={strings.nav.feedback} />;
}
