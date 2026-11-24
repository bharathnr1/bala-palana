import { redirect } from "next/navigation";

/** 04-ui-spec names this screen `/fees/pending`; the bare route forwards to it. */
export default function FeesPage() {
  redirect("/fees/pending");
}
