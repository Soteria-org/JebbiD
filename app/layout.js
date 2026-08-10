import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.jebbidox.site";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Jebbidox Youth Investment Club | Youth Investment Club, Uganda",
    template: "%s | Jebbidox Youth Investment Club",
  },
  description:
    "Jebbidox Youth Investment Club is a digital investment platform for young investors in Uganda. Track member contributions, investment records and account statements online, and manage your investment club membership digitally.",
  keywords: [
    "Jebbidox Youth Investment Club", "Jebbidox Investment Club", "youth investment club Uganda",
    "investment club Uganda", "youth savings and investment", "investment management",
    "digital investment platform", "investment tracking", "member investment records",
    "financial record keeping", "member contributions", "investment portfolio tracking",
  ],
  authors: [{ name: "Jebbidox Youth Investment Club" }],
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Jebbidox Youth Investment Club",
    title: "Jebbidox Youth Investment Club | Youth Investment Club, Uganda",
    description:
      "A digital investment platform for the Jebbidox Youth Investment Club — track contributions, investment records and account statements online.",
    locale: "en_UG",
  },
  twitter: {
    card: "summary",
    title: "Jebbidox Youth Investment Club",
    description: "A digital investment platform for the Jebbidox Youth Investment Club in Uganda.",
  },
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": SITE_URL + "/#organization",
      name: "Jebbidox Youth Investment Club",
      alternateName: "Jebbidox Investment Club",
      url: SITE_URL,
      description:
        "A youth-oriented investment club serving members of the Jebbidox Youth Investment Club with digital management of contributions, investment records and account information.",
      address: { "@type": "PostalAddress", addressLocality: "Kireka", addressCountry: "UG" },
    },
    {
      "@type": "WebSite",
      "@id": SITE_URL + "/#website",
      url: SITE_URL,
      name: "Jebbidox Youth Investment Club",
      publisher: { "@id": SITE_URL + "/#organization" },
      inLanguage: "en-UG",
    },
  ],
};

// Runs before React hydrates so a returning member in dark mode never sees a
// flash of the light passbook theme while the page boots.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("jbd-theme");
    var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,500&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
