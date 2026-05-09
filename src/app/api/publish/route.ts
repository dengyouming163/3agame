import { NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

export async function POST() {
  try {
    const client = getClient();

    // Find all pending queue items that are due
    const now = new Date().toISOString();
    const { data: dueItems, error: fetchError } = await client
      .from('publish_queue')
      .select('id, article_id, scheduled_at, attempts')
      .eq('status', 'pending')
      .lte('scheduled_at', now)
      .lt('attempts', 3)
      .order('scheduled_at', { ascending: true })
      .limit(10);
    if (fetchError) throw new Error(`Failed to fetch due items: ${fetchError.message}`);

    if (!dueItems || dueItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No articles due for publishing',
        published: 0,
      });
    }

    let publishedCount = 0;
    const errors: string[] = [];

    for (const item of dueItems) {
      try {
        // Update article status to published
        const { error: articleUpdateError } = await client
          .from('articles')
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', item.article_id)
          .neq('status', 'published');
        if (articleUpdateError) throw articleUpdateError;

        // Update queue item status
        const { error: queueUpdateError } = await client
          .from('publish_queue')
          .update({ status: 'published', last_attempt_at: new Date().toISOString() })
          .eq('id', item.id);
        if (queueUpdateError) throw queueUpdateError;

        publishedCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Article ${item.article_id}: ${msg}`);

        // Increment attempts and update status
        const newAttempts = (item.attempts || 0) + 1;
        const newStatus = newAttempts >= 3 ? 'failed' : 'pending';
        await client
          .from('publish_queue')
          .update({ attempts: newAttempts, last_attempt_at: new Date().toISOString(), status: newStatus })
          .eq('id', item.id);
      }
    }

    return NextResponse.json({
      success: true,
      published: publishedCount,
      total: dueItems.length,
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
