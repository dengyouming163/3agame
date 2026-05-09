import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  getTopicForGeneration,
  getTrendingTopicsForGame,
  type GuideType,
} from '@/lib/game-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameSlug, count = 3, guideTypes } = body as {
      gameSlug?: string;
      count?: number;
      guideTypes?: GuideType[];
    };

    if (!gameSlug) {
      return NextResponse.json(
        { error: 'gameSlug is required' },
        { status: 400 }
      );
    }

    // Cap at 5 articles per batch to avoid overwhelming the LLM
    const articleCount = Math.min(count, 5);

    // Get game info
    const gameResult = await query(
      `SELECT id, name, slug, genre, description FROM games WHERE slug = $1`,
      [gameSlug]
    );

    if (gameResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    const game = gameResult.rows[0];
    const gameId = game.id as number;

    // Get existing article titles
    const existingResult = await query(
      `SELECT title FROM articles WHERE game_id = $1`,
      [gameId]
    );
    const existingTitles = existingResult.rows.map((r: { title: string }) => r.title);

    // Generate topic list for batch
    const topics: { topic: string; guideType: GuideType }[] = [];

    // First priority: trending topics for this game
    const trending = getTrendingTopicsForGame(gameSlug);
    for (const t of trending.slice(0, articleCount)) {
      // Check if topic already has an article
      const topicLower = t.topic.toLowerCase();
      const alreadyExists = existingTitles.some(et =>
        et.toLowerCase().includes(topicLower.slice(0, 20))
      );
      if (!alreadyExists) {
        topics.push({ topic: t.topic, guideType: t.guideType });
      }
    }

    // Fill remaining slots with auto-selected topics
    const typesToUse = guideTypes && guideTypes.length > 0
      ? guideTypes
      : ['boss', 'build', 'collectible', 'walkthrough', 'tips'] as GuideType[];

    let attempts = 0;
    while (topics.length < articleCount && attempts < 20) {
      const guideType = typesToUse[topics.length % typesToUse.length];
      const result = getTopicForGeneration(gameSlug, guideType, existingTitles);
      if (result && !topics.some(t => t.topic === result.topic)) {
        topics.push({ topic: result.topic, guideType: result.guideType });
      }
      attempts++;
    }

    if (topics.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No available topics found for this game. All topics may already have articles.',
      });
    }

    // Return the planned batch - actual generation will be triggered individually
    return NextResponse.json({
      success: true,
      gameId,
      gameName: game.name,
      plannedArticles: topics.map(t => ({
        gameSlug,
        gameId,
        topic: t.topic,
        guideType: t.guideType,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Batch generation planning error:', message);
    return NextResponse.json(
      { error: 'Failed to plan batch generation' },
      { status: 500 }
    );
  }
}
