import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(
      `SELECT pq.id, pq.article_id, pq.scheduled_at, pq.status, pq.attempts, pq.last_attempt_at, pq.created_at,
        a.title as article_title
       FROM publish_queue pq
       LEFT JOIN articles a ON pq.article_id = a.id
       ORDER BY pq.scheduled_at ASC`
    );

    return NextResponse.json({ queue: result.rows });
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
    const { articleId, scheduledAt } = body;

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
      { error: 'Failed to schedule article' },
      { status: 500 }
    );
  }
}
