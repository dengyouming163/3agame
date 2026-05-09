import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'localhost:5000';
  const protocol = domain.startsWith('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${domain}`;

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
