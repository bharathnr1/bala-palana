import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { EnquiryForm } from "@/features/admissions/enquiry-form";
import { todayISO } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { admissionOptions } from "@/server/admissions/queries";
import { requireScreen } from "@/server/auth/guards";

export const metadata: Metadata = { title: strings.admissions.enquiry.title };

/** Create an enquiry (M5-02): applicant, guardian and admission in one save. */
export default async function NewAdmissionPage() {
  const user = await requireScreen("admission.write");
  const options = await admissionOptions(user);

  return (
    <>
      <PageHeader title={strings.admissions.enquiry.title} />
      <EnquiryForm options={options} today={todayISO()} />
    </>
  );
}
