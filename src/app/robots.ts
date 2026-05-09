import type { MetadataRoute } from 'next';
import { getBaseUrl } from '@/lib/utils';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

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
