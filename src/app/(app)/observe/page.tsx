import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { ObserveForm } from "@/features/entries/observe-form";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";
import { listChildrenForPicker } from "@/server/children/queries";
import { observeLookups } from "@/server/entries/lookups";

export const metadata: Metadata = { title: strings.entries.observe.title };

/** Quick observation (M2-02, 04-ui-spec § Quick observation; target ≤ 15 s). */
export default async function ObservePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireScreen("entry.create");
  const { child } = await searchParams;

  const [children, lookups] = await Promise.all([
    listChildrenForPicker(user),
    observeLookups(user),
  ]);

  // Opening from a profile pre-selects that child (04-ui-spec § Quick observation).
  const requested = Array.isArray(child) ? child[0] : child;
  const initialChildIds =
    requested && children.some((row) => row.id === requested) ? [requested] : [];

  return (
    <>
      <PageHeader title={strings.entries.observe.title} />
      <ObserveForm childList={children} lookups={lookups} initialChildIds={initialChildIds} />
    </>
  );
}
