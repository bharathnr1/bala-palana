import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ImportPanel } from "@/features/children/import-panel";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";

export const metadata: Metadata = { title: strings.children.import.title };

/** CSV import (M0-10): admin only, one transaction, duplicates skipped. */
export default async function ImportChildrenPage() {
  await requireScreen("child.import");

  return (
    <>
      <PageHeader
        title={strings.children.import.title}
        actions={
          <Button asChild variant="ghost" className="h-11">
            <Link href="/children">{strings.children.cancel}</Link>
          </Button>
        }
      />
      <ImportPanel />
    </>
  );
}
