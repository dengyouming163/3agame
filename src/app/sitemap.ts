import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'localhost:5000';
  const protocol = domain.startsWith('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${domain}`;

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

  // Fetch dynamic pages
  try {
    const [gamesRes, articlesRes] = await Promise.all([
      fetch(`${baseUrl}/api/games`, { next: { revalidate: 3600 } }),
      fetch(`${baseUrl}/api/articles?status=published&limit=100`, { next: { revalidate: 3600 } }),
    ]);

    const gamePages: MetadataRoute.Sitemap = [];
    const articlePages: MetadataRoute.Sitemap = [];

    if (gamesRes.ok) {
      const gamesData = await gamesRes.json();
      const games = gamesData.games || [];
      for (const game of games) {
        gamePages.push({
          url: `${baseUrl}/games/${game.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }

    if (articlesRes.ok) {
      const articlesData = await articlesRes.json();
      const articles = articlesData.articles || [];
      for (const article of articles) {
        articlePages.push({
          url: `${baseUrl}/guides/${article.slug}`,
          lastModified: article.published_at ? new Date(article.published_at) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.6,
        });
      }
    }

    return [...staticPages, ...gamePages, ...articlePages];
  } catch {
    return staticPages;
  }
}
