import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

export async function GET() {
  try {
    const client = getClient();

    // Get queue items with article titles via join
    const { data, error } = await client
      .from('publish_queue')
      .select('id, article_id, scheduled_at, status, attempts, last_attempt_at, created_at, articles(title)')
      .order('scheduled_at', { ascending: true });
    if (error) throw new Error(`Failed to fetch schedule: ${error.message}`);

    const queue = (data || []).map((row: Record<string, unknown>) => {
      const articleData = row.articles as { title: string } | null;
      const { articles: _articles, ...rest } = row;
      return {
        ...rest,
        article_title: articleData?.title || 'Unknown',
      };
    });

    return NextResponse.json({ queue });
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

    const client = getClient();

    // Check if article exists and is in a valid state
    const { data: article, error: articleError } = await client
      .from('articles')
      .select('id, status, title')
      .eq('id', articleId)
      .maybeSingle();
    if (articleError) throw new Error(`Failed to fetch article: ${articleError.message}`);

    if (!article) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    if (article.status === 'published') {
      return NextResponse.json(
        { error: 'Article is already published' },
        { status: 400 }
      );
    }

    // Update article status and scheduled time
    const { error: updateError } = await client
      .from('articles')
      .update({ status: 'reviewed', scheduled_at: scheduledAt })
      .eq('id', articleId);
    if (updateError) throw new Error(`Failed to update article: ${updateError.message}`);

    // Add to publish queue
    const { data: queueData, error: queueError } = await client
      .from('publish_queue')
      .insert({ article_id: articleId, scheduled_at: scheduledAt, status: 'pending' })
      .select('id');
    if (queueError) throw new Error(`Failed to create queue item: ${queueError.message}`);

    return NextResponse.json({
      success: true,
      queueItem: { id: queueData?.[0]?.id },
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
