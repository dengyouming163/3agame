import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils';
import { query } from '@/lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/guides`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/games`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Fetch dynamic pages directly from database (avoids self-referencing API calls)
  try {
    const gamePages: MetadataRoute.Sitemap = [];
    const articlePages: MetadataRoute.Sitemap = [];

    const gamesResult = await query(
      'SELECT slug, updated_at FROM games ORDER BY id',
      []
    );
    for (const game of gamesResult.rows) {
      gamePages.push({
        url: `${baseUrl}/games/${game.slug}`,
        lastModified: new Date(game.updated_at || Date.now()),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }

    const articlesResult = await query(
      "SELECT slug, updated_at, published_at FROM articles WHERE status = 'published' ORDER BY id",
      []
    );
    for (const article of articlesResult.rows) {
      articlePages.push({
        url: `${baseUrl}/guides/${article.slug}`,
        lastModified: new Date(article.updated_at || article.published_at || Date.now()),
        changeFrequency: 'monthly',
        priority: 0.8,
      });
    }

    return [...staticPages, ...gamePages, ...articlePages];
  } catch {
    return staticPages;
  }
}
