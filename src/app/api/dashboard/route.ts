import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

export async function GET() {
  try {
    const client = getClient();

    // Get article status counts
    const { data: allArticles, error: articlesError } = await client
      .from('articles')
      .select('status');
    if (articlesError) throw new Error(`Failed to fetch articles: ${articlesError.message}`);

    const statusCounts: Record<string, number> = {};
    for (const row of (allArticles || [])) {
      const s = row.status as string;
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    }

    // Get total games count
    const { count: totalGames, error: gamesError } = await client
      .from('games')
      .select('*', { count: 'exact', head: true });
    if (gamesError) throw new Error(`Failed to count games: ${gamesError.message}`);

    // Get queue status counts
    const { data: allQueue, error: queueError } = await client
      .from('publish_queue')
      .select('status');
    if (queueError) throw new Error(`Failed to fetch queue: ${queueError.message}`);

    const queueCounts: Record<string, number> = {};
    for (const row of (allQueue || [])) {
      const s = row.status as string;
      queueCounts[s] = (queueCounts[s] || 0) + 1;
    }

    // Get recent articles with game info
    const { data: recentArticles, error: recentError } = await client
      .from('articles')
      .select('id, game_id, title, slug, content, summary, cover_image_key, status, language, meta_title, meta_description, keywords, author, published_at, scheduled_at, created_at, updated_at, games(name)')
      .order('created_at', { ascending: false })
      .limit(5);
    if (recentError) throw new Error(`Failed to fetch recent articles: ${recentError.message}`);

    const flattenedArticles = (recentArticles || []).map((row: Record<string, unknown>) => {
      const gameData = row.games as { name: string } | null;
      const { games: _games, ...rest } = row;
      return {
        ...rest,
        game_name: gameData?.name || null,
      };
    });

    return NextResponse.json({
      stats: {
        totalArticles: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        articlesByStatus: statusCounts,
        totalGames: totalGames || 0,
        queueByStatus: queueCounts,
      },
      recentArticles: flattenedArticles,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Dashboard stats error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
