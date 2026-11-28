import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  AddEventForm,
  ChangeStatusForm,
  ConvertToStudentForm,
  NextActionForm,
} from "@/features/admissions/admission-forms";
import { AdmissionTimeline } from "@/features/admissions/admission-timeline";
import { formatDate, formatDateOrDash, isOverdue, todayISO } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { admissionOptions, getAdmission } from "@/server/admissions/queries";
import { requireScreen } from "@/server/auth/guards";
import { childLookups } from "@/server/children/queries";

export const metadata: Metadata = { title: strings.nav.admissions };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border py-2 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

/** One enquiry: family, contact, history and the actions on it (M5-02). */
export default async function AdmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireScreen("admission.read");
  const { id } = await params;
  const admission = await getAdmission(user, id);
  if (!admission) notFound();

  const options = await admissionOptions(user);
  const canWrite = can(user, "admission.write");
  const overdue = admission.followUpOn ? isOverdue(admission.followUpOn) : false;
  // Conversion is a one-way step for an applicant; a student's history is
  // read-only here (M5-03).
  const canConvert = canWrite && admission.stage === "applicant";
  const convertLookups = canConvert ? await childLookups() : null;

  return (
    <>
      <Link
        href="/admissions"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← {strings.admissions.detail.back}
      </Link>

      <div className="mt-2">
        <PageHeader
          title={admission.childName}
          description={admission.preferredName ?? undefined}
          actions={
            <Button asChild variant="outline" className="h-11">
              <Link href={`/children/${admission.childId}?tab=admission`}>
                {strings.admissions.detail.profile}
              </Link>
            </Button>
          }
        />
      </div>

      <p className="mb-6 flex flex-wrap items-center gap-2">
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
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <section
          aria-labelledby="admission-family"
          className="rounded-xl border border-border p-4"
        >
          <h2 id="admission-family" className="mb-2 text-sm font-semibold">
            {strings.admissions.detail.family}
          </h2>
          <dl>
            <Row label={strings.admissions.enquiry.fields.dob}>
              {formatDateOrDash(admission.dob)}
            </Row>
          </dl>

          {admission.guardians.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {strings.admissions.detail.noGuardian}
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {admission.guardians.map((guardian, index) => (
                <li key={`${guardian.name}-${index}`} className="text-sm">
                  <span className="font-medium">{guardian.name}</span>
                  {guardian.relationLabel ? (
                    <span className="text-muted-foreground"> · {guardian.relationLabel}</span>
                  ) : null}
                  {guardian.phone ? (
                    <span className="block">
                      <a href={`tel:${guardian.phone}`} className="text-primary underline-offset-4 hover:underline">
                        {guardian.phone}
                      </a>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="admission-enquiry"
          className="rounded-xl border border-border p-4"
        >
          <h2 id="admission-enquiry" className="mb-2 text-sm font-semibold">
            {strings.admissions.detail.enquiry}
          </h2>
          <dl>
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
        </section>
      </div>

      <section aria-labelledby="admission-events" className="mt-6">
        <h2 id="admission-events" className="mb-3 text-sm font-semibold">
          {strings.admissions.detail.events}
        </h2>
        <AdmissionTimeline events={admission.events} />
      </section>

      {canWrite ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {convertLookups ? (
            <section className="rounded-xl border border-border p-4 lg:col-span-2">
              <ConvertToStudentForm
                admissionId={admission.id}
                today={todayISO()}
                grades={convertLookups.grades}
                groups={convertLookups.groups}
                consentRecorded={admission.consentGivenAt !== null}
              />
            </section>
          ) : null}

          <section className="rounded-xl border border-border p-4">
            <ChangeStatusForm
              // A new stage remounts the form, so its uncontrolled select
              // shows the stage the page now reports (M5-03).
              key={admission.statusKey}
              admissionId={admission.id}
              statuses={options.statuses}
              currentStatusKey={admission.statusKey}
            />
          </section>

          <section className="rounded-xl border border-border p-4">
            <AddEventForm admissionId={admission.id} />
          </section>

          <section className="rounded-xl border border-border p-4 lg:col-span-2">
            <NextActionForm
              admissionId={admission.id}
              nextAction={admission.nextAction}
              followUpOn={admission.followUpOn}
              assignedTo={admission.assignedToId}
              assignees={options.assignees}
            />
          </section>
        </div>
      ) : null}
    </>
  );
}
