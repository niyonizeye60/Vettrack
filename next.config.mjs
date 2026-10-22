import { withSentryConfig } from "@sentry/nextjs/config"

// URLs that must stay out of search results. Sent as an X-Robots-Tag header rather
// than a <meta> tag because most of these pages are client components that can't
// export metadata, and Google reads the header before rendering anything.
// Don't also Disallow them in robots.txt: Google has to fetch a page to see its
// noindex, and a blocked URL can still be listed from links alone.
const NOINDEX_PATHS = [
  // JSON, not pages. Google still fetches it to render the storefronts, which load
  // their products from /api/services, so it is noindexed here, never blocked.
  "/api/:path*",
  "/checkout/:path*",
  "/booking/callback",
  "/connect/:path*",
  "/forgot-password",
  "/reset-password",
  "/maintenance",
  // Shown by the service worker when a phone has no connection.
  "/offline.html",
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      ...NOINDEX_PATHS.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      })),
      // Browsers check for a new service worker on each visit; make sure no cache on
      // the way hands them the old one.
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ]
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['images.unsplash.com', 'st5.depositphotos.com', 'img.magnific.com'],
    unoptimized: true,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Dashboards render server-side per request (force-dynamic) and reflect
    // state changed elsewhere (e.g. reading a chat). Without this, the client
    // Router Cache reuses a stale RSC payload for up to 30s on back/forward
    // and <Link> navigation, so those updates don't show until a hard reload.
    staleTimes: {
      dynamic: 0,
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        dns: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    // Exclude problematic MongoDB native modules
    config.externals = config.externals || [];
    config.externals.push({
      'mongodb-client-encryption': 'commonjs mongodb-client-encryption',
      '@mongodb-js/zstd': 'commonjs @mongodb-js/zstd',
      'kerberos': 'commonjs kerberos',
      'snappy': 'commonjs snappy',
    });
    return config;
  },
}

// Source maps are uploaded (so production stack traces are readable) only when SENTRY_AUTH_TOKEN
// is set - a build-time secret that lives in Vercel only. Without it the build still succeeds.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { deleteSourcemapsAfterUpload: true },
  webpack: { treeshake: { removeDebugLogging: true, removeTracing: true } },
})
