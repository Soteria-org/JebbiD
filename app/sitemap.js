const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.jebbidox.site";

export default function sitemap() {
  return [
    { url: SITE_URL + "/", lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: SITE_URL + "/privacy", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: SITE_URL + "/terms", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
