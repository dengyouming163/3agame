import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getStorage } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const articleId = parseInt(id, 10);

    const result = await query(
      `SELECT a.id, a.game_id, a.title, a.slug, a.content, a.summary, a.cover_image_key,
        a.status, a.language, a.meta_title, a.meta_description, a.keywords, a.author,
        a.published_at, a.scheduled_at, a.created_at, a.updated_at,
        g.name as game_name, g.slug as game_slug
       FROM articles a
       LEFT JOIN games g ON a.game_id = g.id
       WHERE a.id = $1`,
      [articleId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    const article = result.rows[0];

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

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        setClauses.push(`${field} = $${paramIdx++}`);
        values.push(body[field]);
      }
    }

    // If publishing, set published_at
    if (body.status === 'published' && !body.published_at) {
      setClauses.push(`published_at = $${paramIdx++}`);
      values.push(new Date().toISOString());
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    values.push(articleId);
    const result = await query(
      `UPDATE articles SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIdx} RETURNING id`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      article: { id: result.rows[0].id },
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

    // Delete related queue items first
    await query('DELETE FROM publish_queue WHERE article_id = $1', [articleId]);

    // Delete the article
    const result = await query('DELETE FROM articles WHERE id = $1 RETURNING id', [articleId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      );
    }

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
