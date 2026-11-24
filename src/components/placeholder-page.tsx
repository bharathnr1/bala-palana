import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { strings } from "@/lib/strings";

/**
 * A routed screen that a later milestone fills in. It keeps every URL from
 * 01-conventions reachable, and gives the nav something real to link to.
 */
export function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState title={strings.placeholder.comingSoon} />
    </>
  );
}
