import Link from "next/link";
import type { ReactNode } from "react";

import { formatDate, formatDateOrDash, isOverdue } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { AdmissionDetail } from "@/server/admissions/queries";

import { AdmissionTimeline } from "./admission-timeline";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-2 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** The Admission tab on a child's profile (M5-03): the enquiry and its history. */
export function AdmissionTab({ admission }: { admission: AdmissionDetail }) {
  const overdue = admission.followUpOn ? isOverdue(admission.followUpOn) : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs",
            admission.isTerminal
              ? "bg-muted text-muted-foreground"
              : "bg-secondary text-secondary-foreground",
          )}
        >
          {admission.statusLabel}
        </span>
        <Link
          href={`/admissions/${admission.id}`}
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          {strings.admissions.tab.open}
        </Link>
      </div>

      <dl className="rounded-xl border border-border p-4">
        <Row label={strings.admissions.detail.source}>
          {admission.sourceLabel ?? strings.admissions.detail.none}
        </Row>
        <Row label={strings.admissions.detail.enquiryOn}>
          {formatDate(admission.enquiryOn)}
        </Row>
        <Row label={strings.admissions.detail.interviewOn}>
          {formatDateOrDash(admission.interviewOn)}
        </Row>
        <Row label={strings.admissions.detail.owner}>
          {admission.assignedToName ?? strings.admissions.detail.unassigned}
        </Row>
        <Row label={strings.admissions.detail.nextAction}>
          {admission.nextAction ?? strings.admissions.detail.noNextAction}
        </Row>
        <Row label={strings.admissions.detail.followUp}>
          {admission.followUpOn ? (
            <span className={overdue ? "text-destructive" : undefined}>
              {formatDate(admission.followUpOn)}
            </span>
          ) : (
            strings.admissions.detail.noFollowUp
          )}
        </Row>
      </dl>

      <section aria-labelledby="admission-tab-events" className="space-y-2">
        <h2 id="admission-tab-events" className="text-sm font-semibold">
          {strings.admissions.tab.history}
        </h2>
        <AdmissionTimeline events={admission.events} />
      </section>
    </div>
  );
}
