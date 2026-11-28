import { ListPageSkeleton } from "@/components/list-page-skeleton";

export default function FeedbackLoading() {
  return <ListPageSkeleton filters={2} rows={4} />;
}
