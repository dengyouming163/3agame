import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getStorage } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const gameId = searchParams.get('gameId');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const offset = (page - 1) * limit;

    // Build WHERE clauses
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`a.status = $${paramIdx++}`);
      params.push(status);
    }
    if (gameId) {
      conditions.push(`a.game_id = $${paramIdx++}`);
      params.push(parseInt(gameId, 10));
    }
    if (type) {
      // Search in keywords array for guide type
      const typeMap: Record<string, string[]> = {
        boss: ['boss', 'fight', 'defeat', 'strategy', 'malenia', 'radahn'],
        build: ['build', 'class', 'loadout', 'weapon', 'gear', 'stat'],
        collectible: ['collectible', 'collect', 'location', 'find', 'item', 'armor'],
        walkthrough: ['walkthrough', 'guide', 'progress', 'chapter', 'mission', 'quest', 'complete'],
        tips: ['tip', 'trick', 'secret', 'hint', 'advice', 'hidden'],
      };
      const searchTerms = typeMap[type.toLowerCase()] || [type.toLowerCase()];
      const orConditions = searchTerms.map(term => {
        const p1 = paramIdx++;
        const p2 = paramIdx++;
        params.push(term, `%${term}%`);
        return `($${p1} = ANY(a.keywords) OR a.title ILIKE $${p2})`;
      });
      conditions.push(`(${orConditions.join(' OR ')})`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query
    const countResult = await query(
      `SELECT COUNT(*) as total FROM articles a ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // Data query with game join
    const dataResult = await query(
      `SELECT a.id, a.game_id, a.title, a.slug, a.content, a.summary, a.cover_image_key,
        a.status, a.language, a.meta_title, a.meta_description, a.keywords, a.author,
        a.published_at, a.scheduled_at, a.created_at, a.updated_at,
        g.name as game_name, g.slug as game_slug
       FROM articles a
       LEFT JOIN games g ON a.game_id = g.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    // Resolve cover_image_key → cover_image_url for each article
    const articlesWithUrls = await Promise.all(
      dataResult.rows.map(async (article: Record<string, unknown>) => {
        let coverImageUrl: string | null = null;
        if (article.cover_image_key) {
          try {
            const storage = getStorage();
            coverImageUrl = await storage.generatePresignedUrl({
              key: article.cover_image_key as string,
              expireTime: 604800, // 7 days for CDN-friendly URLs
            });
          } catch {
            // Ignore storage errors
          }
        }
        return { ...article, cover_image_url: coverImageUrl };
      })
    );

    return NextResponse.json({
      articles: articlesWithUrls,
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
      game_id, title, slug, content, summary, cover_image_key,
      status = 'draft', language = 'en', meta_title, meta_description, keywords,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const articleSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 200);

    const result = await query(
      `INSERT INTO articles (game_id, title, slug, content, summary, cover_image_key, status, language, meta_title, meta_description, keywords)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [game_id || null, title, articleSlug, content, summary || null, cover_image_key || null, status, language, meta_title || null, meta_description || null, keywords || null]
    );

    return NextResponse.json({ article: result.rows[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create article error:', message);
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    );
  }
}
