// 批量压缩封面图 → 替换R2上的旧图 → 更新数据库
// 策略: 最大宽度1200px + JPEG质量78 + progressive
const sharp = require('sharp');
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
const COMPRESSED_DIR = '/workspace/projects/images-compressed';

async function main() {
  console.log('=== 批量压缩封面图 ===\n');

  fs.mkdirSync(COMPRESSED_DIR, { recursive: true });

  const manifest = JSON.parse(fs.readFileSync(path.join(IMG_DIR, 'manifest.json'), 'utf-8'));
  console.log(`待处理 ${manifest.length} 张图片\n`);

  // 1. 压缩
  let compressed = 0, failed = 0;
  let totalOriginal = 0, totalCompressed = 0;

  for (const item of manifest) {
    const srcPath = path.join(IMG_DIR, item.filename);
    const dstPath = path.join(COMPRESSED_DIR, item.filename);
    if (!fs.existsSync(srcPath)) { failed++; continue; }

    try {
      const origBuf = fs.readFileSync(srcPath);
      totalOriginal += origBuf.length;

      const compressedBuf = await sharp(origBuf)
        .resize(1200, null, { withoutEnlargement: true }) // 最大宽1200px，保持比例
        .jpeg({ quality: 78, progressive: true, mozjpeg: true }) // mozjpeg更高效
        .toBuffer();

      fs.writeFileSync(dstPath, compressedBuf);
      totalCompressed += compressedBuf.length;

      const origKB = (origBuf.length / 1024).toFixed(0);
      const compKB = (compressedBuf.length / 1024).toFixed(0);
      const ratio = ((1 - compressedBuf.length / origBuf.length) * 100).toFixed(0);
      compressed++;

      if (compressed <= 5 || compressed % 10 === 0) {
        console.log(`  [${compressed}] ${origKB}KB → ${compKB}KB (-${ratio}%)`);
      }
    } catch (e) {
      failed++;
      console.log(`  [失败] ${item.filename}: ${e.message.substring(0, 60)}`);
    }
  }

  console.log(`\n压缩完成! 成功:${compressed} 失败:${failed}`);
  console.log(`总大小: ${(totalOriginal / 1024 / 1024).toFixed(1)}MB → ${(totalCompressed / 1024 / 1024).toFixed(1)}MB (-${((1 - totalCompressed / totalOriginal) * 100).toFixed(0)}%)`);
  console.log(`平均: ${(totalOriginal / compressed / 1024).toFixed(0)}KB → ${(totalCompressed / compressed / 1024).toFixed(0)}KB`);

  // 大小分布
  const files = fs.readdirSync(COMPRESSED_DIR).filter(f => f.endsWith('.jpeg') || f.endsWith('.png'));
  let under50 = 0, under100 = 0, under150 = 0, over150 = 0;
  for (const f of files) {
    const kb = fs.statSync(path.join(COMPRESSED_DIR, f)).size / 1024;
    if (kb < 50) under50++;
    else if (kb < 100) under100++;
    else if (kb < 150) under150++;
    else over150++;
  }
  console.log(`\n压缩后大小分布: <50KB:${under50} | 50-100KB:${under100} | 100-150KB:${under150} | >150KB:${over150}`);

  // 2. 上传到R2（覆盖旧图）
  console.log('\n=== 上传压缩图到R2 ===\n');
  let uploaded = 0;

  for (const item of manifest) {
    const filePath = path.join(COMPRESSED_DIR, item.filename);
    if (!fs.existsSync(filePath)) continue;

    try {
      const buf = fs.readFileSync(filePath);
      const r2Key = `articles/${item.filename}`;
      await R2.send(new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: buf,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=31536000, immutable',
      }));
      uploaded++;
      if (uploaded % 10 === 0) console.log(`  上传: ${uploaded}/${compressed}`);
    } catch (e) {
      console.log(`  [上传失败] ${item.filename}: ${e.message.substring(0, 60)}`);
    }
  }

  console.log(`\n上传完成! ${uploaded} 张`);

  // 3. 验证一张
  if (manifest.length > 0) {
    const testUrl = `https://${R2_PUBLIC_DOMAIN}/articles/${manifest[0].filename}`;
    const res = await fetch(testUrl);
    const len = res.headers.get('content-length');
    console.log(`\n验证: ${testUrl}`);
    console.log(`  HTTP ${res.status}, Content-Length: ${len ? (parseInt(len) / 1024).toFixed(0) + 'KB' : 'N/A'}`);
  }

  console.log('\n=== 全部完成 ===');
}

main().catch(e => { console.error('失败:', e); process.exit(1); });
