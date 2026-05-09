import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { getStorage } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const articleId = parseInt(id, 10);

    const client = getClient();
    const { data, error } = await client
      .from('articles')
      .select('id, game_id, title, slug, content, summary, cover_image_key, status, language, meta_title, meta_description, keywords, author, published_at, scheduled_at, created_at, updated_at, games(name, slug)')
      .eq('id', articleId)
      .maybeSingle();
    if (error) throw new Error(`Failed to fetch article: ${error.message}`);

    if (!data) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    // Flatten the games relation
    const gameData = data.games as unknown as { name: string; slug: string } | null;
    const { games: _games, ...articleFields } = data;
    const article = {
      ...articleFields,
      game_name: gameData?.name || null,
      game_slug: gameData?.slug || null,
    };

    // Generate signed URL for cover image if exists
    let coverImageUrl: string | null = null;
    if (article.cover_image_key) {
      try {
        const storage = getStorage();
        coverImageUrl = await storage.generatePresignedUrl({
          key: article.cover_image_key,
          expireTime: 86400,
        });
      } catch {
        // Ignore storage errors
      }
    }

    return NextResponse.json({
      article: {
        ...article,
        cover_image_url: coverImageUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get article error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const articleId = parseInt(id, 10);
    const body = await request.json();

    const allowedFields = [
      'title', 'content', 'summary', 'cover_image_key',
      'status', 'language', 'meta_title', 'meta_description',
      'keywords', 'scheduled_at', 'published_at',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // If publishing, set published_at
    if (updates.status === 'published' && !updates.published_at) {
      updates.published_at = new Date().toISOString();
    }

    const client = getClient();
    const { data, error } = await client
      .from('articles')
      .update(updates)
      .eq('id', articleId)
      .select('id');
    if (error) throw new Error(`Failed to update article: ${error.message}`);

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      article: { id: data[0].id },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Update article error:', message);
    return NextResponse.json(
      { error: 'Failed to update article' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const articleId = parseInt(id, 10);

    const client = getClient();

    // Delete related queue items first
    await client.from('publish_queue').delete().eq('article_id', articleId);

    // Delete the article
    const { error } = await client
      .from('articles')
      .delete()
      .eq('id', articleId);
    if (error) throw new Error(`Failed to delete article: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete article error:', message);
    return NextResponse.json(
      { error: 'Failed to delete article' },
      { status: 500 }
    );
  }
}
