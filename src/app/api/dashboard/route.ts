import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get article status counts
    const statusResult = await query(
      `SELECT status, COUNT(*)::int as count FROM articles GROUP BY status`
    );
    const articlesByStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      articlesByStatus[row.status] = row.count;
    }
    const totalArticles = Object.values(articlesByStatus).reduce((a, b) => a + b, 0);

    // Get total games count
    const gamesResult = await query('SELECT COUNT(*)::int as count FROM games');
    const totalGames = gamesResult.rows[0]?.count || 0;

    // Get queue status counts
    const queueResult = await query(
      `SELECT status, COUNT(*)::int as count FROM publish_queue GROUP BY status`
    );
    const queueByStatus: Record<string, number> = {};
    for (const row of queueResult.rows) {
      queueByStatus[row.status] = row.count;
    }

    // Get recent articles with game info
    const recentResult = await query(
      `SELECT a.id, a.game_id, a.title, a.slug, a.summary, a.status, a.author,
        a.published_at, a.created_at,
        g.name as game_name
       FROM articles a
       LEFT JOIN games g ON a.game_id = g.id
       ORDER BY a.created_at DESC
       LIMIT 5`
    );

    // Get top games by article count
    const topGamesResult = await query(
      `SELECT g.name, g.slug, COUNT(a.id)::int as article_count
       FROM games g
       JOIN articles a ON g.id = a.game_id
       GROUP BY g.id
       ORDER BY article_count DESC
       LIMIT 5`
    );

    // Get today's published count
    const todayResult = await query(
      `SELECT COUNT(*)::int as count FROM articles
       WHERE status = 'published' AND published_at >= CURRENT_DATE`
    );
    const todayPublished = todayResult.rows[0]?.count || 0;

    // Get this week's generated count
    const weekResult = await query(
      `SELECT COUNT(*)::int as count FROM articles
       WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)`
    );
    const weekGenerated = weekResult.rows[0]?.count || 0;

    return NextResponse.json({
      stats: {
        totalArticles,
        articlesByStatus,
        totalGames,
        queueByStatus,
        todayPublished,
        weekGenerated,
      },
      topGames: topGamesResult.rows,
      recentArticles: recentResult.rows,
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
