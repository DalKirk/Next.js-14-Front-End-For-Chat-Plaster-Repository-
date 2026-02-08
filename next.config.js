/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Updated configuration using remotePatterns instead of domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'videochat-avatars.b-cdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Silence Next 16 build error by declaring empty Turbopack config
  turbopack: {},
  webpack: (config) => {
    // Handle Three.js examples imports (fallback for when Webpack is used)
    config.resolve.alias = {
      ...config.resolve.alias,
      'three/examples/jsm': 'three/examples/jsm',
    };
    return config;
  },
  async redirects() {
    return [
      // Redirect removed dev/test pages to home
      { source: '/ai-test', destination: '/', permanent: false },
      { source: '/debug', destination: '/', permanent: false },
      { source: '/test-markdown', destination: '/', permanent: false },
      { source: '/troubleshooting', destination: '/', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig