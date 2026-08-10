// Content for /terms — see legalPrivacy.js for the shared rendering approach.
// Section 19 (Governing Law) is stated directly as Uganda rather than the
// source template's conditional "where JEBBIDOX operates in Uganda" phrasing,
// since that's already an established fact elsewhere on the site (structured
// data in app/layout.js sets addressCountry: "UG").
export const TERMS_EFFECTIVE_DATE = "August 10, 2026";
export const TERMS_LAST_UPDATED = "August 10, 2026";

export const TERMS_INTRO =
  "These Terms and Conditions govern your use of the Jebbidox Youth Investment Club System. By registering for an account or using the System, you agree to comply with these Terms.";

export const TERMS_SECTIONS = [
  {
    id: "acceptance",
    heading: "1. Acceptance of Terms",
    blocks: [
      { type: "p", text: "These Terms and Conditions (“Terms”) govern your use of the Jebbidox Youth Investment Club System." },
      { type: "p", text: "By registering for an account, accessing the System, or using any of its services, you agree to comply with these Terms." },
      { type: "p", text: "If you do not agree with these Terms, you should not use the System." },
    ],
  },
  {
    id: "about-the-system",
    heading: "2. About the System",
    blocks: [
      { type: "p", text: "The System is designed to assist members in managing and monitoring their participation in the investment club." },
      { type: "p", text: "Depending on the features available, the System may allow members to:" },
      { type: "ul", items: [
        "Register and manage their profiles.",
        "Make or record savings contributions.",
        "Monitor investments.",
        "View transactions.",
        "Track financial targets.",
        "View shareholding information.",
        "Manage loan information.",
        "Receive club communications.",
        "Access account statements and reports.",
      ] },
      { type: "p", text: "The exact services available may change from time to time." },
    ],
  },
  {
    id: "membership",
    heading: "3. Membership",
    blocks: [
      { type: "p", text: "To become a member, you may be required to provide accurate and complete information." },
      { type: "p", text: "You agree to:" },
      { type: "ul", items: [
        "Provide truthful information.",
        "Keep your information up to date.",
        "Maintain the confidentiality of your account.",
        "Follow the club's constitution, policies, resolutions, and procedures.",
        "Comply with applicable laws and regulations.",
      ] },
      { type: "p", text: "Membership may be subject to approval and any eligibility requirements established by the club." },
    ],
  },
  {
    id: "user-accounts",
    heading: "4. User Accounts",
    blocks: [
      { type: "p", text: "Each user should maintain only the account assigned to them unless otherwise authorized." },
      { type: "p", text: "You are responsible for all activity conducted through your account." },
      { type: "p", text: "You must immediately notify the club or System administrator if:" },
      { type: "ul", items: [
        "Your account is compromised.",
        "You lose access to your credentials.",
        "You notice an unauthorized transaction.",
        "You identify inaccurate information in your account.",
      ] },
    ],
  },
  {
    id: "savings-contributions",
    heading: "5. Savings and Contributions",
    blocks: [
      { type: "p", text: "Members may be required to make contributions according to the club's approved contribution structure." },
      { type: "p", text: "The System may record:" },
      { type: "ul", items: ["Contribution amounts.", "Dates of contributions.", "Contribution status.", "Member balances.", "Applicable targets."] },
      { type: "p", text: "Any minimum contributions, deadlines, penalties, withdrawal rules, or other requirements shall be determined by the club's applicable policies, constitution, resolutions, or agreements." },
    ],
  },
  {
    id: "investments",
    heading: "6. Investments",
    blocks: [
      { type: "p", text: "Investment activities conducted through or recorded by the System are subject to the club's investment policies and applicable laws." },
      { type: "p", text: "Past investment performance does not guarantee future results." },
      { type: "p", text: "Unless expressly stated otherwise in a legally binding document, the System does not guarantee:" },
      { type: "ul", items: ["Investment profits.", "A particular rate of return.", "Preservation of capital.", "Future investment performance."] },
      { type: "p", text: "Members should carefully consider the risks associated with investments before committing funds." },
    ],
  },
  {
    id: "loans",
    heading: "7. Loans",
    blocks: [
      { type: "p", text: "Where the System provides loan-management functionality, loan applications and approvals shall be subject to the club's applicable loan policies." },
      { type: "p", text: "The System may record:" },
      { type: "ul", items: ["Loan applications.", "Approved amounts.", "Repayment schedules.", "Interest or applicable charges.", "Outstanding balances.", "Repayment history."] },
      { type: "p", text: "Submitting a loan application does not guarantee approval." },
    ],
  },
  {
    id: "transactions-records",
    heading: "8. Transactions and Records",
    blocks: [
      { type: "p", text: "Users are responsible for reviewing their account information and transaction records." },
      { type: "p", text: "If you identify an error, you should notify the club promptly." },
      { type: "p", text: "The club may investigate disputed transactions before making corrections." },
      { type: "p", text: "System records may be used as part of the club's administrative, accounting, auditing, and financial records, subject to applicable law." },
    ],
  },
  {
    id: "payments",
    heading: "9. Payments",
    blocks: [
      { type: "p", text: "Where online payments are supported, payments may be processed through third-party payment providers." },
      { type: "p", text: "The club may not be responsible for failures caused by:" },
      { type: "ul", items: ["Mobile money networks.", "Banks.", "Payment processors.", "Internet service providers.", "Device failures.", "Other third-party infrastructure outside the club's reasonable control."] },
    ],
  },
  {
    id: "user-responsibilities",
    heading: "10. User Responsibilities",
    blocks: [
      { type: "p", text: "You agree not to:" },
      { type: "ul", items: [
        "Use another person's account without authorization.",
        "Provide false or misleading information.",
        "Attempt to gain unauthorized access to the System.",
        "Interfere with the operation of the System.",
        "Introduce malware, viruses, or other harmful code.",
        "Attempt to manipulate financial or membership records.",
        "Use the System for unlawful activities.",
        "Copy, reproduce, distribute, or commercially exploit System content without authorization.",
        "Attempt to bypass security controls.",
      ] },
    ],
  },
  {
    id: "system-availability",
    heading: "11. System Availability",
    blocks: [
      { type: "p", text: "We will make reasonable efforts to keep the System available and functional." },
      { type: "p", text: "However, access may occasionally be interrupted because of:" },
      { type: "ul", items: [
        "Maintenance.",
        "Software updates.",
        "Security incidents.",
        "Network problems.",
        "Server or hosting failures.",
        "Third-party service interruptions.",
        "Circumstances beyond our reasonable control.",
      ] },
      { type: "p", text: "We do not guarantee uninterrupted or error-free access to the System." },
    ],
  },
  {
    id: "accuracy",
    heading: "12. Accuracy of Information",
    blocks: [
      { type: "p", text: "We aim to maintain accurate information within the System." },
      { type: "p", text: "However, users should verify important financial information and report suspected errors promptly." },
      { type: "p", text: "The System should not be treated as a substitute for official financial statements, agreements, club resolutions, or other legally binding records where such records are required." },
    ],
  },
  {
    id: "intellectual-property",
    heading: "13. Intellectual Property",
    blocks: [
      { type: "p", text: "Unless otherwise stated, the System, including its software, design, branding, graphics, text, logos, and other content, belongs to or is licensed to the club or its technology providers." },
      { type: "p", text: "You may not reproduce, modify, distribute, sell, or commercially exploit System content without appropriate authorization." },
    ],
  },
  {
    id: "privacy",
    heading: "14. Privacy",
    blocks: [
      { type: "p", text: "Your use of the System is also governed by our Privacy Policy, which explains how your personal information is collected, used, stored, and protected." },
    ],
  },
  {
    id: "suspension-termination",
    heading: "15. Suspension or Termination",
    blocks: [
      { type: "p", text: "The club may suspend or terminate access to your account where reasonably necessary, including where:" },
      { type: "ul", items: [
        "You violate these Terms.",
        "You provide fraudulent or misleading information.",
        "Your account is involved in suspicious or unauthorized activity.",
        "Your membership ends.",
        "Suspension is required by law or a competent authority.",
        "The System is discontinued.",
      ] },
      { type: "p", text: "Termination of System access does not automatically cancel financial obligations or rights that arose before termination." },
    ],
  },
  {
    id: "limitation-of-liability",
    heading: "16. Limitation of Liability",
    blocks: [
      { type: "p", text: "To the extent permitted by applicable law, the club and System operators shall not be liable for losses arising from circumstances beyond their reasonable control, including third-party network failures, payment-provider failures, unauthorized access caused by compromised user credentials, or temporary System interruptions." },
      { type: "p", text: "Nothing in these Terms is intended to exclude liability that cannot legally be excluded." },
    ],
  },
  {
    id: "financial-risks",
    heading: "17. Financial and Investment Risks",
    blocks: [
      { type: "p", text: "You acknowledge that investments involve risks and that financial outcomes are not guaranteed." },
      { type: "p", text: "Before making investment decisions, members should consider their own financial circumstances and, where appropriate, seek independent professional advice." },
      { type: "p", text: "Information displayed through the System should not automatically be interpreted as personalized financial, investment, legal, or tax advice." },
    ],
  },
  {
    id: "changes-to-terms",
    heading: "18. Changes to the Terms",
    blocks: [
      { type: "p", text: "We may update these Terms from time to time." },
      { type: "p", text: "Where material changes are made, we may notify users through the System, email, or another appropriate communication channel." },
      { type: "p", text: "Continued use of the System after the effective date of updated Terms may constitute acceptance of the revised Terms, to the extent permitted by applicable law." },
    ],
  },
  {
    id: "governing-law",
    heading: "19. Governing Law",
    blocks: [
      { type: "p", text: "These Terms shall be interpreted and applied in accordance with the laws of the Republic of Uganda, subject to any mandatory legal requirements." },
    ],
  },
  {
    id: "dispute-resolution",
    heading: "20. Dispute Resolution",
    blocks: [
      { type: "p", text: "Members are encouraged to first attempt to resolve disputes through the club's internal complaint and dispute-resolution procedures." },
      { type: "p", text: "Where a dispute cannot be resolved internally, it may be referred to the appropriate legal, regulatory, mediation, arbitration, or judicial process in accordance with applicable law and the club's governing documents." },
    ],
  },
  {
    id: "acknowledgement",
    heading: "21. Acknowledgement",
    blocks: [
      { type: "p", text: "By creating an account or using the System, you acknowledge that:" },
      { type: "ul", items: [
        "You have read and understood these Terms and Conditions.",
        "You agree to comply with the Terms.",
        "You have read and understood the Privacy Policy.",
        "You understand that investments involve financial risk.",
        "You are responsible for keeping your account credentials secure.",
        "You will provide accurate information when using the System.",
      ] },
    ],
  },
];

export const TERMS_CONTACT = { heading: "22. Contact Information" };
