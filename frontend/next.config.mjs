/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async rewrites() {
    return [];
  },
  /** Reduce flaky HMR / 500 on `/_next/static/*` on Windows (AV / long paths). */
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        aggregateTimeout: 600,
      };
      if (process.env.WATCHPACK_POLLING === "1") {
        config.watchOptions.poll = 1000;
      }
    }
    return config;
  },
};

export default nextConfig;
