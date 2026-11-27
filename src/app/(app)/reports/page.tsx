import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";

export const metadata: Metadata = { title: strings.nav.reports };

/**
 * The report index (design § 7). M4-04 adds the first card; the remaining
 * reports arrive in M8-02.
 */
export default async function ReportsPage() {
  await requireScreen("report.read");

  return (
    <>
      <PageHeader title={strings.reports.title} />

      <ul className="space-y-2">
        <li>
          <Link
            href="/reports/grade-summary"
            className="border-border hover:bg-muted block rounded-xl border p-4"
          >
            <span className="block font-medium">{strings.reports.gradeSummary.title}</span>
            <span className="text-muted-foreground block text-sm">
              {strings.reports.gradeSummary.hint}
            </span>
          </Link>
        </li>
      </ul>
    </>
  );
}
