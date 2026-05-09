// 一键导入 - 在服务器上运行: node import-local.js
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://3agamemaster:dengyouming2tll@localhost:15432/3agamemaster',
    ssl: false,
  });

  try {
    await client.connect();
    console.log('连接成功');

    // 清空
    for (const t of ['publish_queue','generation_logs','page_views','daily_stats','articles','games']) {
      await client.query('DELETE FROM ' + t);
    }
    await client.query('ALTER SEQUENCE IF EXISTS games_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE IF EXISTS articles_id_seq RESTART WITH 1');
    console.log('旧数据已清空');

    // 导入
    const sql = fs.readFileSync(path.join(__dirname, 'seed-data.sql'), 'utf-8');
    const stmts = sql.split('\n').filter(l => l.trim() && !l.trim().startsWith('--')).join('\n').split(';').map(s => s.trim()).filter(s => s.length > 0);
    
    let ok = 0, fail = 0;
    for (const stmt of stmts) {
      try { await client.query(stmt); ok++; }
      catch (e) { fail++; if (fail <= 3) console.error('错误:', e.message.substring(0, 80)); }
    }

    const g = await client.query('SELECT COUNT(*) c FROM games');
    const a = await client.query('SELECT COUNT(*) c FROM articles');
    const p = await client.query("SELECT COUNT(*) c FROM articles WHERE status='published'");
    console.log(`\n完成! 游戏:${g.rows[0].c} 文章:${a.rows[0].c} (已发布:${p.rows[0].c}) 成功:${ok} 失败:${fail}`);
  } catch (e) {
    console.error('失败:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
