import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { AdmissionsBoard } from "@/features/admissions/admissions-board";
import { can } from "@/lib/permissions";
import { strings } from "@/lib/strings";
import { admissionBoard } from "@/server/admissions/queries";
import { requireScreen } from "@/server/auth/guards";

export const metadata: Metadata = { title: strings.nav.admissions };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Admissions board (M5-02): stage tabs on mobile, kanban on desktop. */
export default async function AdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireScreen("admission.read");
  const params = await searchParams;
  const { columns, hasMore } = await admissionBoard(user);
  const canWrite = can(user, "admission.write");

  return (
    <>
      <PageHeader
        title={strings.nav.admissions}
        actions={
          canWrite ? (
            <Button asChild className="h-11">
              <Link href="/admissions/new">{strings.admissions.board.newEnquiry}</Link>
            </Button>
          ) : undefined
        }
      />

      {hasMore ? (
        <p className="mb-2 text-xs text-muted-foreground">
          {strings.admissions.board.showingFirst(
            columns.reduce((sum, column) => sum + column.rows.length, 0),
          )}
        </p>
      ) : null}

      <AdmissionsBoard
        columns={columns}
        activeStatusKey={first(params.status)}
        showTerminal={first(params.terminal) === "1"}
        canWrite={canWrite}
      />
    </>
  );
}
