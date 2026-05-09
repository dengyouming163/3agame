// 只上传已压缩的图片到R2（覆盖旧图）
const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
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
const BUCKET = '3agamemaster';
const COMPRESSED_DIR = '/workspace/projects/images-compressed';

async function main() {
  // 先看R2已有多少
  const existing = await R2.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 100 }));
  console.log('R2已有文件:', existing.KeyCount || 0);

  const files = fs.readdirSync(COMPRESSED_DIR).filter(f => f.endsWith('.jpeg') || f.endsWith('.png'));
  console.log('待上传:', files.length, '张\n');

  let uploaded = 0, failed = 0;
  // 并发3个
  const concurrency = 3;
  const queue = [...files];

  async function worker() {
    while (queue.length > 0) {
      const f = queue.shift();
      if (!f) break;
      try {
        const buf = fs.readFileSync(path.join(COMPRESSED_DIR, f));
        await R2.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: `articles/${f}`,
          Body: buf,
          ContentType: 'image/jpeg',
          CacheControl: 'public, max-age=31536000, immutable',
        }));
        uploaded++;
        if (uploaded % 10 === 0 || uploaded === files.length) {
          console.log(`  进度: ${uploaded}/${files.length}`);
        }
      } catch (e) {
        failed++;
        console.log(`  [失败] ${f}: ${e.message.substring(0, 60)}`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  console.log(`\n上传完成! 成功:${uploaded} 失败:${failed}`);

  // 验证
  const testFile = files[0];
  if (testFile) {
    const url = `https://img.3agamemaster.com/articles/${testFile}`;
    const res = await fetch(url);
    const len = res.headers.get('content-length');
    console.log(`\n验证: HTTP ${res.status}, 大小: ${len ? (parseInt(len) / 1024).toFixed(0) + 'KB' : 'N/A'}`);
  }
}

main().catch(e => { console.error('失败:', e); process.exit(1); });
