/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Landing page photography lives in the Jebbidox Bloom brand library
    // rather than being committed as binary assets in the repo.
    remotePatterns: [{ protocol: "https", hostname: "www.trybloom.ai" }],
  },
  async headers() {
    // Applied to every route. script-src needs 'unsafe-inline' because
    // app/layout.js renders two inline <script> tags (the dark-mode-init
    // script and the JSON-LD block) — both come from fixed, non-user-
    // controlled strings, never request/user input, so this isn't an XSS
    // hole today, but it does mean the CSP can't fully block script
    // injection if one were ever introduced elsewhere. Tightening this
    // properly means moving those two scripts to a nonce-based CSP (a
    // per-request nonce threaded through middleware into layout.js) —
    // flagged as a follow-up, not done here to keep this change reviewable.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://www.trybloom.ai https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co https://vitals.vercel-insights.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
