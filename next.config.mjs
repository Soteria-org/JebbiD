/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Landing page photography lives in the Jebbidox Bloom brand library
    // rather than being committed as binary assets in the repo.
    remotePatterns: [{ protocol: "https", hostname: "www.trybloom.ai" }],
  },
};

export default nextConfig;
