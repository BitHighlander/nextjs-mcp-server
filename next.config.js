/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverMinification: false // Helps with Server-Sent Events
  }
};

module.exports = nextConfig;
