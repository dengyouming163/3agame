// 迁移封面图：TOS → Cloudflare R2
// 运行: node migrate-images-to-r2.js

const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { S3Storage } = require('coze-coding-dev-sdk');
const { Client } = require('pg');

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

const TOS = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

const PROD_DB = 'postgresql://aaagame:dengyouming2tll@132.232.166.40:15432/aaagame';

async function main() {
  console.log('=== 封面图迁移: TOS → Cloudflare R2 ===\n');

  // 1. 通过API获取有封面的文章
  const data = await fetch('http://localhost:5000/api/articles?limit=100').then(r => r.json());
  const articles = (data.articles || data).filter(a => a.cover_image_key);
  console.log(`需要迁移 ${articles.length} 张封面图\n`);

  let migrated = 0;
  let failed = 0;
  const results = []; // { id, r2Url }

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const key = a.cover_image_key;
    const r2Key = `articles/${key}`;

    try {
      // 生成TOS签名URL
      const signedUrl = await TOS.generatePresignedUrl({ key, expireTime: 3600 });

      // 下载图片
      const imgRes = await fetch(signedUrl);
      if (!imgRes.ok) throw new Error(`下载失败 HTTP ${imgRes.status}`);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

      // 上传到R2
      await R2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: imgBuffer,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      }));

      const r2Url = `https://${R2_PUBLIC_DOMAIN}/${r2Key}`;
      results.push({ id: a.id, r2Url });
      migrated++;

      if (migrated % 5 === 0 || i === articles.length - 1) {
        console.log(`  进度: ${migrated}/${articles.length} (失败:${failed})`);
      }
    } catch (e) {
      failed++;
      console.log(`  [失败] 文章${a.id}: ${e.message.substring(0, 80)}`);
    }
  }

  console.log(`\n图片迁移完成! 成功: ${migrated}, 失败: ${failed}`);

  // 2. 更新生产数据库中的cover_image_key
  if (results.length > 0) {
    console.log('\n更新生产数据库...');
    const dbClient = new Client({ connectionString: PROD_DB, ssl: false, connectionTimeoutMillis: 15000 });
    await dbClient.connect();

    let updated = 0;
    for (const { id, r2Url } of results) {
      await dbClient.query('UPDATE articles SET cover_image_key = $1 WHERE id = $2', [r2Url, id]);
      updated++;
    }
    console.log(`  更新 ${updated} 条记录`);

    // 验证
    const check = await dbClient.query("SELECT id, cover_image_key FROM articles WHERE cover_image_key LIKE 'https://img.3agamemaster.com%' LIMIT 3");
    console.log('\n  验证(前3条):');
    check.rows.forEach(r => console.log(`    [${r.id}] ${r.cover_image_key}`));

    await dbClient.end();
  }

  // 3. 验证R2文件
  const listResult = await R2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, MaxKeys: 5 }));
  console.log(`\nR2中文件总数: ${listResult.KeyCount || 0}`);

  console.log('\n=== 全部完成 ===');
}

main().catch(e => { console.error('迁移失败:', e); process.exit(1); });
