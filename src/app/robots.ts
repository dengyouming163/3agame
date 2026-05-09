import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/'],
      },
      // Allow major search engine crawlers full access to content
      {
        userAgent: 'Googlebot',
        allow: ['/guides/', '/games/'],
      },
      {
        userAgent: 'Bingbot',
        allow: ['/guides/', '/games/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
