/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output keeps the eventual Docker image small.
  output: 'standalone',
};

export default nextConfig;
