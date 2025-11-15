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
