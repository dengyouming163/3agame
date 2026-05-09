import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils, ImageGenerationClient } from 'coze-coding-dev-sdk';
import { query } from '@/lib/db';
import { uploadImageFromUrl } from '@/lib/storage';
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
    const { gameId, gameSlug, topic, guideType, language = 'en' } = body as {
      gameId?: number;
      gameSlug?: string;
      topic?: string;
      guideType?: GuideType;
      language?: string;
    };

    // Resolve game by ID or slug
    let gameQuery = 'SELECT id, name, slug, genre, description FROM games WHERE ';
    let queryParams: (string | number)[] = [];
    
    if (gameId) {
      gameQuery += 'id = $1';
      queryParams = [gameId];
    } else if (gameSlug) {
      gameQuery += 'slug = $1';
      queryParams = [gameSlug];
    } else {
      return NextResponse.json(
        { error: 'gameId or gameSlug is required' },
        { status: 400 }
      );
    }

    const gameResult = await query(gameQuery, queryParams);

    if (gameResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    const game = gameResult.rows[0];
    const resolvedGameId = game.id as number;
    const resolvedGameSlug = game.slug as string;

    // Get existing article titles to avoid duplicates
    const existingResult = await query(
      `SELECT title FROM articles WHERE game_id = $1`,
      [resolvedGameId]
    );
    const existingTitles = existingResult.rows.map((r: { title: string }) => r.title);

    // Auto-select topic if not provided
    let selectedTopic = topic;
    let selectedGuideType = guideType;

    if (!selectedTopic) {
      const topicResult = getTopicForGeneration(resolvedGameSlug, selectedGuideType, existingTitles);
      if (topicResult) {
        selectedTopic = topicResult.topic;
        selectedGuideType = topicResult.guideType;
      } else {
        // Fallback: pick from all available topics
        const allTopics = getTopicsForGame(resolvedGameSlug);
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
    const trendingForGame = getTrendingTopicsForGame(resolvedGameSlug);
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
      // Try to extract and parse JSON from the LLM response
      const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        articleData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      // JSON parse failed (truncated or malformed) - try to extract content field manually
      const contentStr = response.content;
      let extractedContent = contentStr;
      let extractedTitle = `${game.name}: ${selectedTopic} - ${guideTypeLabel} (2025)`;
      let extractedSummary = `Ultimate ${guideTypeLabel.toLowerCase()} for ${game.name} covering ${selectedTopic.toLowerCase()}. Expert strategies, detailed breakdowns, and pro tips.`;

      // Try to extract "content" field from malformed JSON
      const contentFieldMatch = contentStr.match(/"content"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"(?:summary|meta_title|meta_description|keywords)"|\s*\}\s*$)/);
      if (contentFieldMatch) {
        // Unescape the content string
        extractedContent = contentFieldMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      } else if (contentStr.trim().startsWith('{')) {
        // Last resort: the entire response is JSON-like but broken
        // Try to find any HTML content between quotes after "content":
        const htmlMatch = contentStr.match(/"content"\s*:\s*"([\s\S]*)/);
        if (htmlMatch) {
          extractedContent = htmlMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\')
            // Remove trailing broken JSON artifacts
            .replace(/"\s*\}?\s*$/, '')
            .replace(/,\s*"(?:summary|meta_title|meta_description|keywords)"[\s\S]*$/, '');
        }
      } else {
        // Pure HTML content (not wrapped in JSON)
        extractedContent = contentStr;
      }

      // Try to extract title from JSON
      const titleMatch = contentStr.match(/"title"\s*:\s*"([^"]*)"/);
      if (titleMatch) {
        extractedTitle = titleMatch[1];
      }

      articleData = {
        title: extractedTitle,
        content: extractedContent,
        summary: extractedSummary,
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
      [resolvedGameId, articleData.title, slug, articleData.content, articleData.summary, language, articleData.meta_title, articleData.meta_description, articleData.keywords]
    );

    const articleId = insertResult.rows[0]?.id;

    // Log the generation
    await query(
      `INSERT INTO generation_logs (article_id, game_id, prompt, model) VALUES ($1, $2, $3, $4)`,
      [articleId, resolvedGameId, `Guide Type: ${selectedGuideType} | Topic: ${selectedTopic}`, 'doubao-seed-2-0-lite-260215']
    );

    // Auto-generate cover image (non-blocking - won't fail article if image fails)
    let coverImageKey: string | null = null;
    try {
      const imagePrompt = `Epic cinematic game art for "${game.name}" ${guideTypeLabel}: ${selectedTopic}. Dark fantasy style, dramatic lighting, high contrast, game key art aesthetic. Professional quality digital painting with neon purple and cyan accents on dark background. No text, no watermarks. 16:9 aspect ratio.`;

      const imageClient = new ImageGenerationClient(config, customHeaders);
      const imageResponse = await imageClient.generate({
        prompt: imagePrompt,
        size: '2K',
        watermark: false,
      });

      const imageHelper = imageClient.getResponseHelper(imageResponse);

      if (imageHelper.success && imageHelper.imageUrls.length > 0) {
        const imageUrl = imageHelper.imageUrls[0];
        // Upload to our object storage for permanent CDN access
        const uploadResult = await uploadImageFromUrl(imageUrl);

        if (uploadResult) {
          coverImageKey = uploadResult;
          // Update article with cover image
          await query(
            `UPDATE articles SET cover_image_key = $1 WHERE id = $2`,
            [coverImageKey, articleId]
          );
        }
      }
    } catch (imageError) {
      // Image generation failure should not block article creation
      console.error('Cover image generation failed:', imageError instanceof Error ? imageError.message : 'Unknown error');
    }

    return NextResponse.json({
      success: true,
      article: {
        id: articleId,
        title: articleData.title,
        slug,
        guideType: selectedGuideType,
        topic: selectedTopic,
        coverImageKey,
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
