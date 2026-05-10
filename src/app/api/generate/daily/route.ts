import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { LLMClient, Config, HeaderUtils, ImageGenerationClient } from 'coze-coding-dev-sdk';
import { uploadImageFromUrl } from '@/lib/storage';
import {
  getTopicForGeneration,
  getTrendingTopicsForGame,
  generateSlug,
  getGuideTypeConfig,
  getTopicsForGame,
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

const ALL_GUIDE_TYPES: GuideType[] = ['boss', 'build', 'collectible', 'walkthrough', 'tips'];

export async function POST() {
  const startTime = Date.now();
  const results: { game: string; topic: string; guideType: string; status: string; title?: string; error?: string }[] = [];

  try {
    // Check if daily generation already ran today
    const today = new Date().toISOString().slice(0, 10);
    const checkResult = await query(
      `SELECT id FROM generation_logs WHERE prompt LIKE 'daily-auto:%' AND generated_at::text LIKE $1 LIMIT 1`,
      [`${today}%`]
    );
    if (checkResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Daily generation already ran today (${today}). Skipping.`,
        results: [],
      });
    }

    // Get all games
    const gamesResult = await query(
      `SELECT id, name, slug, genre, description FROM games ORDER BY name`
    );
    const games = gamesResult.rows;

    if (games.length === 0) {
      return NextResponse.json({ success: false, message: 'No games found in database.' });
    }

    // For each game, generate 2 articles (one per guide type, rotating through types)
    const articlesPerGame = 2;
    let totalGenerated = 0;
    let totalFailed = 0;

    for (const game of games) {
      const gameId = game.id as number;
      const gameSlug = game.slug as string;
      const gameName = game.name as string;

      // Get existing article titles to avoid duplicates
      const existingResult = await query(
        `SELECT title FROM articles WHERE game_id = $1`,
        [gameId]
      );
      const existingTitles = existingResult.rows.map((r: { title: string }) => r.title);

      // Determine which guide types have the fewest articles for this game
      const typeCount: Record<string, number> = {};
      for (const gt of ALL_GUIDE_TYPES) {
        const countResult = await query(
          `SELECT COUNT(*) as cnt FROM articles WHERE game_id = $1 AND keywords @> ARRAY[$2]`,
          [gameId, gt]
        );
        typeCount[gt] = parseInt(countResult.rows[0]?.cnt as string || '0');
      }

      // Sort guide types by article count (ascending) - generate for types with fewer articles
      const sortedTypes = [...ALL_GUIDE_TYPES].sort((a, b) => (typeCount[a] || 0) - (typeCount[b] || 0));

      for (let i = 0; i < articlesPerGame; i++) {
        const guideType = sortedTypes[i % sortedTypes.length];

        // Find a unique topic
        let topic: string | null = null;
        let resolvedGuideType = guideType;

        // Try trending topics first
        const trending = getTrendingTopicsForGame(gameSlug);
        for (const t of trending) {
          if (t.guideType === guideType || t.guideType === sortedTypes[(i + 1) % sortedTypes.length]) {
            const topicLower = t.topic.toLowerCase();
            const alreadyExists = existingTitles.some(et =>
              et.toLowerCase().includes(topicLower.slice(0, 20))
            );
            if (!alreadyExists) {
              topic = t.topic;
              resolvedGuideType = t.guideType;
              break;
            }
          }
        }

        // Fallback to auto-selected topic
        if (!topic) {
          const result = getTopicForGeneration(gameSlug, guideType, existingTitles);
          if (result) {
            topic = result.topic;
            resolvedGuideType = result.guideType;
          }
        }

        // Last fallback
        if (!topic) {
          const allTopics = getTopicsForGame(gameSlug);
          topic = allTopics[Math.floor(Math.random() * allTopics.length)] || `${gameName} General Guide`;
        }

        try {
          // Generate article via LLM
          const guideConfig = getGuideTypeConfig(resolvedGuideType);
          const guideTypeLabel = guideConfig?.label || 'Guide';
          const seoKeywords = [
            ...(guideConfig?.keywords || []),
            ...(trending.slice(0, 2).flatMap(t => t.keywords)),
          ].slice(0, 6);

          const config = new Config();
          const llmClient = new LLMClient(config);

          const userPrompt = `Write a DEFINITIVE, KILLER ${guideTypeLabel} about "${topic}" for "${gameName}" (${game.genre || 'Action RPG'}).

GAME CONTEXT: ${game.description || `${gameName} is a blockbuster AAA title.`}

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
2. Include SPECIFIC numbers wherever possible
3. Provide TIER RANKINGS or "best X" lists wherever applicable
4. Add "Common Mistakes" section
5. Add "Pro Tips" callouts
6. Use tables for stat comparisons
7. 2000-3000 words, HTML formatted
8. Include 2025 in the title if it's a build or tier list guide

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

          // Parse AI response
          let articleData: {
            title: string;
            content: string;
            summary: string;
            meta_title: string;
            meta_description: string;
            keywords: string[];
          };

          try {
            const jsonMatch = response.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              articleData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error('No JSON found');
            }
          } catch {
            articleData = {
              title: `${gameName}: ${topic} - ${guideTypeLabel} (2025)`,
              content: response.content,
              summary: `Ultimate ${guideTypeLabel.toLowerCase()} for ${gameName} covering ${topic.toLowerCase()}.`,
              meta_title: `${gameName} ${topic} - ${guideTypeLabel}`,
              meta_description: `Master ${gameName} with our expert ${guideTypeLabel.toLowerCase()} on ${topic.toLowerCase()}.`,
              keywords: [gameName.toLowerCase(), topic.toLowerCase(), guideTypeLabel.toLowerCase(), 'guide'],
            };
          }

          // Insert article directly as 'published' status (auto-approve)
          const baseSlug = generateSlug(articleData.title);
          const slugSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
          const slug = `${baseSlug}-${slugSuffix}`;

          const insertResult = await query(
            `INSERT INTO articles (game_id, title, slug, content, summary, status, language, meta_title, meta_description, keywords, author, published_at)
             VALUES ($1, $2, $3, $4, $5, 'published', 'en', $6, $7, $8, 'AI Editor', NOW())
             RETURNING id`,
            [gameId, articleData.title, slug, articleData.content, articleData.summary, articleData.meta_title, articleData.meta_description, articleData.keywords]
          );

          const articleId = insertResult.rows[0]?.id as number;

          // Log generation
          await query(
            `INSERT INTO generation_logs (article_id, game_id, prompt, model) VALUES ($1, $2, $3, $4)`,
            [articleId, gameId, `daily-auto:${today} | Guide Type: ${resolvedGuideType} | Topic: ${topic}`, 'doubao-seed-2-0-lite-260215']
          );

          // Auto-generate cover image (best-effort, won't block)
          try {
            const imagePrompt = `Epic cinematic game art for "${gameName}" ${guideTypeLabel}: ${topic}. Dark fantasy style, dramatic lighting, high contrast, game key art aesthetic. Professional quality digital painting with neon purple and cyan accents on dark background. No text, no watermarks. 16:9 aspect ratio.`;

            const imageConfig = new Config();
            const imageClient = new ImageGenerationClient(imageConfig);
            const imageResponse = await imageClient.generate({
              prompt: imagePrompt,
              size: '1K',
              watermark: false,
            });
            const imageHelper = imageClient.getResponseHelper(imageResponse);

            if (imageHelper.success && imageHelper.imageUrls.length > 0) {
              const imageUrl = imageHelper.imageUrls[0];
              const uploadResult = await uploadImageFromUrl(imageUrl);
              if (uploadResult) {
                await query(
                  `UPDATE articles SET cover_image_key = $1 WHERE id = $2`,
                  [uploadResult, articleId]
                );
              }
            }
          } catch (imgErr) {
            console.error(`Daily auto: Cover image failed for article ${articleId}:`, imgErr instanceof Error ? imgErr.message : 'Unknown');
          }

          existingTitles.push(articleData.title);
          totalGenerated++;
          results.push({
            game: gameName,
            topic,
            guideType: resolvedGuideType,
            status: 'published',
            title: articleData.title,
          });

        } catch (articleError) {
          totalFailed++;
          results.push({
            game: gameName,
            topic,
            guideType: resolvedGuideType,
            status: 'failed',
            error: articleError instanceof Error ? articleError.message : 'Unknown error',
          });
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      success: true,
      message: `Daily generation complete: ${totalGenerated} published, ${totalFailed} failed in ${duration}s`,
      summary: {
        totalGames: games.length,
        articlesPerGame,
        totalGenerated,
        totalFailed,
        duration: `${duration}s`,
      },
      results,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Daily generation error:', message);
    return NextResponse.json(
      { success: false, error: 'Daily generation failed', details: message, results },
      { status: 500 }
    );
  }
}
