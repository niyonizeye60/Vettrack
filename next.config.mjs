/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['images.unsplash.com'],
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

export default nextConfig
