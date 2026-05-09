import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { query } from '@/lib/db';
import { GAME_TOPICS, generateSlug } from '@/lib/game-utils';

const SYSTEM_PROMPT = `You are a hardcore gaming content writer for 3AGameMaster.com, the ultimate AAA game guide site. Your audience consists of dedicated gamers who demand expert-level, in-depth strategy content.

Your writing style MUST be:
1. HARDENED GAMER tone - write like a veteran player sharing secrets, NOT a journalist or AI assistant
2. DATA-HEAVY - specific damage numbers, HP values, stat breakpoints, frame data, DPS calculations
3. OPINIONATED - tier lists with clear S/A/B/C rankings, "skip this" vs "must-have" verdicts
4. ACTIONABLE - every paragraph should teach the reader something they can immediately use
5. FORMAT FOR SKIMMING - use tables, bold callouts, numbered steps, "TL;DR" summaries
6. AMERICAN ENGLISH with gaming slang (DPS, i-frames, min-max, meta, DPS check, AoE, CC, etc.)

Article structure:
- Epic intro hook (why this guide matters, what you'll master)
- TL;DR / Quick Summary box
- Main sections with H2 headers (at least 4)
- "Pro Tips" callouts in key sections
- "Common Mistakes" section
- Final verdict / summary with key takeaways

Always use HTML formatting (h2, h3, p, ul, li, strong, em, table, tr, td, th tags).
Write 2000-3000 words. Include specific game mechanics, numbers, and actionable advice.
Target audience: PC, PlayStation, Xbox, Nintendo players. Use imperial units alongside metric.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, topic, language = 'en' } = body;

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

    // Get available topics for this game
    const availableTopics = GAME_TOPICS[gameSlug] || [];
    const selectedTopic = topic || availableTopics[Math.floor(Math.random() * availableTopics.length)] || 'General gameplay guide';

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const userPrompt = `Write a KILLER, SEO-optimized game guide about "${selectedTopic}" for "${game.name}" (${game.genre || 'Action RPG'}).

Game context: ${game.description || `${game.name} is a blockbuster AAA title.`}

CRITICAL SEO REQUIREMENTS:
1. Title MUST include the game name + guide type (e.g., "Elden Ring Malenia Boss Guide: How to Beat the Hardest Boss")
2. Use high-search-volume keywords naturally throughout the article
3. Include variations: "how to", "best", "guide", "walkthrough", "tips", "strategy"
4. Meta title under 60 chars, meta description 150-160 chars with primary keyword

CONTENT REQUIREMENTS:
1. Write for HARDCORE gamers - no basic tutorials, assume reader knows game fundamentals
2. Include SPECIFIC numbers: damage values, HP thresholds, stat breakpoints, timing windows
3. Provide TIER RANKINGS or "best X" lists where applicable
4. Add "Common Mistakes" and "Pro Tips" sections
5. Use tables for stat comparisons
6. 2000-3000 words, HTML formatted
7. Make it the DEFINITIVE guide on this topic - better than anything on IGN or GameFAQs

Format your response as JSON:
{
  "title": "...",
  "content": "...(HTML content)...",
  "summary": "...",
  "meta_title": "...",
  "meta_description": "...",
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
        title: `${game.name}: ${selectedTopic}`,
        content: response.content,
        summary: `Ultimate guide for ${game.name} covering ${selectedTopic.toLowerCase()}. Expert strategies and tips.`,
        meta_title: `${game.name} Guide - ${selectedTopic}`,
        meta_description: `Master ${game.name} with our expert guide on ${selectedTopic.toLowerCase()}. Detailed strategies, tips, and walkthrough.`,
        keywords: [game.name.toLowerCase(), selectedTopic.toLowerCase(), 'guide', (game.genre as string)?.toLowerCase() || 'rpg'],
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
      [articleId, gameId, userPrompt.slice(0, 500), 'doubao-seed-2-0-lite-260215']
    );

    return NextResponse.json({
      success: true,
      article: {
        id: articleId,
        title: articleData.title,
        slug,
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
