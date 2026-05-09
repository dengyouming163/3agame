// 通过API读取开发数据 → 写入生产数据库
// 运行: node import-to-prod.js

const { Client } = require('pg');

const PROD_DB = 'postgresql://aaagame:dengyouming2tll@132.232.166.40:15432/aaagame';
const API = 'http://localhost:5000';

const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  genre VARCHAR(100),
  platform VARCHAR(255),
  release_date TIMESTAMP WITH TIME ZONE,
  description TEXT,
  cover_image_key VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  content TEXT,
  summary TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  language VARCHAR(10) DEFAULT 'en',
  meta_title VARCHAR(500),
  meta_description TEXT,
  keywords TEXT[],
  author VARCHAR(100) DEFAULT 'AI Editor',
  cover_image_key VARCHAR(500),
  published_at TIMESTAMP WITH TIME ZONE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS publish_queue (
  id SERIAL PRIMARY KEY,
  article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generation_logs (
  id SERIAL PRIMARY KEY,
  article_id INTEGER,
  game_id INTEGER,
  prompt TEXT,
  model VARCHAR(100),
  tokens_used INTEGER,
  generation_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'success',
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  path VARCHAR(500) NOT NULL,
  referrer VARCHAR(500),
  country VARCHAR(10),
  user_agent VARCHAR(500),
  ip_hash VARCHAR(64),
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_stats (
  id SERIAL PRIMARY KEY,
  stat_date DATE NOT NULL UNIQUE,
  page_views INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  top_pages JSONB DEFAULT '[]',
  top_referrers JSONB DEFAULT '[]',
  top_countries JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_visited_at ON page_views(visited_at);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_ip_hash ON page_views(ip_hash);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_game_id ON articles(game_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
`;

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function main() {
  console.log('=== 3AGameMaster 数据迁移 (API → 生产库) ===\n');

  const prodClient = new Client({ connectionString: PROD_DB, ssl: false, connectionTimeoutMillis: 15000 });

  try {
    await prodClient.connect();
    console.log('1. 生产数据库连接成功\n');

    // 建表
    console.log('2. 创建表...');
    await prodClient.query(CREATE_TABLES);
    console.log('   建表完成\n');

    // 获取games
    console.log('3. 迁移games...');
    const gamesData = await fetchJSON(`${API}/api/games?limit=100`);
    const games = gamesData.games || gamesData;
    for (const g of games) {
      await prodClient.query(
        `INSERT INTO games (id, name, slug, genre, platform, release_date, description, cover_image_key, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (slug) DO NOTHING`,
        [g.id, g.name, g.slug, g.genre, g.platform, g.release_date, g.description, g.cover_image_key, g.created_at, g.updated_at]
      );
    }
    console.log(`   迁移 ${games.length} 个游戏\n`);

    // 获取articles（列表 + 逐条详情获取完整content）
    console.log('4. 迁移articles...');
    let allArticles = [];
    let offset = 0;
    const limit = 50;

    // 先获取所有文章列表
    while (true) {
      const data = await fetchJSON(`${API}/api/articles?limit=${limit}&offset=${offset}`);
      const articles = data.articles || data;
      if (articles.length === 0) break;
      allArticles = allArticles.concat(articles);
      offset += limit;
      if (articles.length < limit) break;
    }
    console.log(`   列表获取 ${allArticles.length} 篇文章`);

    // 检查列表API是否返回了完整content
    const hasContent = allArticles[0]?.content && allArticles[0].content.length > 200;
    console.log(`   列表API ${hasContent ? '已包含' : '未包含'} 完整内容`);

    // 逐条插入
    let inserted = 0;
    for (const a of allArticles) {
      // 如果列表没有完整content，获取详情
      if (!hasContent) {
        try {
          const detail = await fetchJSON(`${API}/api/articles/${a.id}`);
          const full = detail.article || detail;
          a.content = full.content || a.content;
        } catch (e) {
          // 忽略，用列表数据
        }
      }

      await prodClient.query(
        `INSERT INTO articles (id, game_id, title, slug, content, summary, status, language, meta_title, meta_description, keywords, author, cover_image_key, published_at, scheduled_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (slug) DO NOTHING`,
        [a.id, a.game_id, a.title, a.slug, a.content, a.summary, a.status, a.language, a.meta_title, a.meta_description, a.keywords, a.author, a.cover_image_key, a.published_at, a.scheduled_at, a.created_at, a.updated_at]
      );
      inserted++;
      if (inserted % 10 === 0) process.stdout.write(`   ${inserted}/${allArticles.length}...\n`);
    }
    console.log(`   迁移 ${inserted} 篇文章\n`);

    // 重置序列
    await prodClient.query("SELECT setval('games_id_seq', (SELECT COALESCE(MAX(id), 1) FROM games))");
    await prodClient.query("SELECT setval('articles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM articles))");

    // 验证
    console.log('5. 验证结果:');
    const pg = await prodClient.query('SELECT COUNT(*) c FROM games');
    const pa = await prodClient.query('SELECT COUNT(*) c FROM articles');
    const pp = await prodClient.query("SELECT COUNT(*) c FROM articles WHERE status='published'");
    console.log(`   游戏: ${pg.rows[0].c}`);
    console.log(`   文章: ${pa.rows[0].c} (已发布: ${pp.rows[0].c})`);

    const stats = await prodClient.query(`
      SELECT g.name, COUNT(a.id) n FROM games g LEFT JOIN articles a ON a.game_id=g.id
      GROUP BY g.id, g.name ORDER BY n DESC
    `);
    console.log('\n   各游戏文章数:');
    stats.rows.forEach(r => console.log(`   - ${r.name}: ${r.n}`));

    console.log('\n=== 迁移完成 ===');

  } catch (e) {
    console.error('\n迁移失败:', e.message);
    console.error(e.stack);
    process.exit(1);
  } finally {
    await prodClient.end();
  }
}

main();
