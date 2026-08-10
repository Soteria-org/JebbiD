import { LegalLayout } from "@/components/legal/LegalLayout";
import { TERMS_SECTIONS, TERMS_CONTACT, TERMS_INTRO, TERMS_EFFECTIVE_DATE, TERMS_LAST_UPDATED } from "@/content/legalTerms";

export const metadata = {
  title: "Terms and Conditions",
  description: "The terms and conditions governing use of the Jebbidox Youth Investment Club System.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms and Conditions"
      effectiveDate={TERMS_EFFECTIVE_DATE}
      lastUpdated={TERMS_LAST_UPDATED}
      intro={TERMS_INTRO}
      sections={TERMS_SECTIONS}
      contact={TERMS_CONTACT}
    />
  );
}
