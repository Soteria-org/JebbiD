const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.jebbidox.site";

export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/portal", "/auth"] },
    ],
    sitemap: SITE_URL + "/sitemap.xml",
  };
}
