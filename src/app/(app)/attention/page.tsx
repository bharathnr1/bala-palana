import { PlaceholderPage } from "@/components/placeholder-page";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";

/** Route placeholder; the screen lands in a later milestone. */
export default async function AttentionPage() {
  await requireScreen("report.attention");
  return <PlaceholderPage title={strings.nav.attention} />;
}
