import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { query } from '@/lib/db';
import {
  GAME_TOPICS,
  GUIDE_TYPES,
  SEO_KEYWORDS,
  generateSlug,
  getTopicForGeneration,
  getGuideTypeConfig,
  getTopicsForGame,
  getTrendingTopicsForGame,
  type GuideType,
} from '@/lib/game-utils';

const SYSTEM_PROMPT = `You are a hardcore gaming content writer for 3AGameMaster.com, the ultimate AAA game guide site. Your audience consists of dedicated gamers who demand expert-level, in-depth strategy content.

WRITING STYLE - CRITICAL:
1. HARDENED GAMER TONE - Write like a veteran player sharing secrets with a friend, NOT a journalist or AI assistant
2. DATA-HEAVY - Specific damage numbers, HP values, stat breakpoints, frame data, DPS calculations wherever possible
3. OPINIONATED - Tier lists with clear S/A/B/C/D rankings, bold "skip this" vs "must-have" verdicts
4. ACTIONABLE - Every paragraph must teach the reader something they can immediately use in-game
5. FORMAT FOR SKIMMING - Tables, bold callouts, numbered steps, "TL;DR" summaries, "Pro Tips" boxes
6. AMERICAN ENGLISH with heavy gaming slang: DPS, i-frames, min-max, meta, DPS check, AoE, CC, proc, DoT, iframe, poise, stagger, animation cancel, frame trap, oki, tech chase
7. NO FLUFF - Cut filler paragraphs. If a section doesn't teach something new, delete it.
8. USE "YOU" not "the player" - direct, personal, like a friend coaching you

ARTICLE FORMATTING:
- Use HTML tags: h2, h3, p, ul, li, strong, em, table, tr, td, th
- Bold key terms on first mention
- Tables for stat comparisons, tier lists, weapon rankings
- "Pro Tip:" callouts in key sections using <strong>Pro Tip:</strong>
- "Common Mistakes" section with numbered items
- "TL;DR" box at the top with 3-5 bullet points
- End with "Final Verdict" or "Bottom Line" summary

WORD COUNT: 2000-3000 words. Quality over quantity - every sentence earns its place.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, topic, guideType, language = 'en' } = body as {
      gameId?: number;
      topic?: string;
      guideType?: GuideType;
      language?: string;
    };

    if (!gameId) {
      return NextResponse.json(
        { error: 'gameId is required' },
        { status: 400 }
      );
    }

    // Get game info
    const gameResult = await query(
      `SELECT id, name, slug, genre, description FROM games WHERE id = $1`,
      [gameId]
    );

    if (gameResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    const game = gameResult.rows[0];
    const gameSlug = game.slug as string;

    // Get existing article titles to avoid duplicates
    const existingResult = await query(
      `SELECT title FROM articles WHERE game_id = $1`,
      [gameId]
    );
    const existingTitles = existingResult.rows.map((r: { title: string }) => r.title);

    // Auto-select topic if not provided
    let selectedTopic = topic;
    let selectedGuideType = guideType;

    if (!selectedTopic) {
      const topicResult = getTopicForGeneration(gameSlug, selectedGuideType, existingTitles);
      if (topicResult) {
        selectedTopic = topicResult.topic;
        selectedGuideType = topicResult.guideType;
      } else {
        // Fallback: pick from all available topics
        const allTopics = getTopicsForGame(gameSlug);
        selectedTopic = allTopics[Math.floor(Math.random() * allTopics.length)] || 'General gameplay guide';
        selectedGuideType = selectedGuideType || 'tips';
      }
    }

    if (!selectedGuideType) {
      selectedGuideType = 'tips';
    }

    // Get guide type config for specialized prompt
    const guideConfig = getGuideTypeConfig(selectedGuideType);
    const guideTypeLabel = guideConfig?.label || 'Guide';

    // Build SEO keywords for this article
    const trendingForGame = getTrendingTopicsForGame(gameSlug);
    const seoKeywords = [
      ...(guideConfig?.keywords || []),
      ...(trendingForGame.slice(0, 2).flatMap(t => t.keywords)),
      ...SEO_KEYWORDS.core.slice(0, 2),
    ].slice(0, 8);

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const userPrompt = `Write a DEFINITIVE, KILLER ${guideTypeLabel} about "${selectedTopic}" for "${game.name}" (${game.genre || 'Action RPG'}).

