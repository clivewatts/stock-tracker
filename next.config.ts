import type { NextConfig } from "next";

// Determine if we're running in production
const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    domains: ["cdn.shopify.com"],
  },
  // Less strict error handling in production
  ...(isProduction && {
    // Ignore ESLint errors during builds
    eslint: {
      ignoreDuringBuilds: true,
    },
    // Ignore TypeScript errors during builds
    typescript: {
      ignoreBuildErrors: true,
    },
    // More efficient minification that's also more error-tolerant
    swcMinify: true,
    // Standalone output format
    output: 'standalone',
    // Allow more time for large builds before timing out
    experimental: {
      // Increase timeout for builds
      timeoutForInflight: 20000,
      // More forgiving transpiling
      forceSwcTransforms: true,
    },
  }),
};

export default nextConfig;
