import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { ChildForm } from "@/features/children/child-form";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";
import { updateChild } from "@/server/children/actions";
import { childLookups, currentAcademicYear, getChild } from "@/server/children/queries";

/** Edit the basic fields, the primary guardian and the current enrolment (M0-08). */
export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireScreen("child.write");
  const { id } = await params;

  const [profile, options, academicYear] = await Promise.all([
    getChild(user, id),
    childLookups(),
    currentAcademicYear(),
  ]);
  if (!profile) notFound();

  return (
    <>
      <PageHeader title={strings.children.edit} description={profile.fullName} />
      <ChildForm
        action={updateChild}
        cancelHref={`/children/${profile.id}`}
        options={options}
        values={{
          id: profile.id,
          fullName: profile.fullName,
          preferredName: profile.preferredName ?? "",
          dob: profile.dob ?? "",
          stage: profile.stage,
          joinedOn: profile.joinedOn ?? "",
          notes: profile.notes ?? "",
          consentGivenAt: profile.consentGivenAt !== null,
          guardianName: profile.primaryGuardian?.name ?? "",
          guardianPhone: profile.primaryGuardian?.phone ?? "",
          relationKey: profile.primaryGuardian?.relationKey ?? "",
          academicYear: profile.enrolment?.academicYear ?? academicYear,
          gradeKey: profile.enrolment?.gradeKey ?? "",
          groupKey: profile.enrolment?.groupKey ?? "",
          outsideSchool: profile.enrolment?.outsideSchool ?? "",
        }}
      />
    </>
  );
}
