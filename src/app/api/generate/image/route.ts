import { NextRequest, NextResponse } from 'next/server';
import { ImageGenerationClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { getStorage } from '@/lib/storage';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleId, prompt, gameContext } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();

    // Generate image with hardcore gaming aesthetic
    const imageClient = new ImageGenerationClient(config, customHeaders);
    const imagePrompt = `Dark epic video game artwork, cinematic digital painting, dramatic lighting with neon accents: ${prompt}. Professional game concept art style, ultra detailed, 16:9 aspect ratio, dark atmosphere with vibrant highlights`;

    const response = await imageClient.generate({
      prompt: imagePrompt,
      size: '2K',
      watermark: false,
    });

    const helper = imageClient.getResponseHelper(response);

    if (!helper.success || helper.imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'Image generation failed', details: helper.errorMessages },
        { status: 500 }
      );
    }

    const imageUrl = helper.imageUrls[0];

    // Upload to object storage for persistence
    const storage = getStorage();
    const imageKey = await storage.uploadFromUrl({
      url: imageUrl,
      timeout: 60000,
    });

    // Update article with cover image if articleId provided
    if (articleId) {
      await query(
        `UPDATE articles SET cover_image_key = $1, updated_at = NOW() WHERE id = $2`,
        [imageKey, articleId]
      );
    }

    // Generate a signed URL for immediate display
    const signedUrl = await storage.generatePresignedUrl({
      key: imageKey,
      expireTime: 86400,
    });

    return NextResponse.json({
      success: true,
      imageKey,
      imageUrl: signedUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Image generation error:', message);
    return NextResponse.json(
      { error: 'Failed to generate image', details: message },
      { status: 500 }
    );
  }
}
