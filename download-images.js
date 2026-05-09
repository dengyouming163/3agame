// Step 1: 下载所有封面图到本地
// 运行: node download-images.js

const { S3Storage } = require('coze-coding-dev-sdk');
const fs = require('fs');
const path = require('path');

const TOS = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

const OUTPUT_DIR = '/workspace/projects/images-to-migrate';

async function main() {
  console.log('=== 下载封面图 ===\n');

  // 创建输出目录
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // 获取文章列表
  const data = await fetch('http://localhost:5000/api/articles?limit=100').then(r => r.json());
  const articles = (data.articles || data).filter(a => a.cover_image_key);
  console.log(`需要下载 ${articles.length} 张图片\n`);

  let downloaded = 0;
  let failed = 0;
  const manifest = []; // 记录 id → filename 映射

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    const key = a.cover_image_key;

    try {
      const signedUrl = await TOS.generatePresignedUrl({ key, expireTime: 3600 });
      const res = await fetch(signedUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());

      // 保存文件
      const filename = key; // 保持原始key作为文件名
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), buf);
      manifest.push({ id: a.id, key, filename });

      downloaded++;
      if (downloaded % 5 === 0) console.log(`  进度: ${downloaded}/${articles.length}`);
    } catch (e) {
      failed++;
      console.log(`  [失败] 文章${a.id}: ${e.message.substring(0, 60)}`);
    }
  }

  // 保存映射文件
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const totalSize = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f !== 'manifest.json')
    .reduce((sum, f) => sum + fs.statSync(path.join(OUTPUT_DIR, f)).size, 0);

  console.log(`\n下载完成! 成功: ${downloaded}, 失败: ${failed}`);
  console.log(`总大小: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`目录: ${OUTPUT_DIR}`);
}

main().catch(e => { console.error('失败:', e); process.exit(1); });
