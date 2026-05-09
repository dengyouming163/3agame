import { NextResponse } from 'next/server';

const CREATE_TABLES_SQL = `
-- Games表
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

-- Articles表
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

-- Publish Queue表
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

-- Generation Logs表
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

-- Page Views表
CREATE TABLE IF NOT EXISTS page_views (
  id SERIAL PRIMARY KEY,
  path VARCHAR(500) NOT NULL,
  referrer VARCHAR(500),
  country VARCHAR(10),
  user_agent VARCHAR(500),
  ip_hash VARCHAR(64),
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Stats表
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

-- 索引
CREATE INDEX IF NOT EXISTS idx_page_views_visited_at ON page_views(visited_at);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_page_views_ip_hash ON page_views(ip_hash);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_game_id ON articles(game_id);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
`;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { targetUrl } = body;

  // 动态导入pg
  const { Client } = await import('pg');

  // Step 1: 建表（使用当前数据库连接 - 即服务器本地的数据库）
  const localClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await localClient.connect();

    // 建表
    await localClient.query(CREATE_TABLES_SQL);
    const tablesResult = await localClient.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );

    // 检查是否已有数据
    const gamesCount = await localClient.query('SELECT COUNT(*) as count FROM games');
    const articlesCount = await localClient.query('SELECT COUNT(*) as count FROM articles');

    const existingGames = parseInt(gamesCount.rows[0].count);
    const existingArticles = parseInt(articlesCount.rows[0].count);

    // 如果已有数据，跳过导入
    if (existingGames > 0 && existingArticles > 0) {
      await localClient.end();
      return NextResponse.json({
        success: true,
        message: '数据库已有数据，跳过导入',
        tables: tablesResult.rows.map((r: { tablename: string }) => r.tablename),
        existingGames,
        existingArticles,
      });
    }

    // 如果需要从远程同步
    if (targetUrl) {
      const remoteClient = new Client({
        connectionString: targetUrl + (targetUrl.includes('?') ? '&' : '?') + 'sslmode=disable',
        ssl: false,
      });

      try {
        await remoteClient.connect();

        // 同步games
        const gamesResult = await remoteClient.query('SELECT * FROM games ORDER BY id');
        let gamesImported = 0;
        for (const game of gamesResult.rows) {
          await localClient.query(
            `INSERT INTO games (id, name, slug, genre, platform, release_date, description, cover_image_key, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (slug) DO NOTHING`,
            [game.id, game.name, game.slug, game.genre, game.platform, game.release_date, game.description, game.cover_image_key, game.created_at, game.updated_at]
          );
          gamesImported++;
        }

        // 同步articles（分批，每批10篇避免超时）
        const articlesResult = await remoteClient.query('SELECT COUNT(*) as count FROM articles');
        const totalArticles = parseInt(articlesResult.rows[0].count);
        let articlesImported = 0;
        const batchSize = 10;

        for (let offset = 0; offset < totalArticles; offset += batchSize) {
          const batch = await remoteClient.query(
            'SELECT * FROM articles ORDER BY id LIMIT $1 OFFSET $2',
            [batchSize, offset]
          );
          for (const article of batch.rows) {
            await localClient.query(
              `INSERT INTO articles (id, game_id, title, slug, content, summary, status, language, meta_title, meta_description, keywords, author, cover_image_key, published_at, scheduled_at, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
               ON CONFLICT (slug) DO NOTHING`,
              [article.id, article.game_id, article.title, article.slug, article.content, article.summary, article.status, article.language, article.meta_title, article.meta_description, article.keywords, article.author, article.cover_image_key, article.published_at, article.scheduled_at, article.created_at, article.updated_at]
            );
            articlesImported++;
          }
        }

        // 重置序列
        await localClient.query("SELECT setval('games_id_seq', (SELECT COALESCE(MAX(id), 1) FROM games))");
        await localClient.query("SELECT setval('articles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM articles))");

        await remoteClient.end();

        return NextResponse.json({
          success: true,
          message: '数据库初始化并同步完成',
          tables: tablesResult.rows.map((r: { tablename: string }) => r.tablename),
          gamesImported,
          articlesImported,
        });
      } catch (remoteErr) {
        await remoteClient.end();
        return NextResponse.json({
          success: false,
          message: '远程数据库连接失败',
          error: remoteErr instanceof Error ? remoteErr.message : String(remoteErr),
          tables: tablesResult.rows.map((r: { tablename: string }) => r.tablename),
        }, { status: 500 });
      }
    }

    await localClient.end();
    return NextResponse.json({
      success: true,
      message: '表结构创建成功，无远程数据源',
      tables: tablesResult.rows.map((r: { tablename: string }) => r.tablename),
      existingGames,
      existingArticles,
    });

  } catch (error) {
    await localClient.end().catch(() => {});
    return NextResponse.json({
      success: false,
      message: '数据库初始化失败',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function GET() {
  // GET方式：只建表，不同步数据
  const { Client } = await import('pg');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  try {
    await client.connect();
    await client.query(CREATE_TABLES_SQL);
    const tablesResult = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    const gamesCount = await client.query('SELECT COUNT(*) as count FROM games');
    const articlesCount = await client.query('SELECT COUNT(*) as count FROM articles');

    await client.end();
    return NextResponse.json({
      success: true,
      message: '表结构创建/验证成功',
      tables: tablesResult.rows.map((r: { tablename: string }) => r.tablename),
      games: parseInt(gamesCount.rows[0].count),
      articles: parseInt(articlesCount.rows[0].count),
    });
  } catch (error) {
    await client.end().catch(() => {});
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
