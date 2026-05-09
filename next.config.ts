import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Cloudflare Pages compatibility: use standalone output
  // When deploying to CF Pages, use @cloudflare/next-on-pages which handles this
  // outputFileTracingRoot: path.resolve(__dirname, '../../'),
  images: {
    // Disable Next.js Image Optimization - we use object storage + CDN instead
    // This is important for Cloudflare Pages compatibility
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },

  // Headers for CDN caching
  async headers() {
    return [
      {
        // Static assets: cache for 1 year (immutable with content hash)
        source: '/(.*)\\.(js|css|woff2|woff|ttf|ico|svg)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // HTML pages: short cache for freshness
        source: '/(.*)\\.html$',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Guide pages: cache 10 minutes on CDN, 1 minute locally
        source: '/guides/:slug*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // Game pages: cache 1 hour on CDN
        source: '/games/:slug*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // API routes: no cache by default
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },

  // Security headers
  async redirects() {
    return [];
  },
};

export default nextConfig;
