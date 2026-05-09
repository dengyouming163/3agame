/**
 * 将 seed-data.sql 导入到生产数据库
 * 用法: node import-seed.mjs
 */
import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const PROD_DB_URL = 'postgresql://3agamemaster:dengyouming2tll@123.207.50.64:15432/3agamemaster';

async function main() {
  console.log('=== 3A Game Master 数据导入工具 ===\n');

  const client = new Client({
    connectionString: PROD_DB_URL,
    ssl: false,
    connectionTimeoutMillis: 15000,
    query_timeout: 120000,
    statement_timeout: 120000,
  });

  try {
    console.log('1. 连接生产数据库...');
    await client.connect();
    console.log('   连接成功!');

    // 先检查现有数据
    const gamesCount = await client.query('SELECT COUNT(*) as count FROM games');
    const articlesCount = await client.query('SELECT COUNT(*) as count FROM articles');
    console.log(`   现有数据: ${gamesCount.rows[0].count} 游戏, ${articlesCount.rows[0].count} 文章`);

    // 读取种子数据SQL
    const sqlPath = join(process.cwd(), 'seed-data.sql');
    console.log(`\n2. 读取种子文件: ${sqlPath}`);
    const sql = readFileSync(sqlPath, 'utf-8');
    console.log(`   文件大小: ${(sql.length / 1024).toFixed(1)} KB`);

    // 分割SQL语句执行（按分号分割，但避免分割字符串内的分号）
    console.log('\n3. 执行SQL导入...');
    
    // 简单策略：直接执行整个SQL文件
    // PostgreSQL的query方法支持多语句
    try {
      await client.query('BEGIN');
      
      // 先清空现有数据（避免冲突）
      console.log('   清空现有文章和发布队列...');
      await client.query('DELETE FROM publish_queue');
      await client.query('DELETE FROM generation_logs');
      await client.query('DELETE FROM page_views');
      await client.query('DELETE FROM daily_stats');
      await client.query('DELETE FROM articles');
      await client.query('DELETE FROM games');
      
      // 重置序列
      await client.query('ALTER SEQUENCE IF EXISTS games_id_seq RESTART WITH 1');
      await client.query('ALTER SEQUENCE IF EXISTS articles_id_seq RESTART WITH 1');
      
      // 执行种子数据SQL - 逐条执行
      // 将SQL按语句分割
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
            process.stdout.write(`   已执行 ${successCount} 条语句...\n`);
          }
        } catch (err) {
          errorCount++;
          console.error(`   SQL错误 (第${successCount + errorCount}条): ${err.message}`);
          console.error(`   语句: ${stmt.substring(0, 100)}...`);
        }
      }

      await client.query('COMMIT');
      console.log(`\n   导入完成! 成功: ${successCount}, 失败: ${errorCount}`);

    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    }

    // 验证导入结果
    console.log('\n4. 验证导入结果...');
    const newGames = await client.query('SELECT COUNT(*) as count FROM games');
    const newArticles = await client.query('SELECT COUNT(*) as count FROM articles');
    const publishedArticles = await client.query("SELECT COUNT(*) as count FROM articles WHERE status = 'published'");
    
    console.log(`   游戏: ${newGames.rows[0].count}`);
    console.log(`   文章: ${newArticles.rows[0].count}`);
    console.log(`   已发布: ${publishedArticles.rows[0].count}`);

    // 按游戏统计文章
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

    console.log('\n=== 导入完成 ===');

  } catch (error) {
    console.error('\n导入失败:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
