/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  async redirects() {
    return [
      // Redirect legacy/unused AI chat page to home
      { source: '/ai-chat', destination: '/', permanent: false },
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