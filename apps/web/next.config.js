/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* Enable experimental features for Next.js 15 */
  experimental: {
    // serverActions: true, // Enabled by default in v15
  },
  // Security Headers for Healthcare App
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/profile",
        destination: "/profile",
        permanent: true,
      },
      {
        source: "/dashboard/settings",
        destination: "/profile",
        permanent: true,
      },
      {
        source: "/dashboard/notifications",
        destination: "/profile",
        permanent: true,
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    config.optimization = {
      ...config.optimization,
      sideEffects: true,
    };
    if (!dev) {
      config.cache = false; // Disable disk caching to prevent ENOSPC
    }
    return config;
  },
  // Sentry configurations
  sentry: {
    hideSourceMaps: true,
    widenClientFileUpload: false,
    disableServerWebpackPlugin: true,
    disableClientWebpackPlugin: true,
  },
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(
  withBundleAnalyzer(nextConfig),
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    org: process.env.SENTRY_ORG || "maate-health",
    project: process.env.SENTRY_PROJECT || "maate-web",

    // Only print logs for uploading source maps in CI
    silent: true,

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: false,

    // Hides source maps from generated client bundles
    hideSourceMaps: true,
  }
);

