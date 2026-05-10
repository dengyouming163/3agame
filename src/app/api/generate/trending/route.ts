import { NextRequest, NextResponse } from 'next/server';
import { SearchClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const gameName = body.gameName as string | undefined;
    const gameSlug = body.gameSlug as string | undefined;

    // Get game info from DB if slug provided
    let targetGameName = gameName || '';
    let targetGameSlug = gameSlug || '';
    if (gameSlug && !gameName) {
      const result = await query('SELECT name, slug FROM games WHERE slug = $1', [gameSlug]);
      if (result.rows.length > 0) {
        targetGameName = result.rows[0].name;
        targetGameSlug = result.rows[0].slug;
      }
    }

    if (!targetGameName) {
      return NextResponse.json({ error: 'gameName or gameSlug is required' }, { status: 400 });
    }

    // Search for trending questions and topics about this game
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const searchClient = new SearchClient(config, customHeaders);

    // Search 1: Recent trending questions (Reddit, forums)
    const questionsQuery = `${targetGameName} guide tips tricks 2024 2025 site:reddit.com OR site:fandom.com`;
    const questionsResult = await searchClient.advancedSearch(questionsQuery, {
      count: 10,
      timeRange: '1m',
      needSummary: false,
    });

    // Search 2: What people are searching for (how to, best, etc.)
    const howToQuery = `${targetGameName} how to best guide walkthrough`;
    const howToResult = await searchClient.webSearch(howToQuery, 10, false);

    // Search 3: Latest news/updates that might drive new searches
    const newsQuery = `${targetGameName} update patch new content 2025`;
    const newsResult = await searchClient.advancedSearch(newsQuery, {
      count: 5,
      timeRange: '1w',
      needSummary: false,
    });

    // Combine and extract topic ideas from search results
    const allResults = [
      ...(questionsResult.web_items || []),
      ...(howToResult.web_items || []),
      ...(newsResult.web_items || []),
    ];

    // Extract topic ideas from titles and snippets
    const topicIdeas: Array<{
      title: string;
      source: string;
      sourceUrl: string;
      type: 'question' | 'guide' | 'news';
    }> = [];

    for (const item of allResults) {
      const title = item.title || '';
      const snippet = item.snippet || '';
      const url = item.url || '';
      const siteName = item.site_name || '';

      // Determine type based on source and content
      let type: 'question' | 'guide' | 'news' = 'guide';
      if (url.includes('reddit.com') || title.includes('?') || title.toLowerCase().includes('how to')) {
        type = 'question';
      } else if (title.toLowerCase().includes('update') || title.toLowerCase().includes('patch') || title.toLowerCase().includes('new')) {
        type = 'news';
      }

      // Clean up title - remove site name suffixes
      let cleanTitle = title
        .replace(/ - Reddit$/i, '')
        .replace(/ \| .*$/i, '')
        .replace(/ : .*$/i, '')
        .trim();

      if (cleanTitle && cleanTitle.length > 10 && cleanTitle.length < 120) {
        topicIdeas.push({
          title: cleanTitle,
          source: siteName || new URL(url).hostname,
          sourceUrl: url,
          type,
        });
      }
    }

    // Remove duplicates (similar titles)
    const uniqueTopics: typeof topicIdeas = [];
    const seenTitles = new Set<string>();
    for (const topic of topicIdeas) {
      const key = topic.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      let isDuplicate = false;
      for (const seen of seenTitles) {
        if (levenshtein(key, seen) < Math.max(key.length, seen.length) * 0.3) {
          isDuplicate = true;
          break;
        }
      }
      if (!isDuplicate) {
        uniqueTopics.push(topic);
        seenTitles.add(key);
      }
    }

    // Get existing articles for this game to check coverage
    let existingTitles: string[] = [];
    if (targetGameSlug) {
      const gameResult = await query('SELECT id FROM games WHERE slug = $1', [targetGameSlug]);
      if (gameResult.rows.length > 0) {
        const articlesResult = await query(
          'SELECT title FROM articles WHERE game_id = $1',
          [gameResult.rows[0].id]
        );
        existingTitles = articlesResult.rows.map((r: { title: string }) => r.title.toLowerCase());
      }
    }

    // Mark which topics are already covered
    const enrichedTopics = uniqueTopics.map(topic => {
      const topicLower = topic.title.toLowerCase();
      const isCovered = existingTitles.some(et => {
        const topicWords = new Set(topicLower.split(/\s+/));
        const articleWords = new Set(et.split(/\s+/));
        const overlap = [...topicWords].filter(w => articleWords.has(w)).length;
        return overlap / topicWords.size > 0.4;
      });
      return { ...topic, covered: isCovered };
    });

    // Prioritize uncovered + question-type topics
    const prioritized = enrichedTopics.sort((a, b) => {
      // Uncovered first
      if (a.covered !== b.covered) return a.covered ? 1 : -1;
      // Questions second
      if (a.type !== b.type) return a.type === 'question' ? -1 : 1;
      return 0;
    });

    return NextResponse.json({
      game: targetGameName,
      totalFound: allResults.length,
      uniqueTopics: prioritized.length,
      uncoveredCount: prioritized.filter(t => !t.covered).length,
      topics: prioritized.slice(0, 20),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Trending topics error:', message);
    return NextResponse.json(
      { error: 'Failed to discover trending topics', details: message },
      { status: 500 }
    );
  }
}

// Simple Levenshtein distance for dedup
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}
