/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for production
  output: 'standalone',
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude server-only modules from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        child_process: false,
      }
    }
    return config
  },

  // Performance optimizations
  experimental: {
    serverComponentsExternalPackages: ['googleapis'],
  },

  // Build optimizations
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
