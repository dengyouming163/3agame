// 通过项目API读取数据并生成完整SQL
// 运行: node generate-full-sql-v2.mjs

import { writeFileSync } from 'fs';

const BASE = 'http://localhost:5000';

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  return "'" + String(v).replace(/'/g, "''") + "'";
}

async function main() {
  console.log('=== 生成完整数据库SQL ===\n');

  const lines = [];

  // 1. 建表DDL
  lines.push(`-- 3AGameMaster 完整数据库导入文件
-- 宝塔面板 phpPgAdmin 直接导入
-- 生成时间: ${new Date().toISOString()}

DROP TABLE IF EXISTS publish_queue CASCADE;
DROP TABLE IF EXISTS generation_logs CASCADE;
DROP TABLE IF EXISTS page_views CASCADE;
DROP TABLE IF EXISTS daily_stats CASCADE;
DROP TABLE IF EXISTS articles CASCADE;
DROP TABLE IF EXISTS games CASCADE;

CREATE TABLE games (
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

CREATE TABLE articles (
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

CREATE TABLE publish_queue (
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

CREATE TABLE generation_logs (
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

CREATE TABLE page_views (
  id SERIAL PRIMARY KEY,
  path VARCHAR(500) NOT NULL,
  referrer VARCHAR(500),
  country VARCHAR(10),
  user_agent VARCHAR(500),
  ip_hash VARCHAR(64),
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE daily_stats (
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

`);

  // 2. 获取games
  console.log('1. 获取games...');
  const gamesData = await fetchJSON(`${BASE}/api/games?limit=100`);
  const games = gamesData.games || gamesData;
  console.log(`   获取到 ${games.length} 个游戏`);

  for (const g of games) {
    lines.push(`INSERT INTO games (id, name, slug, genre, platform, release_date, description, cover_image_key, created_at, updated_at) VALUES (${g.id}, ${esc(g.name)}, ${esc(g.slug)}, ${esc(g.genre)}, ${esc(g.platform)}, ${g.release_date ? esc(g.release_date) : 'NULL'}, ${esc(g.description)}, ${esc(g.cover_image_key)}, ${esc(g.created_at)}, ${esc(g.updated_at)});`);
  }
  lines.push(`SELECT setval('games_id_seq', (SELECT MAX(id) FROM games));\n`);

  // 3. 获取articles（API有分页，每次50篇）
  console.log('2. 获取articles...');
  let allArticles = [];
  let page = 0;
  const pageSize = 50;
  while (true) {
    const data = await fetchJSON(`${BASE}/api/articles?limit=${pageSize}&offset=${page * pageSize}`);
    const articles = data.articles || data;
    if (articles.length === 0) break;
    allArticles = allArticles.concat(articles);
    console.log(`   已获取 ${allArticles.length} 篇...`);
    if (articles.length < pageSize) break;
    page++;
  }
  console.log(`   总共 ${allArticles.length} 篇文章`);

  // 4. 对于每篇文章，需要获取完整content（列表API可能截断）
  console.log('3. 获取文章完整内容...');
  for (let i = 0; i < allArticles.length; i++) {
    const a = allArticles[i];
    // 如果content已经很长，说明列表API返回了完整内容
    if (!a.content || a.content.length < 100) {
      try {
        const detail = await fetchJSON(`${BASE}/api/articles/${a.id}`);
        allArticles[i] = detail.article || detail;
        console.log(`   [${i + 1}/${allArticles.length}] 获取详情: ${a.title.substring(0, 40)}...`);
      } catch (e) {
        console.log(`   [${i + 1}] 获取详情失败: ${e.message}`);
      }
    } else {
      if ((i + 1) % 10 === 0) console.log(`   [${i + 1}/${allArticles.length}] 已有完整内容`);
    }
  }

  // 5. 生成INSERT语句
  console.log('4. 生成SQL...');
  for (const a of allArticles) {
    const keywords = a.keywords && Array.isArray(a.keywords) && a.keywords.length > 0
      ? `ARRAY[${a.keywords.map(k => "'" + String(k).replace(/'/g, "''") + "'").join(',')}]`
      : 'NULL';
    lines.push(`INSERT INTO articles (id, game_id, title, slug, content, summary, status, language, meta_title, meta_description, keywords, author, cover_image_key, published_at, scheduled_at, created_at, updated_at) VALUES (${a.id}, ${a.game_id ?? 'NULL'}, ${esc(a.title)}, ${esc(a.slug)}, ${esc(a.content)}, ${esc(a.summary)}, ${esc(a.status)}, ${esc(a.language)}, ${esc(a.meta_title)}, ${esc(a.meta_description)}, ${keywords}, ${esc(a.author)}, ${esc(a.cover_image_key)}, ${a.published_at ? esc(a.published_at) : 'NULL'}, ${a.scheduled_at ? esc(a.scheduled_at) : 'NULL'}, ${esc(a.created_at)}, ${esc(a.updated_at)});`);
  }
  lines.push(`SELECT setval('articles_id_seq', (SELECT MAX(id) FROM articles));\n`);

  // 写入文件
  const outputPath = '/workspace/projects/full-database.sql';
  const content = lines.join('\n');
  writeFileSync(outputPath, content, 'utf-8');
  const sizeKB = (Buffer.byteLength(content, 'utf-8') / 1024).toFixed(0);
  console.log(`\n完成! 文件: ${outputPath}`);
  console.log(`大小: ${sizeKB} KB`);
  console.log(`Games: ${games.length}, Articles: ${allArticles.length}`);

  await Promise.resolve();
}

main().catch(e => { console.error('失败:', e); process.exit(1); });
