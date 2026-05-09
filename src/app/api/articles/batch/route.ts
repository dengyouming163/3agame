import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

/**
 * POST /api/articles/batch - Batch review/publish/delete articles
 * Body: { action: 'review' | 'publish' | 'delete', ids: number[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ids } = body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'action and ids[] are required' },
        { status: 400 }
      );
    }

    const validActions = ['review', 'publish', 'delete'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    const placeholders = ids.map((_: number, i: number) => `$${i + 1}`).join(', ');
    let affected = 0;

    if (action === 'review') {
      // Only review generated articles
      const result = await query(
        `UPDATE articles SET status = 'reviewed', updated_at = NOW()
         WHERE id IN (${placeholders}) AND status = 'generated'
         RETURNING id`,
        ids
      );
      affected = result.rows.length;
    } else if (action === 'publish') {
      // Only publish reviewed articles, set published_at
      const result = await query(
        `UPDATE articles SET status = 'published', published_at = NOW(), updated_at = NOW()
         WHERE id IN (${placeholders}) AND status IN ('reviewed', 'generated')
         RETURNING id`,
        ids
      );
      affected = result.rows.length;

      // Remove from publish_queue if they were scheduled
      if (affected > 0) {
        const publishedIds = result.rows.map((r: { id: number }) => r.id);
        const queuePlaceholders = publishedIds.map((_: number, i: number) => `$${i + 1}`).join(', ');
        await query(
          `UPDATE publish_queue SET status = 'published', last_attempt_at = NOW()
           WHERE article_id IN (${queuePlaceholders}) AND status != 'published'`,
          publishedIds
        );
      }
    } else if (action === 'delete') {
      // Delete queue items first, then articles
      await query(
        `DELETE FROM publish_queue WHERE article_id IN (${placeholders})`,
        ids
      );
      const result = await query(
        `DELETE FROM articles WHERE id IN (${placeholders}) RETURNING id`,
        ids
      );
      affected = result.rows.length;
    }

    return NextResponse.json({
      success: true,
      action,
      affected,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Batch article action error:', message);
    return NextResponse.json(
      { error: 'Failed to process batch action' },
      { status: 500 }
    );
  }
}
