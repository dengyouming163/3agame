import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get all games with article counts
    const result = await query(
      `SELECT g.id, g.name, g.slug, g.genre, g.platform, g.release_date, g.description, g.cover_image_key, g.created_at, g.updated_at,
        COUNT(a.id)::int as article_count
       FROM games g
       LEFT JOIN articles a ON g.id = a.game_id
       GROUP BY g.id
       ORDER BY g.name`
    );

    return NextResponse.json({ games: result.rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get games error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch games' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, genre, platform, release_date, description } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'name and slug are required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO games (name, slug, genre, platform, release_date, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [name, slug, genre, platform, release_date, description]
    );

    return NextResponse.json({
      success: true,
      game: { id: result.rows[0]?.id },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create game error:', message);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}
