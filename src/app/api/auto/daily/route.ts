import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getTopicForGeneration, type GuideType } from '@/lib/game-utils';

interface GameRow {
  id: number;
  name: string;
  slug: string;
}

interface ExistingRow {
  title: string;
  keywords: string[] | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articlesPerDay = 3, startHour = 9, intervalHours = 3 } = body;

    // 1. Get all games
    const gamesResult = await query<GameRow>('SELECT id, name, slug FROM games ORDER BY name');
    const games = gamesResult.rows;

    if (games.length === 0) {
      return NextResponse.json({ error: 'No games in database' }, { status: 400 });
    }

    // 2. Get existing article titles and keywords to avoid duplicates
    const existingResult = await query<ExistingRow>(
      'SELECT title, keywords FROM articles'
    );
    const existingTitles = new Set(existingResult.rows.map(r => r.title));
    const existingKeywords = existingResult.rows
      .flatMap(r => r.keywords || []);

    // 3. Pick topics for generation - rotate through games, prioritize those with fewer articles
    const gameArticleCounts = await query(
      'SELECT game_id, COUNT(*)::int as count FROM articles GROUP BY game_id'
    );
    const countMap = new Map(gameArticleCounts.rows.map((r: { game_id: number; count: number }) => [r.game_id, r.count]));
    const sortedGames = [...games].sort((a, b) => 
      (countMap.get(a.id) || 0) - (countMap.get(b.id) || 0)
    );

    const guideTypes: GuideType[] = ['boss', 'build', 'collectible', 'walkthrough', 'tips'];
    const plannedArticles: { gameId: number; gameName: string; gameSlug: string; guideType: GuideType; topic: string }[] = [];

    // Pick topics
    for (const game of sortedGames) {
      if (plannedArticles.length >= articlesPerDay) break;

      // Try each guide type for this game
      for (const guideType of guideTypes) {
        if (plannedArticles.length >= articlesPerDay) break;

        const topic = getTopicForGeneration(game.slug, guideType, existingTitles, existingKeywords);
        if (topic) {
          plannedArticles.push({
            gameId: game.id,
            gameName: game.name,
            gameSlug: game.slug,
            guideType,
            topic,
          });
        }
      }
    }

    // 4. Generate articles one by one using the internal API
    const generated: { articleId: number; title: string; topic: string }[] = [];
    const errors: string[] = [];

    for (const plan of plannedArticles) {
      try {
        const baseUrl = process.env.DEPLOY_RUN_PORT 
          ? `http://localhost:${process.env.DEPLOY_RUN_PORT}` 
          : 'http://localhost:5000';
        
        const response = await fetch(`${baseUrl}/api/generate/article`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId: plan.gameId,
            gameSlug: plan.gameSlug,
            guideType: plan.guideType,
            topic: plan.topic,
          }),
        });

        const data = await response.json();
        if (data.success && data.article) {
          generated.push({
            articleId: data.article.id,
            title: data.article.title,
            topic: plan.topic,
          });
        } else {
          errors.push(`${plan.gameName}: ${data.error || 'Unknown error'}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${plan.gameName}: ${msg}`);
      }
    }

    // 5. Auto-schedule reviewed articles for publishing
    const scheduleResult = await fetch(`http://localhost:${process.env.DEPLOY_RUN_PORT || 5000}/api/schedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dailySchedule: { count: articlesPerDay, startHour, intervalHours },
      }),
    });
    const scheduleData = await scheduleResult.json();

    return NextResponse.json({
      success: true,
      generated: generated.length,
      scheduled: scheduleData.scheduled || 0,
      articles: generated,
      errors: errors.length > 0 ? errors : undefined,
      message: `Generated ${generated.length} articles, scheduled ${scheduleData.scheduled || 0} for publishing`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Auto daily error:', message);
    return NextResponse.json(
      { error: 'Auto generation failed', details: message },
      { status: 500 }
    );
  }
}
