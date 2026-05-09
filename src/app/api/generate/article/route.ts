import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getClient } from '@/lib/db';
import { GAME_TOPICS, generateSlug } from '@/lib/game-utils';

const SYSTEM_PROMPT = `You are an expert gaming content writer specializing in AAA game guides for an international English-speaking audience. Your writing style should be:

1. Professional yet engaging - like a seasoned gaming journalist
2. Data-driven with specific numbers, percentages, and stats where applicable
3. Formatted for web readability with clear headers, bullet points, and numbered lists
4. SEO-optimized with natural keyword integration
5. Written in American English with gaming industry terminology

Your article structure should follow this format:
- Compelling introduction that hooks the reader (2-3 paragraphs)
- Main content sections with H2 headers
- Sub-sections with H3 headers where needed
- Practical tips in callout format
- Summary/conclusion with key takeaways

Always use HTML formatting for the content (h2, h3, p, ul, li, strong, em tags).
Include specific game mechanics, numbers, and actionable advice.
Write for an audience that plays on all platforms (PC, PlayStation, Xbox, Nintendo).
Use imperial units (miles, feet) alongside metric where relevant.`;

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
    const client = getClient();
    const { data: game, error: gameError } = await client
      .from('games')
      .select('id, name, slug, genre, description')
      .eq('id', gameId)
      .maybeSingle();
    if (gameError) throw new Error(`Failed to fetch game: ${gameError.message}`);

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    const gameSlug = game.slug as string;

    // Get available topics for this game
    const availableTopics = GAME_TOPICS[gameSlug] || [];
    const selectedTopic = topic || availableTopics[Math.floor(Math.random() * availableTopics.length)] || 'General gameplay guide';

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const llmClient = new LLMClient(config, customHeaders);

    const userPrompt = `Write a comprehensive, SEO-optimized gaming guide article about "${selectedTopic}" for the game "${game.name}" (${game.genre || 'Action RPG'}).

Game context: ${game.description || `${game.name} is a popular AAA game.`}

Requirements:
1. Title should be compelling and include the game name
2. Include at least 4 main sections with H2 headers
3. Use specific numbers, stats, and data points
4. Include practical, actionable tips
5. Write for an international English-speaking audience
6. Optimize for search engines with natural keyword usage
7. Article should be 1500-2500 words
8. Format in HTML (h2, h3, p, ul, li, strong, em tags only)

Also provide:
- A concise summary (150-200 characters) for meta description
- A list of 5-8 relevant keywords/tags
- An SEO-optimized meta title (under 60 characters)

Format your response as JSON with these fields:
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
        summary: `Comprehensive guide for ${game.name} covering ${selectedTopic.toLowerCase()}.`,
        meta_title: `${game.name} Guide - ${selectedTopic}`,
        meta_description: `Expert guide for ${game.name}. Learn about ${selectedTopic.toLowerCase()} with detailed strategies and tips.`,
        keywords: [game.name.toLowerCase(), selectedTopic.toLowerCase(), 'guide', (game.genre as string)?.toLowerCase() || 'rpg'],
      };
    }

    // Generate a unique slug
    const baseSlug = generateSlug(articleData.title);
    const slugSuffix = Date.now().toString(36);
    const slug = `${baseSlug}-${slugSuffix}`;

    // Insert the article
    const { data: inserted, error: insertError } = await client
      .from('articles')
      .insert({
        game_id: gameId,
        title: articleData.title,
        slug,
        content: articleData.content,
        summary: articleData.summary,
        status: 'generated',
        language,
        meta_title: articleData.meta_title,
        meta_description: articleData.meta_description,
        keywords: articleData.keywords,
        author: 'AI Editor',
      })
      .select('id');
    if (insertError) throw new Error(`Failed to insert article: ${insertError.message}`);

    const articleId = inserted?.[0]?.id;

    // Log the generation
    await client.from('generation_logs').insert({
      article_id: articleId,
      game_id: gameId,
      prompt: userPrompt.slice(0, 500),
      model: 'doubao-seed-2-0-lite-260215',
    });

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
