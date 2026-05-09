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

    // Status distribution for charts
    const statusDistribution = Object.entries(articlesByStatus).map(([status, count]) => ({
      status,
      count,
    }));

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
        a.published_at, a.created_at, a.keywords,
        g.name as game_name, g.slug as game_slug
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

    // Generation success rate (from generation_logs)
    const genStatsResult = await query(
      `SELECT
        COUNT(*)::int as total_generated,
        COUNT(*) FILTER (WHERE article_id IS NOT NULL)::int as successful
       FROM generation_logs
       WHERE generated_at >= DATE_TRUNC('week', CURRENT_DATE)`
    );
    const genStats = genStatsResult.rows[0] || { total_generated: 0, successful: 0 };
    const generationSuccessRate = genStats.total_generated > 0
      ? Math.round((genStats.successful / genStats.total_generated) * 100)
      : 100;

    // Publishing trend: last 7 days (fill gaps with 0)
    const trendResult = await query(
      `SELECT
        DATE(published_at) as date,
        COUNT(*)::int as published_count
       FROM articles
       WHERE published_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(published_at)
       ORDER BY date ASC`
    );
    const publishTrendMap = new Map<string, number>();
    for (const row of trendResult.rows) {
      publishTrendMap.set(row.date, row.published_count);
    }
    const publishTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      publishTrend.push({ date: dateStr, count: publishTrendMap.get(dateStr) || 0 });
    }

    // Generation trend: last 7 days (fill gaps with 0)
    const genTrendResult = await query(
      `SELECT
        DATE(created_at) as date,
        COUNT(*)::int as generated_count
       FROM articles
       WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );
    const genTrendMap = new Map<string, number>();
    for (const row of genTrendResult.rows) {
      genTrendMap.set(row.date, row.generated_count);
    }
    const generationTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      generationTrend.push({ date: dateStr, count: genTrendMap.get(dateStr) || 0 });
    }

    // Articles needing review
    const reviewResult = await query(
      `SELECT COUNT(*)::int as count FROM articles WHERE status = 'generated'`
    );
    const pendingReview = reviewResult.rows[0]?.count || 0;

    // Articles ready to publish
    const readyResult = await query(
      `SELECT COUNT(*)::int as count FROM articles WHERE status = 'reviewed'`
    );
    const readyToPublish = readyResult.rows[0]?.count || 0;

    // Scheduled for today
    const todayScheduleResult = await query(
      `SELECT COUNT(*)::int as count FROM publish_queue
       WHERE status = 'pending' AND scheduled_at >= CURRENT_DATE AND scheduled_at < CURRENT_DATE + INTERVAL '1 day'`
    );
    const todayScheduled = todayScheduleResult.rows[0]?.count || 0;

    return NextResponse.json({
      stats: {
        totalArticles,
        articlesByStatus,
        totalGames,
        queueByStatus,
        todayPublished,
        weekGenerated,
        generationSuccessRate,
        pendingReview,
        readyToPublish,
        todayScheduled,
      },
      statusDistribution,
      topGames: topGamesResult.rows,
      recentArticles: recentResult.rows,
      publishTrend,
      generationTrend,
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
