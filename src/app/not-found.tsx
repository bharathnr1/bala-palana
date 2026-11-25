import { NotFoundPage } from "@/components/not-found-page";

/** Unknown URLs never fall through to a bare framework page. */
export default function GlobalNotFound() {
  return <NotFoundPage />;
}
