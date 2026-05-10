import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { LLMClient, Config, ImageGenerationClient } from 'coze-coding-dev-sdk';
import { uploadImageFromUrl } from '@/lib/storage';
import {
  getTopicForGeneration,
  getTrendingTopicsForGame,
  generateSlug,
  getGuideTypeConfig,
  getTopicsForGame,
  GAME_TIER_LIST,
  type GuideType,
} from '@/lib/game-utils';

// ========================================
// P0: UPGRADED SYSTEM PROMPT
// Deeper content, question-driven, expert authority
// ========================================
const SYSTEM_PROMPT = `You are a veteran hardcore gamer and strategy writer for 3AGameMaster.com. You have 10,000+ hours across AAA titles and write guides that OUTPERFORM IGN, Fandom, and YouTube because they're more specific, more actionable, and more honest.

CORE WRITING PHILOSOPHY:
1. ANSWER A SPECIFIC QUESTION - Every article must answer ONE clear question a player is actively Googling. Not "Boss Guide" but "How to Beat Malenia Phase 2 Without Summons"
2. PROVE YOUR EXPERTISE - Mention specific mechanics names, frame data, damage formulas, hidden interactions that only someone who played 200+ hours would know
3. BE BRUTALLY HONEST - If a strategy is suboptimal, say so. If a weapon is trash, call it trash. Readers trust bold opinions over safe hedging.
4. SHOW, DON'T TELL - Instead of "this build is strong", write "this build clears the DLC final boss in 45 seconds with zero flasks"
5. EVERY PARAGRAPH TEACHES - If a paragraph doesn't contain information the reader can act on, delete it.

WRITING STYLE:
- AMERICAN ENGLISH with heavy gaming terminology: DPS, i-frames, min-max, meta, AoE, CC, proc, DoT, poise, stagger, animation cancel, frame trap, oki, hyperarmor, poise-break, oneshot, speedrun, any%, RNG, softcap, hardcap
- Use "YOU" not "the player" — direct coaching tone
- SPECIFIC NUMBERS: damage values, HP thresholds, stat breakpoints, timing windows, stamina costs
- TIER RANKINGS: S/A/B/C/D with clear justification for each rank
- "Common Mistakes" with REAL mistakes players make (not generic advice)
- "Pro Tips" that separate good players from great players
- Comparison tables with exact stats
- TL;DR at the top with 3-5 key takeaways

ARTICLE FORMATTING (HTML):
- h2 for major sections, h3 for subsections
- Tables for: stat comparisons, tier lists, weapon rankings, loadout comparisons
- <strong>Pro Tip:</strong> callouts in key sections
- Numbered steps for sequences
- Bold key terms on first mention
- End with "Final Verdict" or "Bottom Line" summary

WORD COUNT: 3000-5000 words. This is a DEFINITIVE guide, not a blog post. Depth wins.`;

// ========================================
// P0: QUESTION-DRIVEN TOPIC TEMPLATES
// Topics that match actual Google search queries
// ========================================
const QUESTION_TEMPLATES: Record<GuideType, string[]> = {
  boss: [
    'How to Beat {Boss} Without Taking Damage',
    '{Boss} Phase 2 Strategy - What Most Players Get Wrong',
    'How to Defeat {Boss} at Low Level - No Summons Run',
    '{Boss} One-Phase Kill Strategy - Speedrun Route',
    'Hidden Weakness of {Boss} That Makes the Fight Easy',
  ],
  build: [
    'Best {Game} {Archetype} Build for Endgame DLC Content (2025)',
    '{Game} Meta Build That Clears Everything - No Exploit Required',
    'How to Make {Archetype} Work in {Game} - Underrated Build Guide',
    '{Game} {Archetype} vs {Archetype} - Which Build is Actually Better?',
    'Best Starter Build for {Game} New Players - Fastest Progression',
  ],
  collectible: [
    'All {Item} Locations in {Game} - Complete Map Guide',
    'How to Find Every Hidden {Item} in {Game} - No Missables',
    '{Game} 100% Completion Checklist - Every Collectible Ranked by Difficulty',
    'Missable {Item} in {Game} - What You Cannot Get After Point of No Return',
    'Hardest {Item} to Find in {Game} - Hidden Locations Guide',
  ],
  walkthrough: [
    '{Game} {Area} Complete Walkthrough - All Paths & Secrets',
    'How to Get to {Area} in {Game} - Step by Step Route',
    '{Game} {Chapter} Walkthrough - Best Order for Maximum Loot',
    'How to Unlock {Content} in {Game} - Full Requirements Guide',
    '{Game} {Ending} Ending Guide - Every Choice That Matters',
  ],
  tips: [
    '{Game} Things I Wish I Knew Before Playing - 15 Expert Tips',
    'Hidden Mechanics in {Game} That Change Everything',
    '{Game} Common Mistakes That Ruin Your First Playthrough',
    'How to Get Overpowered Early in {Game} - Fast Strategy',
    '{Game} Advanced Combat Guide - From Good to Great',
  ],
};

