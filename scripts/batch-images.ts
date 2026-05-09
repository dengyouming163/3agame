/**
 * Batch generate cover images for articles that don't have one.
 * Run with: npx tsx scripts/batch-images.ts
 */
import { ImageGenerationClient, Config } from 'coze-coding-dev-sdk';
import { getStorage } from '../src/lib/storage';
import { query } from '../src/lib/db';

// Build image prompt based on game name, guide type keywords, and article title
function buildImagePrompt(gameName: string, keywords: string[] | null, title: string): string {
  const kw = keywords?.join(' ').toLowerCase() || '';
  
  let styleHint = 'dark epic video game artwork';
  if (kw.includes('boss') || kw.includes('fight') || kw.includes('defeat') || kw.includes('battle')) {
    styleHint = 'epic boss battle scene, dramatic combat moment, two powerful figures clashing';
  } else if (kw.includes('build') || kw.includes('class') || kw.includes('loadout') || kw.includes('weapon')) {
    styleHint = 'powerful warrior character showcase, detailed equipment and weapons display, character build concept art';
  } else if (kw.includes('collect') || kw.includes('location') || kw.includes('find') || kw.includes('hidden')) {
    styleHint = 'mysterious game world landscape, hidden treasures glowing in the darkness, exploration scene';
  } else if (kw.includes('walkthrough') || kw.includes('guide') || kw.includes('progress')) {
    styleHint = 'cinematic game environment overview, path through epic landscape, journey concept art';
  } else if (kw.includes('tip') || kw.includes('trick') || kw.includes('secret')) {
    styleHint = 'gameplay action moment, dynamic combat technique, skill demonstration scene';
  }

  return `${styleHint} for "${gameName}". ${title}. Cinematic digital painting, dramatic lighting with neon purple and cyan accents on deep black background. Professional AAA game key art quality, ultra detailed, 16:9 aspect ratio, no text, no watermarks.`;
}

async function main() {
  console.log('Starting batch image generation...');
  
  // Get all articles without cover images
  const result = await query(
    `SELECT a.id, a.title, a.keywords, g.name as game_name 
     FROM articles a 
     LEFT JOIN games g ON a.game_id = g.id 
     WHERE a.cover_image_key IS NULL 
     ORDER BY a.id`
  );
  
  const articles = result.rows as Array<{
    id: number;
    title: string;
    keywords: string[] | null;
    game_name: string | null;
  }>;
  
  console.log(`Found ${articles.length} articles without cover images`);
  
  const config = new Config();
  const imageClient = new ImageGenerationClient(config);
  const storage = getStorage();
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const gameName = article.game_name || 'Unknown Game';
    console.log(`[${i + 1}/${articles.length}] Generating image for article ${article.id}: ${article.title.substring(0, 60)}...`);
    
    try {
      const prompt = buildImagePrompt(gameName, article.keywords, article.title);
      
      const response = await imageClient.generate({
        prompt,
        size: '2K',
        watermark: false,
      });
      
      const helper = imageClient.getResponseHelper(response);
      
      if (helper.success && helper.imageUrls.length > 0) {
        const imageUrl = helper.imageUrls[0];
        const imageKey = await storage.uploadFromUrl({ url: imageUrl, timeout: 60000 });
        
        if (imageKey) {
          await query(
            `UPDATE articles SET cover_image_key = $1 WHERE id = $2`,
            [imageKey, article.id]
          );
          successCount++;
          console.log(`  ✓ Image generated and saved (key: ${imageKey})`);
        } else {
          failCount++;
          console.error(`  ✗ Failed to upload image`);
        }
      } else {
        failCount++;
        console.error(`  ✗ Image generation failed:`, helper.errorMessages);
      }
    } catch (error) {
      failCount++;
      console.error(`  ✗ Error:`, error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Small delay to avoid rate limiting
    if (i < articles.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\nBatch image generation complete: ${successCount} succeeded, ${failCount} failed`);
}

main().catch(console.error);
