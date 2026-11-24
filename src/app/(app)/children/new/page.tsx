import { PageHeader } from "@/components/page-header";
import { ChildForm } from "@/features/children/child-form";
import { strings } from "@/lib/strings";
import { requireScreen } from "@/server/auth/guards";
import { createChild } from "@/server/children/actions";
import { childLookups, currentAcademicYear } from "@/server/children/queries";

/** Add a child: basic fields, primary guardian and the current enrolment (M0-08). */
export default async function NewChildPage() {
  await requireScreen("child.write");

  const [options, academicYear] = await Promise.all([childLookups(), currentAcademicYear()]);

  return (
    <>
      <PageHeader title={strings.children.add} />
      <ChildForm
        action={createChild}
        cancelHref="/children"
        options={options}
        values={{
          fullName: "",
          preferredName: "",
          dob: "",
          stage: "student",
          joinedOn: "",
          notes: "",
          consentGivenAt: false,
          guardianName: "",
          guardianPhone: "",
          relationKey: "",
          academicYear,
          gradeKey: "",
          groupKey: "",
          outsideSchool: "",
        }}
      />
    </>
  );
}
