import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const gameId = searchParams.get('gameId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;

    const client = getClient();

    // Build query for articles with game info via join
    let query = client
      .from('articles')
      .select('id, game_id, title, slug, content, summary, cover_image_key, status, language, meta_title, meta_description, keywords, author, published_at, scheduled_at, created_at, updated_at, games(name, slug)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (gameId) {
      query = query.eq('game_id', parseInt(gameId, 10));
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Failed to fetch articles: ${error.message}`);

    // Flatten the games relation
    const articles = (data || []).map((row: Record<string, unknown>) => {
      const gameData = row.games as { name: string; slug: string } | null;
      const { games: _games, ...rest } = row;
      return {
        ...rest,
        game_name: gameData?.name || null,
        game_slug: gameData?.slug || null,
      };
    });

    const total = count || 0;

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get articles error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      game_id,
      title,
      slug,
      content,
      summary,
      cover_image_key,
      status = 'draft',
      language = 'en',
      meta_title,
      meta_description,
      keywords,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'title and content are required' },
        { status: 400 }
      );
    }

    const client = getClient();
    const { data, error } = await client
      .from('articles')
      .insert({
        game_id,
        title,
        slug,
        content,
        summary,
        cover_image_key,
        status,
        language,
        meta_title,
        meta_description,
        keywords,
        author: 'AI Editor',
      })
      .select('id');
    if (error) throw new Error(`Failed to create article: ${error.message}`);

    return NextResponse.json({
      success: true,
      article: { id: data?.[0]?.id },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create article error:', message);
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    );
  }
}
