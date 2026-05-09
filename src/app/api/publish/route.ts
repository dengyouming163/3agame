import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST() {
  try {
    // Find all pending queue items that are due
    const dueResult = await query(
      `SELECT id, article_id, scheduled_at, attempts
       FROM publish_queue
       WHERE status = 'pending' AND scheduled_at <= NOW() AND attempts < 3
       ORDER BY scheduled_at ASC
       LIMIT 10`
    );

    if (dueResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No articles due for publishing',
        published: 0,
      });
    }

    let publishedCount = 0;
    const errors: string[] = [];

    for (const item of dueResult.rows) {
      try {
        // Update article status to published
        const articleResult = await query(
          `UPDATE articles SET status = 'published', published_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND status != 'published'
           RETURNING id`,
          [item.article_id]
        );

        if (articleResult.rows.length === 0) {
          throw new Error('Article already published or not found');
        }

        // Update queue item status
        await query(
          `UPDATE publish_queue SET status = 'published', last_attempt_at = NOW() WHERE id = $1`,
          [item.id]
        );

        publishedCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Article ${item.article_id}: ${msg}`);

        // Increment attempts and update status
        const newAttempts = (item.attempts || 0) + 1;
        const newStatus = newAttempts >= 3 ? 'failed' : 'pending';
        await query(
          `UPDATE publish_queue SET attempts = $1, last_attempt_at = NOW(), status = $2 WHERE id = $3`,
          [newAttempts, newStatus, item.id]
        );
      }
    }

    return NextResponse.json({
      success: true,
      published: publishedCount,
      total: dueResult.rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Publish error:', message);
    return NextResponse.json(
      { error: 'Failed to process publishing queue' },
      { status: 500 }
    );
  }
}