GAME CONTEXT: ${game.description || `${game.name} is a blockbuster AAA title.`}

GUIDE TYPE: ${guideTypeLabel}
${guideConfig?.promptSuffix || ''}

CRITICAL SEO REQUIREMENTS:
1. Title MUST include: Game Name + Topic + Guide Type (e.g., "Elden Ring Malenia Boss Guide: How to Beat the Hardest Boss in 2025")
2. Naturally weave these keywords throughout: ${seoKeywords.join(', ')}
3. Use search-intent phrases: "how to", "best", "guide", "walkthrough", "tips", "strategy", "location", "all"
4. Meta title: under 60 chars, include game name + primary keyword
5. Meta description: 150-160 chars, include game name + action verb + benefit

CONTENT REQUIREMENTS:
1. Write for HARDCORE gamers who already know the basics - skip tutorial-level content
2. Include SPECIFIC numbers wherever possible: damage values, HP thresholds, stat breakpoints, timing windows
3. Provide TIER RANKINGS or "best X" lists wherever applicable
4. Add "Common Mistakes" section with real mistakes players make
5. Add "Pro Tips" callouts in key sections
6. Use tables for stat comparisons and rankings
7. 2000-3000 words, HTML formatted
8. Make this the DEFINITIVE guide on this topic - better than IGN, GameFAQs, or any wiki
9. Include 2025 in the title if it's a build or tier list guide

Format your response as JSON:
{
  "title": "...",
  "content": "...(HTML content)...",
  "summary": "...(2-3 sentence hook)...",
  "meta_title": "...(under 60 chars)...",
  "meta_description": "...(150-160 chars)...",
  "keywords": ["...", "..."]
}`;

    const messages = [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      { role: 'user' as const, content: userPrompt },
    ];

    const response = await llmClient.invoke(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.8,
    });

    // Parse the AI response
    let articleData: {
      title: string;
      content: string;
      summary: string;
      meta_title: string;
      meta_description: string;
      keywords: string[];
    };

    try {
      const contentStr = response.content;
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        articleData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      articleData = {
        title: `${game.name}: ${selectedTopic} - ${guideTypeLabel} (2025)`,
        content: response.content,
        summary: `Ultimate ${guideTypeLabel.toLowerCase()} for ${game.name} covering ${selectedTopic.toLowerCase()}. Expert strategies, detailed breakdowns, and pro tips.`,
        meta_title: `${game.name} ${selectedTopic} - ${guideTypeLabel}`,
        meta_description: `Master ${game.name} with our expert ${guideTypeLabel.toLowerCase()} on ${selectedTopic.toLowerCase()}. Detailed strategies, tips, and walkthrough for hardcore gamers.`,
        keywords: [game.name.toLowerCase(), selectedTopic.toLowerCase(), guideTypeLabel.toLowerCase(), 'guide', (game.genre as string)?.toLowerCase() || 'rpg'],
      };
    }

    // Generate a unique slug
    const baseSlug = generateSlug(articleData.title);
    const slugSuffix = Date.now().toString(36);
    const slug = `${baseSlug}-${slugSuffix}`;

    // Insert the article
    const insertResult = await query(
      `INSERT INTO articles (game_id, title, slug, content, summary, status, language, meta_title, meta_description, keywords, author)
       VALUES ($1, $2, $3, $4, $5, 'generated', $6, $7, $8, $9, 'AI Editor')
       RETURNING id`,
      [gameId, articleData.title, slug, articleData.content, articleData.summary, language, articleData.meta_title, articleData.meta_description, articleData.keywords]
    );

    const articleId = insertResult.rows[0]?.id;

    // Log the generation
    await query(
      `INSERT INTO generation_logs (article_id, game_id, prompt, model) VALUES ($1, $2, $3, $4)`,
      [articleId, gameId, `Guide Type: ${selectedGuideType} | Topic: ${selectedTopic}`, 'doubao-seed-2-0-lite-260215']
    );

    return NextResponse.json({
      success: true,
      article: {
        id: articleId,
        title: articleData.title,
        slug,
        guideType: selectedGuideType,
        topic: selectedTopic,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Article generation error:', message);
    return NextResponse.json(
      { error: 'Failed to generate article', details: message },
      { status: 500 }
    );
  }
}
