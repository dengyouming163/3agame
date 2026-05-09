// Step 2: 在服务器上运行 - 上传图片到Cloudflare R2 + 更新数据库
// 运行: node upload-to-r2.js
// 需要先安装依赖: pnpm add @aws-sdk/client-s3

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
const IMG_DIR = path.join(__dirname, 'images-to-migrate');

async function main() {
  console.log('=== 上传图片到 Cloudflare R2 ===\n');

  // 读取manifest
  const manifestPath = path.join(IMG_DIR, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('manifest.json 不存在! 请先运行 download-images.js');
    process.exit(1);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  console.log(`需要上传 ${manifest.length} 张图片\n`);

  // 上传到R2
  let uploaded = 0;
  let failed = 0;
  const results = [];

  for (const item of manifest) {
    const filePath = path.join(IMG_DIR, item.filename);
    if (!fs.existsSync(filePath)) {
      console.log(`  [跳过] 文件不存在: ${item.filename}`);
      failed++;
      continue;
    }

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

      const r2Url = `https://${R2_PUBLIC_DOMAIN}/${r2Key}`;
      results.push({ id: item.id, r2Url });
      uploaded++;

      if (uploaded % 5 === 0) console.log(`  进度: ${uploaded}/${manifest.length} (失败:${failed})`);
    } catch (e) {
      failed++;
      console.log(`  [失败] 文章${item.id}: ${e.message.substring(0, 80)}`);
    }
  }

  console.log(`\n上传完成! 成功: ${uploaded}, 失败: ${failed}`);

  // 更新数据库
  if (results.length > 0) {
    console.log('\n更新数据库...');
    const dbClient = new Client({ connectionString: PROD_DB, ssl: false });
    await dbClient.connect();

    let updated = 0;
    for (const { id, r2Url } of results) {
      await dbClient.query('UPDATE articles SET cover_image_key = $1 WHERE id = $2', [r2Url, id]);
      updated++;
    }
    console.log(`  更新 ${updated} 条记录`);

    // 验证
    const check = await dbClient.query(`SELECT id, cover_image_key FROM articles WHERE cover_image_key LIKE 'https://img.3agamemaster.com%' LIMIT 3`);
    console.log('\n  验证(前3条):');
    check.rows.forEach(r => console.log(`    [${r.id}] ${r.cover_image_key}`));

    const totalUpdated = await dbClient.query(`SELECT COUNT(*) c FROM articles WHERE cover_image_key LIKE 'https://img.3agamemaster.com%'`);
    console.log(`  总计 ${totalUpdated.rows[0].c} 篇文章已更新为R2 URL`);

    await dbClient.end();
  }

  console.log('\n=== 全部完成 ===');
  console.log(`图片公开访问示例: https://${R2_PUBLIC_DOMAIN}/articles/${manifest[0]?.filename}`);
}

main().catch(e => { console.error('失败:', e); process.exit(1); });