// Pick a question-driven topic for a game
function getQuestionTopic(
  gameSlug: string,
  guideType: GuideType,
  gameName: string,
  existingTitles: string[]
): string | null {
  const templates = QUESTION_TEMPLATES[guideType];
  if (!templates || templates.length === 0) return null;

  // Get game-specific topics first
  const gameTopics = getTopicsForGame(gameSlug, guideType);
  const existingLower = existingTitles.map(t => t.toLowerCase());

  // Try to combine game-specific topics with question templates
  for (const template of templates) {
    for (const gameTopic of gameTopics) {
      // Extract key noun from game topic (e.g., "Malenia" from "Malenia Strategy")
      const keyNouns = gameTopic.split(/[\s\-–—:,]+/).filter(w => w.length > 3 && !['guide', 'strategy', 'tips', 'best', 'complete', 'all'].includes(w.toLowerCase()));
      
      for (const noun of keyNouns) {
        const topic = template
          .replace('{Boss}', noun)
          .replace('{Archetype}', noun)
          .replace('{Item}', noun)
          .replace('{Area}', noun)
          .replace('{Chapter}', noun)
          .replace('{Content}', noun)
          .replace('{Ending}', noun)
          .replace('{Game}', gameName);

        // Check uniqueness
        const topicLower = topic.toLowerCase();
        const isDuplicate = existingLower.some(et => {
          const overlap = topicLower.split(/\s+/).filter(w => et.toLowerCase().includes(w)).length;
          return overlap / topicLower.split(/\s+/).length > 0.6;
        });

        if (!isDuplicate) return topic;
      }
    }
  }

  // Fallback: use template with game name
  const template = templates[Math.floor(Math.random() * templates.length)];
  return template
    .replace('{Boss}', gameName)
    .replace('{Archetype}', 'Meta')
    .replace('{Item}', 'Collectible')
    .replace('{Area}', 'Endgame')
    .replace('{Chapter}', 'Final')
    .replace('{Content}', 'Secret')
    .replace('{Ending}', 'True')
    .replace('{Game}', gameName);
}

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

    // ========================================
    // P0: TIER-BASED GENERATION
    // Only generate for tier-1 games, 1 article per game
    // ========================================
    
    // Get all games
    const gamesResult = await query(
      `SELECT id, name, slug, genre, description FROM games ORDER BY name`
    );
    const allGames = gamesResult.rows;

    if (allGames.length === 0) {
      return NextResponse.json({ success: false, message: 'No games found in database.' });
    }

    // Classify games by tier
    const tier1Slugs: readonly string[] = GAME_TIER_LIST.tier1;
    const tier2Slugs: readonly string[] = GAME_TIER_LIST.tier2;
    const tier1Games = allGames.filter((g: { slug: string }) => tier1Slugs.includes(g.slug));
    const tier2Games = allGames.filter((g: { slug: string }) => tier2Slugs.includes(g.slug));
    const tier3Games = allGames.filter((g: { slug: string }) => 
      !tier1Slugs.includes(g.slug) && !tier2Slugs.includes(g.slug)
    );

    // Build today's generation queue
    // Tier 1: 2 articles each, Tier 2: 1 article each, Tier 3: skip today
    // But rotate tier 2: only 3 tier-2 games per day
    const dayOfWeek = new Date().getDay(); // 0-6
    const tier2Slice = tier2Games.slice(
      dayOfWeek * 3 % tier2Games.length,
      (dayOfWeek * 3 + 3) % Math.max(tier2Games.length, 1)
    );
    // Handle wrap-around for small arrays
    const tier2Today = tier2Games.length <= 3 
      ? tier2Games 
      : [...tier2Slice, ...tier2Games.slice(0, Math.max(0, 3 - tier2Slice.length))].slice(0, 3);

    type GameWithQuota = { id: number; name: string; slug: string; genre: string | null; description: string | null; quota: number };
    const generationQueue: GameWithQuota[] = [
      ...tier1Games.map((g: { id: number; name: string; slug: string; genre: string | null; description: string | null }) => ({ ...g, quota: 2 })),
      ...tier2Today.map((g: { id: number; name: string; slug: string; genre: string | null; description: string | null }) => ({ ...g, quota: 1 })),
    ];

    // If no tier1/tier2 games matched, fall back to first 5 games
    if (generationQueue.length === 0) {
      generationQueue.push(...allGames.slice(0, 5).map((g: { id: number; name: string; slug: string; genre: string | null; description: string | null }) => ({ ...g, quota: 1 })));
    }

    const totalPlanned = generationQueue.reduce((sum, g) => sum + g.quota, 0);
    let totalGenerated = 0;
    let totalFailed = 0;

    // All 5 guide types for rotation
    const ALL_GUIDE_TYPES: GuideType[] = ['boss', 'build', 'collectible', 'walkthrough', 'tips'];

    for (const game of generationQueue) {
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

      for (let i = 0; i < game.quota; i++) {
        const guideType = sortedTypes[i % sortedTypes.length];
        let topic: string | null = null;
        let resolvedGuideType = guideType;

        // Strategy 1: Question-driven topic (P0 - highest priority)
        const questionTopic = getQuestionTopic(gameSlug, guideType, gameName, existingTitles);
        if (questionTopic) {
          topic = questionTopic;
        }

        // Strategy 2: Trending topics
        if (!topic) {
          const trending = getTrendingTopicsForGame(gameSlug);
          for (const t of trending) {
            if (t.guideType === guideType) {
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
        }

        // Strategy 3: Auto-selected topic from game-utils
        if (!topic) {
          const result = getTopicForGeneration(gameSlug, guideType, existingTitles);
          if (result) {
            topic = result.topic;
            resolvedGuideType = result.guideType;
          }
        }

        // Last fallback
        if (!topic) {
          topic = `${gameName} Expert ${guideType} Guide (2025)`;
        }

        try {
          // ========================================
          // P0: UPGRADED CONTENT GENERATION
          // ========================================
          const guideConfig = getGuideTypeConfig(resolvedGuideType);
          const guideTypeLabel = guideConfig?.label || 'Guide';
          const trending = getTrendingTopicsForGame(gameSlug);
          const seoKeywords = [
            ...(guideConfig?.keywords || []),
            ...(trending.slice(0, 2).flatMap(t => t.keywords)),
          ].slice(0, 6);

          const config = new Config();
          const llmClient = new LLMClient(config);

          const userPrompt = `Write a DEFINITIVE, DEEP-DIVE ${guideTypeLabel} that ANSWERS this specific question: "${topic}" for "${gameName}" (${game.genre || 'Action RPG'}).

GAME CONTEXT: ${game.description || `${gameName} is a blockbuster AAA title.`}

GUIDE TYPE: ${guideTypeLabel}
${guideConfig?.promptSuffix || ''}

CRITICAL SEO REQUIREMENTS:
1. Title MUST be a specific question or answer format that matches what players Google:
   - GOOD: "How to Beat Malenia Without Summons in Elden Ring (2025)"
   - GOOD: "Elden Ring Best Bleed Build for DLC Bosses (2025)"
   - BAD: "Elden Ring Boss Guide" (too generic)
   - BAD: "Complete Elden Ring Guide" (too broad)
2. Naturally weave these keywords: ${seoKeywords.join(', ')}
3. Use search-intent phrases: "how to", "best way to", "where to find", "how to unlock", "is it worth"
4. Meta title: under 60 chars, specific question + game name
5. Meta description: 150-160 chars, answer the question directly + tease the solution

CONTENT DEPTH REQUIREMENTS (CRITICAL - THIS IS WHAT SEPARATES US FROM WIKIS):
1. OPEN WITH THE ANSWER - In the first paragraph, give the reader the direct answer to their question. Don't bury it.
2. SPECIFIC NUMBERS - Damage values, HP thresholds, stat breakpoints, stamina costs, frame data. No "high damage" - say "deals 1,247 damage per hit at +25 upgrade"
3. STEP-BY-STEP EXECUTION - Break the strategy into numbered steps a reader can follow in real-time while playing
4. COMPARISON TABLES - Compare options with exact stats: damage, speed, range, stamina cost, requirements
5. TIER RANKINGS - S/A/B/C/D with one-line justification for each
6. COMMON MISTAKES - 5+ REAL mistakes players make (not generic "be careful")
7. PRO TIPS - Advanced tricks that separate good from great players
8. ALTERNATIVE STRATEGIES - Not everyone plays the same way, provide 2-3 viable approaches
9. 3000-5000 words, HTML formatted. Every paragraph teaches something new.
10. Include 2025 in the title for builds/tier lists
11. Add internal link suggestions: "See also: [related guide topic]" at relevant points

Format your response as JSON:
{
  "title": "...",
  "content": "...(HTML content, 3000-5000 words)...",
  "summary": "...(2-3 sentence hook that answers the core question)...",
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
            temperature: 0.7,
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
              summary: `Expert ${guideTypeLabel.toLowerCase()} for ${gameName} answering: ${topic.toLowerCase()}.`,
              meta_title: `${gameName} ${topic} - ${guideTypeLabel}`,
              meta_description: `Master ${gameName} with our expert ${guideTypeLabel.toLowerCase()} on ${topic.toLowerCase()}.`,
              keywords: [gameName.toLowerCase(), topic.toLowerCase(), guideTypeLabel.toLowerCase(), 'guide'],
            };
          }

          // Insert article directly as 'published' status
          const baseSlug = generateSlug(articleData.title);
          const slugSuffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
          const slug = `${baseSlug}-${slugSuffix}`;

          const insertResult = await query(
            `INSERT INTO articles (game_id, title, slug, content, summary, status, language, meta_title, meta_description, keywords, author, published_at)
             VALUES ($1, $2, $3, $4, $5, 'published', 'en', $6, $7, $8, '3A Game Master', NOW())
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
        tier1Games: tier1Games.map((g: { name: string }) => g.name),
        tier2GamesToday: tier2Today.map((g: { name: string }) => g.name),
        tier3Skipped: tier3Games.map((g: { name: string }) => g.name),
        totalPlanned,
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
