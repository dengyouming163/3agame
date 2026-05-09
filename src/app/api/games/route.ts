import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';

export async function GET() {
  try {
    const client = getClient();

    // Get all games
    const { data: games, error: gamesError } = await client
      .from('games')
      .select('id, name, slug, genre, platform, release_date, description, cover_image_key, created_at, updated_at')
      .order('name');
    if (gamesError) throw new Error(`Failed to fetch games: ${gamesError.message}`);

    // Get article counts per game
    const { data: articleCounts, error: countError } = await client
      .from('articles')
      .select('game_id')
      .not('game_id', 'is', null);
    if (countError) throw new Error(`Failed to fetch article counts: ${countError.message}`);

    // Count articles per game
    const countMap: Record<string, number> = {};
    for (const row of (articleCounts || [])) {
      const gid = String(row.game_id);
      countMap[gid] = (countMap[gid] || 0) + 1;
    }

    const result = (games || []).map((g: { id: number; name: string; slug: string; genre: string | null; platform: string | null; release_date: string | null; description: string | null; cover_image_key: string | null }) => ({
      ...g,
      article_count: String(countMap[String(g.id)] || 0),
    }));

    return NextResponse.json({ games: result });
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

    const client = getClient();
    const { data, error } = await client
      .from('games')
      .insert({ name, slug, genre, platform, release_date, description })
      .select('id');
    if (error) throw new Error(`Failed to create game: ${error.message}`);

    return NextResponse.json({
      success: true,
      game: { id: data?.[0]?.id },
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
