import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  getTopicsForGame,
  getTrendingTopicsForGame,
  getAllTrendingTopics,
  GUIDE_TYPES,
  type GuideType,
} from '@/lib/game-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameSlug = searchParams.get('gameSlug');
    const guideType = searchParams.get('guideType') as GuideType | null;

    if (gameSlug) {
      // Get topics for a specific game
      const topics = getTopicsForGame(gameSlug, guideType || undefined);
      const trending = getTrendingTopicsForGame(gameSlug);

      // Get existing article titles for this game to mark unavailable topics
      const gameResult = await query(
        `SELECT id FROM games WHERE slug = $1`,
        [gameSlug]
      );

      let existingTitles: string[] = [];
      if (gameResult.rows.length > 0) {
        const articlesResult = await query(
          `SELECT title FROM articles WHERE game_id = $1`,
          [gameResult.rows[0].id]
        );
        existingTitles = articlesResult.rows.map((r: { title: string }) => r.title.toLowerCase());
      }

      // Mark topics as available/unavailable
      const enrichedTopics = topics.map(topic => {
        const topicLower = topic.toLowerCase();
        const isUsed = existingTitles.some(et => {
          const topicWords = new Set(topicLower.split(/\s+/));
          const articleWords = new Set(et.split(/\s+/));
          const overlap = [...topicWords].filter(w => articleWords.has(w)).length;
          return overlap / topicWords.size > 0.5;
        });
        return { topic, used: isUsed };
      });

      return NextResponse.json({
        gameSlug,
        topics: enrichedTopics,
        trending,
        guideTypes: GUIDE_TYPES.map(g => ({ type: g.type, label: g.label, icon: g.icon, description: g.description })),
      });
    }

    // No game specified - return all trending topics
    const allTrending = getAllTrendingTopics();

    return NextResponse.json({
      trending: allTrending,
      guideTypes: GUIDE_TYPES.map(g => ({ type: g.type, label: g.label, icon: g.icon, description: g.description })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Topics fetch error:', message);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}
