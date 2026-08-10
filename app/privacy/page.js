import { LegalLayout } from "@/components/legal/LegalLayout";
import { PRIVACY_SECTIONS, PRIVACY_CONTACT, PRIVACY_INTRO, PRIVACY_EFFECTIVE_DATE, PRIVACY_LAST_UPDATED } from "@/content/legalPrivacy";

export const metadata = {
  title: "Privacy Policy",
  description: "How Jebbidox Youth Investment Club collects, uses, stores, protects and discloses your information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      effectiveDate={PRIVACY_EFFECTIVE_DATE}
      lastUpdated={PRIVACY_LAST_UPDATED}
      intro={PRIVACY_INTRO}
      sections={PRIVACY_SECTIONS}
      contact={PRIVACY_CONTACT}
    />
  );
}
