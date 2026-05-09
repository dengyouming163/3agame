/**
 * Fix articles with JSON-wrapped content
 * Extracts pure HTML from {"title":"...", "content":"<html>..."} format
 */
import { query } from '../src/lib/db';

function extractHtmlFromJson(rawContent: string): { content: string; title?: string; summary?: string; meta_title?: string; meta_description?: string; keywords?: string[] } {
  const trimmed = rawContent.trim();
  
  // Not JSON - already HTML
  if (!trimmed.startsWith('{')) {
    return { content: rawContent };
  }

  // Try proper JSON parse first
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.content) {
      return {
        content: parsed.content,
        title: parsed.title,
        summary: parsed.summary,
        meta_title: parsed.meta_title,
        meta_description: parsed.meta_description,
        keywords: parsed.keywords,
      };
    }
  } catch {
    // JSON is truncated/malformed - need manual extraction
  }

  // Manual extraction from broken JSON
  let extractedContent = rawContent;

  // Try to extract "content" field value
  const contentMatch = trimmed.match(/"content"\s*:\s*"([\s\S]*)/);
  if (contentMatch) {
    let raw = contentMatch[1];
    
    // Remove trailing JSON artifacts - look for the closing quote of content field
    // The content field ends with an unescaped quote followed by comma or closing brace
    // We need to find the LAST valid HTML ending before the next JSON field
    
    // Strategy: find patterns like ","summary" or ","meta_title" which mark end of content
    const endPatterns = [
      /,"\s*summary"\s*:/,
      /,"\s*meta_title"\s*:/,
      /,"\s*meta_description"\s*:/,
      /,"\s*keywords"\s*:/,
      /"\s*\}\s*$/,
    ];
    
    let endIdx = raw.length;
    for (const pattern of endPatterns) {
      const match = raw.match(pattern);
      if (match && match.index !== undefined && match.index < endIdx) {
        endIdx = match.index;
      }
    }
    
    raw = raw.substring(0, endIdx);
    
    // Unescape JSON string escapes
    extractedContent = raw
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\\//g, '/');
  }

  // Extract other fields
  const titleMatch = trimmed.match(/"title"\s*:\s*"([^"]*)"/);
  const summaryMatch = trimmed.match(/"summary"\s*:\s*"([^"]*)"/);
  const metaTitleMatch = trimmed.match(/"meta_title"\s*:\s*"([^"]*)"/);
  const metaDescMatch = trimmed.match(/"meta_description"\s*:\s*"([^"]*)"/);
  const keywordsMatch = trimmed.match(/"keywords"\s*:\s*\[([\s\S]*?)\]/);

  return {
    content: extractedContent,
    title: titleMatch ? titleMatch[1] : undefined,
    summary: summaryMatch ? summaryMatch[1] : undefined,
    meta_title: metaTitleMatch ? metaTitleMatch[1] : undefined,
    meta_description: metaDescMatch ? metaDescMatch[1] : undefined,
    keywords: keywordsMatch ? JSON.parse(`[${keywordsMatch[1]}]`) : undefined,
  };
}

async function main() {
  console.log('Fetching articles with JSON content...');
  
  const result = await query(`
    SELECT id, content, title, summary, meta_title, meta_description, keywords
    FROM articles 
    WHERE content LIKE '{"title":%' OR content LIKE '{%"title"%'
    ORDER BY id
  `);
  
  console.log(`Found ${result.rows.length} articles with JSON content`);
  
  let fixed = 0;
  let errors = 0;
  
  for (const row of result.rows) {
    try {
      const extracted = extractHtmlFromJson(row.content);
      
      // Build update query - only update fields that were successfully extracted
      const updates: string[] = ['content = $2'];
      const values: unknown[] = [row.id, extracted.content];
      let paramIdx = 3;
      
      if (extracted.title && extracted.title !== row.title) {
        updates.push(`title = $${paramIdx}`);
        values.push(extracted.title);
        paramIdx++;
      }
      if (extracted.summary && (!row.summary || row.summary.length < 10)) {
        updates.push(`summary = $${paramIdx}`);
        values.push(extracted.summary);
        paramIdx++;
      }
      if (extracted.meta_title && (!row.meta_title || row.meta_title.length < 5)) {
        updates.push(`meta_title = $${paramIdx}`);
        values.push(extracted.meta_title);
        paramIdx++;
      }
      if (extracted.meta_description && (!row.meta_description || row.meta_description.length < 10)) {
        updates.push(`meta_description = $${paramIdx}`);
        values.push(extracted.meta_description);
        paramIdx++;
      }
      if (extracted.keywords && extracted.keywords.length > 0) {
        updates.push(`keywords = $${paramIdx}`);
        values.push(JSON.stringify(extracted.keywords));
        paramIdx++;
      }
      
      await query(
        `UPDATE articles SET ${updates.join(', ')} WHERE id = $1`,
        values
      );
      
      fixed++;
      if (fixed % 10 === 0) {
        console.log(`Fixed ${fixed}/${result.rows.length} articles...`);
      }
    } catch (err) {
      errors++;
      console.error(`Error fixing article ${row.id}:`, err);
    }
  }
  
  console.log(`\nDone! Fixed: ${fixed}, Errors: ${errors}`);
}

main().catch(console.error);
