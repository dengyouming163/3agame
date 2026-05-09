// 3A Game Master 种子数据导入脚本
// 在服务器上运行: node import-local.js
// 使用项目 node_modules 中的 pg，连接 localhost:15432

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = 'postgresql://3agamemaster:dengyouming2tll@localhost:15432/3agamemaster';

async function main() {
  console.log('=== 3A Game Master 数据导入 ===\n');

  const client = new Client({ connectionString: DB_URL, ssl: false });

  try {
    await client.connect();
    console.log('1. 数据库连接成功\n');

    // 读取种子SQL
    const sqlFile = path.join(__dirname, 'seed-data.sql');
    const sql = fs.readFileSync(sqlFile, 'utf-8');
    console.log(`2. 种子文件: ${(sql.length / 1024).toFixed(1)} KB\n`);

    // 清空旧数据
    console.log('3. 清空旧数据...');
    await client.query('DELETE FROM publish_queue');
    await client.query('DELETE FROM generation_logs');
    await client.query('DELETE FROM page_views');
    await client.query('DELETE FROM daily_stats');
    await client.query('DELETE FROM articles');
    await client.query('DELETE FROM games');
    await client.query('ALTER SEQUENCE IF EXISTS games_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS articles_id_seq RESTART WITH 1');
    console.log('   清空完成\n');

    // 逐条执行SQL
    console.log('4. 导入数据...');
    const stmts = sql
      .split('\n')
      .filter(l => l.trim() && !l.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let ok = 0, fail = 0;
    for (const stmt of stmts) {
      try {
        await client.query(stmt);
        ok++;
        if (ok % 10 === 0) process.stdout.write(`   ${ok}/${stmts.length}...\n`);
      } catch (e) {
        fail++;
        if (fail <= 3) console.error(`   错误: ${e.message.substring(0, 80)}`);
      }
    }
    console.log(`   完成! 成功:${ok} 失败:${fail}\n`);

    // 验证
    const g = await client.query('SELECT COUNT(*) c FROM games');
    const a = await client.query('SELECT COUNT(*) c FROM articles');
    const p = await client.query("SELECT COUNT(*) c FROM articles WHERE status='published'");
    console.log('5. 验证结果:');
    console.log(`   游戏: ${g.rows[0].c}`);
    console.log(`   文章: ${a.rows[0].c} (已发布: ${p.rows[0].c})`);

    const stats = await client.query(`
      SELECT g.name, COUNT(a.id) n FROM games g LEFT JOIN articles a ON a.game_id=g.id
      GROUP BY g.id,g.name ORDER BY n DESC
    `);
    console.log('\n   各游戏文章数:');
    stats.rows.forEach(r => console.log(`   - ${r.name}: ${r.n}`));

    console.log('\n=== 导入完成 ===');
  } catch (e) {
    console.error('导入失败:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
