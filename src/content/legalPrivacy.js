// Content for /privacy. Kept as data (not JSX) so LegalLayout can render
// both legal documents through one consistent typography pass. Wherever the
// source template asked for club-specific detail (name, address, contact
// email, governing jurisdiction) it's filled in with the information already
// published elsewhere on the site (app/page.js footer, app/layout.js
// structured data, src/lib/constants.js) rather than left as a bracketed
// placeholder in a live legal document.
export const PRIVACY_EFFECTIVE_DATE = "August 10, 2026";
export const PRIVACY_LAST_UPDATED = "August 10, 2026";

export const PRIVACY_INTRO =
  "This Privacy Policy explains how Jebbidox Youth Investment Club collects, uses, stores, protects and discloses information when you use our website, mobile application, dashboard and related services.";

export const PRIVACY_SECTIONS = [
  {
    id: "introduction",
    heading: "1. Introduction",
    blocks: [
      { type: "p", text: "Welcome to Jebbidox Youth Investment Club (“Jebbidox”, “we”, “us”, or “our”). We are committed to protecting the privacy and security of information provided by our members and users (“you”, “your”, or “user”) when using our website, mobile application, dashboard, and related services (collectively, the “System”)." },
      { type: "p", text: "This Privacy Policy explains how we collect, use, store, protect, and disclose information when you use our System." },
      { type: "p", text: "By creating an account or using the System, you acknowledge that you have read and understood this Privacy Policy." },
    ],
  },
  {
    id: "information-we-collect",
    heading: "2. Information We Collect",
    blocks: [
      { type: "p", text: "Depending on how you use the System, we may collect:" },
      { type: "p", text: "A. Personal Information" },
      { type: "ul", items: ["Full name", "Date of birth", "Gender, where required", "Telephone number", "Email address", "Residential or postal address", "National identification information where legally required", "Account username and password", "Profile information"] },
      { type: "p", text: "B. Financial and Transaction Information" },
      { type: "p", text: "Where applicable, we may collect information relating to:" },
      { type: "ul", items: ["Savings contributions", "Investment contributions", "Withdrawals", "Loans and repayments", "Shareholdings", "Transaction dates and amounts", "Payment methods", "Account balances", "Investment targets and performance records"] },
      { type: "p", text: "C. Technical Information" },
      { type: "p", text: "When you use the System, we may automatically collect:" },
      { type: "ul", items: ["IP address", "Device information", "Browser type", "Operating system", "Login and access times", "System activity and usage information", "Error logs and security information"] },
    ],
  },
  {
    id: "how-we-use",
    heading: "3. How We Use Your Information",
    blocks: [
      { type: "p", text: "We may use your information to:" },
      { type: "ul", items: [
        "Create and manage your membership account.",
        "Process and record savings, investments, loans, withdrawals, and other transactions.",
        "Maintain accurate financial and membership records.",
        "Verify your identity and membership.",
        "Communicate with you about your account and club activities.",
        "Provide statements, notifications, reminders, and reports.",
        "Improve the functionality and security of the System.",
        "Detect, prevent, and investigate fraud, unauthorized access, or other misuse.",
        "Comply with applicable laws, regulations, legal processes, and legitimate requests from authorities.",
        "Conduct internal administration, accounting, auditing, and reporting.",
        "Provide information about club meetings, programs, opportunities, and services.",
      ] },
    ],
  },
  {
    id: "how-we-protect",
    heading: "4. How We Protect Your Information",
    blocks: [
      { type: "p", text: "We take reasonable technical and organizational measures to protect your information against unauthorized access, alteration, disclosure, loss, or destruction." },
      { type: "p", text: "These measures may include:" },
      { type: "ul", items: ["Password protection", "Access controls", "User authentication", "Secure data storage", "Regular system monitoring", "Administrative controls", "Security updates and backups"] },
      { type: "p", text: "However, no electronic system can be guaranteed to be completely secure. You acknowledge that you use the System with an understanding of the inherent risks associated with transmitting and storing information electronically." },
    ],
  },
  {
    id: "passwords",
    heading: "5. Passwords and Account Security",
    blocks: [
      { type: "p", text: "You are responsible for maintaining the confidentiality of your username, password, PIN, or other account credentials." },
      { type: "p", text: "You should:" },
      { type: "ul", items: ["Use a strong and unique password.", "Never share your password with another person.", "Log out after using the System on a shared device.", "Immediately notify the club or System administrator if you suspect unauthorized access."] },
      { type: "p", text: "We will not be responsible for losses resulting from your intentional or negligent disclosure of your account credentials." },
    ],
  },
  {
    id: "sharing",
    heading: "6. Sharing of Information",
    blocks: [
      { type: "p", text: "We do not sell your personal information." },
      { type: "p", text: "We may share information where reasonably necessary with:" },
      { type: "ul", items: [
        "Authorized club administrators and officers.",
        "Service providers who help operate or maintain the System.",
        "Payment processors and financial service providers where necessary to process transactions.",
        "Auditors, accountants, or professional advisers.",
        "Government authorities or regulators where legally required.",
        "Law enforcement agencies where required by law or lawful process.",
      ] },
      { type: "p", text: "We will seek to limit disclosure to information reasonably necessary for the relevant purpose." },
    ],
  },
  {
    id: "financial-information",
    heading: "7. Financial Information",
    blocks: [
      { type: "p", text: "The System may display information relating to your savings, investments, shares, loans, transactions, and account balances." },
      { type: "p", text: "You understand that such information is provided for account management and record-keeping purposes." },
      { type: "p", text: "The System does not guarantee investment returns, profits, or the future performance of any investment unless expressly stated in an official club document and permitted by applicable law." },
    ],
  },
  {
    id: "cookies",
    heading: "8. Cookies and Similar Technologies",
    blocks: [
      { type: "p", text: "The System may use cookies or similar technologies to:" },
      { type: "ul", items: ["Maintain login sessions.", "Remember user preferences.", "Improve system functionality.", "Analyze system usage.", "Enhance security."] },
      { type: "p", text: "You may be able to control cookies through your browser or device settings." },
    ],
  },
  {
    id: "data-retention",
    heading: "9. Data Retention",
    blocks: [
      { type: "p", text: "We may retain your information for as long as reasonably necessary to:" },
      { type: "ul", items: [
        "Maintain your membership and transaction records.",
        "Provide the System and related services.",
        "Meet accounting, auditing, legal, regulatory, and reporting obligations.",
        "Resolve disputes.",
        "Prevent fraud and misuse.",
      ] },
      { type: "p", text: "When information is no longer required, it may be securely deleted, anonymized, or archived in accordance with applicable requirements." },
    ],
  },
  {
    id: "your-rights",
    heading: "10. Your Privacy Rights",
    blocks: [
      { type: "p", text: "Subject to applicable law, you may have the right to:" },
      { type: "ul", items: [
        "Request access to personal information we hold about you.",
        "Request correction of inaccurate information.",
        "Ask questions about how your information is being used.",
        "Request deletion of certain information where legally permitted.",
        "Withdraw certain consents where applicable.",
        "Raise a complaint concerning the handling of your personal information.",
      ] },
      { type: "p", text: "Some requests may be subject to legal, regulatory, contractual, or record-keeping requirements." },
    ],
  },
  {
    id: "third-party",
    heading: "11. Third-Party Services",
    blocks: [
      { type: "p", text: "The System may integrate with third-party services such as payment providers, communication platforms, hosting providers, analytics services, or other technology providers." },
      { type: "p", text: "Third-party services may have their own privacy policies and terms. We encourage users to review the applicable policies of those services." },
    ],
  },
  {
    id: "childrens-privacy",
    heading: "12. Children's Privacy",
    blocks: [
      { type: "p", text: "The System is intended for users who are legally permitted to participate in the club and its financial activities." },
      { type: "p", text: "Where participation by minors is permitted, appropriate consent and safeguards may be required." },
    ],
  },
  {
    id: "changes",
    heading: "13. Changes to This Privacy Policy",
    blocks: [
      { type: "p", text: "We may update this Privacy Policy from time to time to reflect changes in our services, technology, legal requirements, or business practices." },
      { type: "p", text: "Where appropriate, we will notify users of significant changes through the System or other available communication channels." },
    ],
  },
];

export const PRIVACY_CONTACT = { heading: "14. Contact Us" };
