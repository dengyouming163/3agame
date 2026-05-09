// 导入articles到生产库（分批，后台友好）
// 运行: node import-articles.js

const { Client } = require('pg');
const API = 'http://localhost:5000';
const PROD_DB = 'postgresql://aaagame:dengyouming2tll@132.232.166.40:15432/aaagame';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const prodClient = new Client({ connectionString: PROD_DB, ssl: false, connectionTimeoutMillis: 30000, query_timeout: 60000 });

  try {
    await prodClient.connect();

    // 先检查已有多少篇
    const existing = await prodClient.query('SELECT COUNT(*) c FROM articles');
    const existingCount = parseInt(existing.rows[0].c);
    console.log(`已有文章: ${existingCount}`);

    // 获取文章列表
    const data = await fetchJSON(`${API}/api/articles?limit=100&offset=0`);
    const articles = data.articles || data;
    console.log(`待迁移: ${articles.length} 篇`);

    // 检查列表是否有完整content
    const hasContent = articles[0]?.content && articles[0].content.length > 200;
    console.log(`列表API ${hasContent ? '有' : '无'} 完整内容`);

    let inserted = 0;
    let skipped = 0;

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];

      // 获取详情（确保有完整content）
      if (!hasContent || !a.content || a.content.length < 200) {
        try {
          const detail = await fetchJSON(`${API}/api/articles/${a.id}`);
          const full = detail.article || detail;
          a.content = full.content || a.content;
        } catch (e) {
          console.log(`  [${i+1}] 获取详情失败: ${a.id}`);
        }
      }

      try {
        await prodClient.query(
          `INSERT INTO articles (id, game_id, title, slug, content, summary, status, language, meta_title, meta_description, keywords, author, cover_image_key, published_at, scheduled_at, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
           ON CONFLICT (slug) DO NOTHING`,
          [a.id, a.game_id, a.title, a.slug, a.content, a.summary, a.status, a.language, a.meta_title, a.meta_description, a.keywords, a.author, a.cover_image_key, a.published_at, a.scheduled_at, a.created_at, a.updated_at]
        );
        inserted++;
      } catch (e) {
        skipped++;
        if (skipped <= 3) console.log(`  [${i+1}] 插入失败: ${e.message.substring(0, 60)}`);
      }

      if ((i + 1) % 5 === 0) console.log(`  进度: ${i + 1}/${articles.length} (插入:${inserted} 跳过:${skipped})`);
    }

    // 重置序列
    await prodClient.query("SELECT setval('articles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM articles))");

    // 最终验证
    const finalCount = await prodClient.query('SELECT COUNT(*) c FROM articles');
    const pubCount = await prodClient.query("SELECT COUNT(*) c FROM articles WHERE status='published'");
    console.log(`\n完成! 总文章: ${finalCount.rows[0].c}, 已发布: ${pubCount.rows[0].c}, 本次插入: ${inserted}, 跳过: ${skipped}`);

  } catch (e) {
    console.error('失败:', e.message);
    process.exit(1);
  } finally {
    await prodClient.end();
  }
}

main();
