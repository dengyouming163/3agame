// 一键完成：上传图片到R2 + 更新数据库URL
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const R2 = new S3Client({
  region: 'auto',
  endpoint: 'https://60a85e45fc6d5612283f700354563a42.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '79f50cc0491127dc22ea587b2f4133bf',
    secretAccessKey: 'e654e66fd586935dd604fb907d58a56a01dd597121420af853ba5093a6fb7390',
  },
});
const R2_BUCKET = '3agamemaster';
const R2_PUBLIC_DOMAIN = 'img.3agamemaster.com';
const PROD_DB = 'postgresql://aaagame:dengyouming2tll@132.232.166.40:15432/aaagame';
const IMG_DIR = '/workspace/projects/images-to-migrate';

async function main() {
  console.log('=== 上传图片到R2 + 更新数据库 ===\n');

  // 1. 读取manifest
  const manifest = JSON.parse(fs.readFileSync(path.join(IMG_DIR, 'manifest.json'), 'utf-8'));
  console.log(`需要上传 ${manifest.length} 张图片\n`);

  // 2. 上传到R2
  let uploaded = 0, failed = 0;
  const results = [];

  for (const item of manifest) {
    const filePath = path.join(IMG_DIR, item.filename);
    if (!fs.existsSync(filePath)) { failed++; continue; }

    try {
      const buf = fs.readFileSync(filePath);
      const r2Key = `articles/${item.filename}`;
      await R2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: buf,
        ContentType: item.filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      results.push({ id: item.id, url: `https://${R2_PUBLIC_DOMAIN}/${r2Key}` });
      uploaded++;
      if (uploaded % 5 === 0) console.log(`  上传: ${uploaded}/${manifest.length} (失败:${failed})`);
    } catch (e) {
      failed++;
      console.log(`  [失败] 文章${item.id}: ${e.message.substring(0, 60)}`);
    }
  }
  console.log(`\n上传完成! 成功: ${uploaded}, 失败: ${failed}`);

  // 3. 更新数据库
  if (results.length > 0) {
    console.log('\n更新数据库...');
    const db = new Client({ connectionString: PROD_DB, ssl: false, connectionTimeoutMillis: 15000, query_timeout: 60000 });
    await db.connect();

    let updated = 0;
    for (const { id, url } of results) {
      await db.query('UPDATE articles SET cover_image_key = $1 WHERE id = $2', [url, id]);
      updated++;
    }
    console.log(`  更新 ${updated} 条记录`);

    // 验证
    const check = await db.query(`SELECT COUNT(*) c FROM articles WHERE cover_image_key LIKE 'https://img.3agamemaster.com%'`);
    console.log(`  R2 URL记录数: ${check.rows[0].c}`);

    const sample = await db.query(`SELECT id, cover_image_key FROM articles WHERE cover_image_key LIKE 'https://img.3agamemaster.com%' LIMIT 3`);
    sample.rows.forEach(r => console.log(`  [${r.id}] ${r.cover_image_key}`));

    await db.end();
  }

  console.log('\n=== 全部完成 ===');
}

main().catch(e => { console.error('失败:', e); process.exit(1); });
