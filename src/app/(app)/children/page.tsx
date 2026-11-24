import { PlaceholderPage } from "@/components/placeholder-page";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";

/** Route placeholder; the screen lands in a later milestone. */
export default async function ChildrenPage() {
  await requireScreen("child.read");
  return <PlaceholderPage title={strings.nav.children} />;
}
