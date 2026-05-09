const http = require('http');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  // Fetch all articles with content
  const data = await fetchJSON('http://localhost:5000/api/articles?limit=100&includeContent=true');
  const articles = data.articles || [];
  
  let sql = '-- 3AGameMaster Data Seed\n-- Generated automatically\n\n';
  sql += '-- Reset sequences\n';
  sql += "SELECT setval('games_id_seq', (SELECT MAX(id) FROM games));\n";
  sql += "SELECT setval('articles_id_seq', (SELECT MAX(id) FROM articles));\n\n";
  
  for (const a of articles) {
    const escapeStr = (s) => s ? s.replace(/'/g, "''").replace(/\\/g, '\\\\') : '';
    const content = escapeStr(a.content || '');
    const summary = escapeStr(a.summary || '');
    const title = escapeStr(a.title || '');
    const slug = escapeStr(a.slug || '');
    const metaTitle = escapeStr(a.meta_title || '');
    const metaDesc = escapeStr(a.meta_description || '');
    const keywords = a.keywords && a.keywords.length > 0 ? 
      `ARRAY[${a.keywords.map(k => `'${escapeStr(k)}'`).join(',')}]` : 'NULL';
    const coverKey = a.cover_image_key ? `'${escapeStr(a.cover_image_key)}'` : 'NULL';
    const publishedAt = a.published_at ? `'${a.published_at}'` : 'NULL';
    const gameId = a.game_id || 'NULL';
    
    sql += `INSERT INTO articles (id, game_id, title, slug, content, summary, status, language, meta_title, meta_description, keywords, author, cover_image_key, published_at, created_at, updated_at) VALUES (${a.id}, ${gameId}, '${title}', '${slug}', '${content}', '${summary}', '${a.status}', '${a.language || 'en'}', '${metaTitle}', '${metaDesc}', ${keywords}, '${a.author || 'AI Editor'}', ${coverKey}, ${publishedAt}, '${a.created_at}', '${a.updated_at}') ON CONFLICT (slug) DO NOTHING;\n`;
  }
  
  require('fs').writeFileSync('/workspace/projects/seed-data.sql', sql);
  console.log(`Generated seed SQL: ${articles.length} articles, ${sql.length} bytes`);
}

main().catch(console.error);
