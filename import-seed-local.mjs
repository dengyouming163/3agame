/**
 * 3A Game Master - 种子数据导入脚本
 * 在生产服务器上运行: node import-seed-local.mjs
 * 使用 localhost 连接本地 PostgreSQL，无需开放外网端口
 */
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 本地连接（在生产服务器上运行时用 localhost）
const LOCAL_DB_URL = 'postgresql://3agamemaster:dengyouming2tll@localhost:15432/3agamemaster';

async function main() {
  console.log('=== 3A Game Master 数据导入工具 ===\n');
  console.log('使用 localhost 连接本地 PostgreSQL\n');

  const client = new Client({
    connectionString: LOCAL_DB_URL,
    ssl: false,
    connectionTimeoutMillis: 15000,
  });

  try {
    console.log('1. 连接数据库...');
    await client.connect();
    console.log('   连接成功!\n');

    // 检查表是否存在
    const tablesResult = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log('2. 现有表:', tablesResult.rows.map(r => r.tablename).join(', '));

    // 如果没有表，先建表
    if (tablesResult.rows.length === 0) {
      console.log('   未发现表，正在创建...');
      const createSQL = readFileSync(join(__dirname, 'src/storage/database/schema.sql'), 'utf-8');
      await client.query(createSQL);
      console.log('   表创建完成!');
    }

    // 检查现有数据
    const gamesCount = await client.query('SELECT COUNT(*) as count FROM games');
    const articlesCount = await client.query('SELECT COUNT(*) as count FROM articles');
    const existingGames = parseInt(gamesCount.rows[0].count);
    const existingArticles = parseInt(articlesCount.rows[0].count);
    console.log(`   现有数据: ${existingGames} 游戏, ${existingArticles} 文章\n`);

    // 读取种子数据SQL
    const sqlPath = join(__dirname, 'seed-data.sql');
    console.log(`3. 读取种子文件: ${sqlPath}`);
    const sql = readFileSync(sqlPath, 'utf-8');
    console.log(`   文件大小: ${(sql.length / 1024).toFixed(1)} KB\n`);

    console.log('4. 执行SQL导入...');
    
    await client.query('BEGIN');
    
    // 清空现有数据
    console.log('   清空现有数据...');
    await client.query('DELETE FROM publish_queue');
    await client.query('DELETE FROM generation_logs');
    await client.query('DELETE FROM page_views');
    await client.query('DELETE FROM daily_stats');
    await client.query('DELETE FROM articles');
    await client.query('DELETE FROM games');
    await client.query('ALTER SEQUENCE IF EXISTS games_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS articles_id_seq RESTART WITH 1');
    console.log('   清空完成');
    
    // 执行种子数据 - 逐条分割执行
    const statements = sql
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let successCount = 0;
    let errorCount = 0;
    
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        successCount++;
        if (successCount % 10 === 0) {
          process.stdout.write(`   已执行 ${successCount}/${statements.length} 条语句...\n`);
        }
      } catch (err) {
        errorCount++;
        if (errorCount <= 5) {
          console.error(`   SQL错误: ${err.message.substring(0, 100)}`);
        }
      }
    }

    await client.query('COMMIT');
    console.log(`\n   导入完成! 成功: ${successCount}, 失败: ${errorCount}\n`);

    // 验证
    console.log('5. 验证导入结果...');
    const newGames = await client.query('SELECT COUNT(*) as count FROM games');
    const newArticles = await client.query('SELECT COUNT(*) as count FROM articles');
    const publishedArticles = await client.query("SELECT COUNT(*) as count FROM articles WHERE status = 'published'");
    const draftArticles = await client.query("SELECT COUNT(*) as count FROM articles WHERE status = 'draft'");
    const generatedArticles = await client.query("SELECT COUNT(*) as count FROM articles WHERE status = 'generated'");
    
    console.log(`   游戏: ${newGames.rows[0].count}`);
    console.log(`   文章总数: ${newArticles.rows[0].count}`);
    console.log(`   - 已发布(published): ${publishedArticles.rows[0].count}`);
    console.log(`   - 已生成(generated): ${generatedArticles.rows[0].count}`);
    console.log(`   - 草稿(draft): ${draftArticles.rows[0].count}`);

    // 按游戏统计
    const gameStats = await client.query(`
      SELECT g.name, COUNT(a.id) as article_count 
      FROM games g 
      LEFT JOIN articles a ON a.game_id = g.id 
      GROUP BY g.id, g.name 
      ORDER BY article_count DESC
    `);
    console.log('\n   各游戏文章数:');
    for (const row of gameStats.rows) {
      console.log(`   - ${row.name}: ${row.article_count} 篇`);
    }

    // 检查文章标题样例
    const samples = await client.query('SELECT id, title, status FROM articles ORDER BY id LIMIT 5');
    console.log('\n   文章样例:');
    for (const row of samples.rows) {
      console.log(`   [${row.id}] [${row.status}] ${row.title.substring(0, 60)}...`);
    }

    console.log('\n=== 导入完成 ===');

  } catch (error) {
    console.error('\n导入失败:', error.message);
    try { await client.query('ROLLBACK'); } catch {}
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
