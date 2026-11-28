import { ListPageSkeleton } from "@/components/list-page-skeleton";

export default function AttentionLoading() {
  return <ListPageSkeleton description filters={3} rows={5} />;
}
