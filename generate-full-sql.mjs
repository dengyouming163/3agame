// 生成完整数据库导入SQL文件（含建表+数据）
// 运行: node generate-full-sql.mjs
import { Client } from 'pg';
import { writeFileSync } from 'fs';

const DEV_DB = process.env.DATABASE_URL || process.env.PGDATABASE_URL;

async function main() {
  const client = new Client({ connectionString: DEV_DB, ssl: false });
  await client.connect();
  console.log('连接成功');

  const lines = [];

  // 1. 建表
  lines.push(`-- 3AGameMaster 完整数据库导入文件
-- 可通过宝塔面板 phpPgAdmin 或 psql 导入
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

  // 2. 导出games
  console.log('导出games...');
  const games = await client.query('SELECT * FROM games ORDER BY id');
  for (const g of games.rows) {
    const esc = (v) => v === null ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'";
    lines.push(`INSERT INTO games (id, name, slug, genre, platform, release_date, description, cover_image_key, created_at, updated_at) VALUES (${g.id}, ${esc(g.name)}, ${esc(g.slug)}, ${esc(g.genre)}, ${esc(g.platform)}, ${g.release_date ? "'" + g.release_date.toISOString() + "'" : 'NULL'}, ${esc(g.description)}, ${esc(g.cover_image_key)}, ${esc(g.created_at?.toISOString())}, ${esc(g.updated_at?.toISOString())});`);
  }
  lines.push(`SELECT setval('games_id_seq', (SELECT MAX(id) FROM games));\n`);

  // 3. 导出articles（逐条）
  console.log('导出articles...');
  const totalArticles = await client.query('SELECT COUNT(*) c FROM articles');
  const total = parseInt(totalArticles.rows[0].c);
  const batchSize = 5;
  let exported = 0;

  for (let offset = 0; offset < total; offset += batchSize) {
    const batch = await client.query('SELECT * FROM articles ORDER BY id LIMIT $1 OFFSET $2', [batchSize, offset]);
    for (const a of batch.rows) {
      const esc = (v) => v === null ? 'NULL' : "'" + String(v).replace(/'/g, "''") + "'";
      const keywords = a.keywords ? `ARRAY[${a.keywords.map(k => "'" + k.replace(/'/g, "''") + "'").join(',')}]` : 'NULL';
      lines.push(`INSERT INTO articles (id, game_id, title, slug, content, summary, status, language, meta_title, meta_description, keywords, author, cover_image_key, published_at, scheduled_at, created_at, updated_at) VALUES (${a.id}, ${a.game_id ?? 'NULL'}, ${esc(a.title)}, ${esc(a.slug)}, ${esc(a.content)}, ${esc(a.summary)}, ${esc(a.status)}, ${esc(a.language)}, ${esc(a.meta_title)}, ${esc(a.meta_description)}, ${keywords}, ${esc(a.author)}, ${esc(a.cover_image_key)}, ${a.published_at ? "'" + a.published_at.toISOString() + "'" : 'NULL'}, ${a.scheduled_at ? "'" + a.scheduled_at.toISOString() + "'" : 'NULL'}, ${a.created_at ? "'" + a.created_at.toISOString() + "'" : 'NULL'}, ${a.updated_at ? "'" + a.updated_at.toISOString() + "'" : 'NULL'});`);
      exported++;
    }
    process.stdout.write(`  ${exported}/${total}...\n`);
  }
  lines.push(`SELECT setval('articles_id_seq', (SELECT MAX(id) FROM articles));\n`);

  // 写入文件
  const outputPath = '/workspace/projects/full-database.sql';
  writeFileSync(outputPath, lines.join('\n'), 'utf-8');
  const sizeKB = (Buffer.byteLength(lines.join('\n'), 'utf-8') / 1024).toFixed(0);
  console.log(`\n完成! 文件: ${outputPath} (${sizeKB} KB)`);
  console.log(`Games: ${games.rows.length}, Articles: ${exported}`);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
