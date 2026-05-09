import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(
      `SELECT pq.id, pq.article_id, pq.scheduled_at, pq.status, pq.attempts, pq.last_attempt_at, pq.created_at,
        a.title as article_title, a.status as article_status
       FROM publish_queue pq
       LEFT JOIN articles a ON pq.article_id = a.id
       ORDER BY pq.scheduled_at ASC`
    );

    // Get schedule stats
    const statsResult = await query(
      `SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
        COUNT(*) FILTER (WHERE status = 'published')::int as published,
        COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
        COUNT(*) FILTER (WHERE scheduled_at >= CURRENT_DATE AND scheduled_at < CURRENT_DATE + INTERVAL '1 day')::int as today_scheduled,
        COUNT(*) FILTER (WHERE scheduled_at >= CURRENT_DATE AND scheduled_at < CURRENT_DATE + INTERVAL '1 day' AND status = 'published')::int as today_published
       FROM publish_queue`
    );

    return NextResponse.json({
      queue: result.rows,
      scheduleStats: statsResult.rows[0] || { total: 0, pending: 0, published: 0, failed: 0, today_scheduled: 0, today_published: 0 },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get schedule error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, scheduledAt, dailySchedule } = body;

    // Daily auto-schedule mode: pick N reviewed articles and schedule them
    if (dailySchedule) {
      const { count = 3, startHour = 9, intervalHours = 3 } = dailySchedule;

      // Find reviewed articles not yet scheduled
      const reviewedResult = await query(
        `SELECT id, title FROM articles
         WHERE status = 'reviewed' AND id NOT IN (
           SELECT article_id FROM publish_queue WHERE status = 'pending'
         )
         ORDER BY created_at ASC
         LIMIT $1`,
        [count]
      );

      if (reviewedResult.rows.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No reviewed articles available for scheduling',
          scheduled: 0,
        });
      }

      const scheduled: { articleId: number; title: string; scheduledAt: string }[] = [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      for (let i = 0; i < reviewedResult.rows.length; i++) {
        const article = reviewedResult.rows[i];
        // Schedule starting from startHour today (or tomorrow if already past)
        let scheduledDate = new Date(today.getTime() + startHour * 3600000 + i * intervalHours * 3600000);

        // If the calculated time is in the past, schedule for tomorrow
        if (scheduledDate <= now) {
          scheduledDate = new Date(scheduledDate.getTime() + 86400000);
        }

        const scheduledAtISO = scheduledDate.toISOString();

        // Update article status and scheduled time
        await query(
          `UPDATE articles SET scheduled_at = $1, updated_at = NOW() WHERE id = $2`,
          [scheduledAtISO, article.id]
        );

        // Add to publish queue
        await query(
          `INSERT INTO publish_queue (article_id, scheduled_at, status) VALUES ($1, $2, 'pending')`,
          [article.id, scheduledAtISO]
        );

        scheduled.push({
          articleId: article.id,
          title: article.title,
          scheduledAt: scheduledAtISO,
        });
      }

      return NextResponse.json({
        success: true,
        scheduled: scheduled.length,
        items: scheduled,
        message: `Scheduled ${scheduled.length} articles for publishing`,
      });
    }

    // Single article schedule mode
    if (!articleId || !scheduledAt) {
      return NextResponse.json(
        { error: 'articleId and scheduledAt are required' },
        { status: 400 }
      );
    }

    // Check if article exists and is not already published
    const articleResult = await query(
      `SELECT id, status, title FROM articles WHERE id = $1`,
      [articleId]
    );

    if (articleResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    const article = articleResult.rows[0];
    if (article.status === 'published') {
      return NextResponse.json(
        { error: 'Article is already published' },
        { status: 400 }
      );
    }

    // Update article status and scheduled time
    await query(
      `UPDATE articles SET status = 'reviewed', scheduled_at = $1, updated_at = NOW() WHERE id = $2`,
      [scheduledAt, articleId]
    );

    // Add to publish queue
    const queueResult = await query(
      `INSERT INTO publish_queue (article_id, scheduled_at, status) VALUES ($1, $2, 'pending') RETURNING id`,
      [articleId, scheduledAt]
    );

    return NextResponse.json({
      success: true,
      queueItem: { id: queueResult.rows[0]?.id },
      message: `Article "${article.title}" scheduled for ${new Date(scheduledAt).toLocaleString()}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Schedule article error:', message);
    return NextResponse.json(
      { error: 'Failed to schedule' },
      { status: 500 }
    );
  }
}
