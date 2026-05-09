import { S3Storage } from 'coze-coding-dev-sdk';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// ─── Storage Configuration ───
// Production: Cloudflare R2 (global CDN, zero egress fees)
// Development: coze-coding-dev-sdk S3Storage (platform-injected)

const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN || 'img.3agamemaster.com';
const R2_BUCKET = process.env.R2_BUCKET || '3agamemaster';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production' || !!process.env.R2_ENDPOINT;
}

// ─── R2 Client (Production) ───
let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT || 'https://60a85e45fc6d5612283f700354563a42.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '79f50cc0491127dc22ea587b2f4133bf',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'e654e66fd586935dd604fb907d58a56a01dd597121420af853ba5093a6fb7390',
      },
    });
  }
  return r2Client;
}

// ─── TOS Client (Development) ───
let tosStorage: S3Storage | null = null;

function getTOSStorage(): S3Storage {
  if (!tosStorage) {
    tosStorage = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });
  }
  return tosStorage;
}

// ─── Public API ───

/**
 * Upload an image to object storage and return the public URL.
 * Production: uploads to R2, returns CDN URL
 * Development: uploads to TOS, returns storage key
 */
export async function uploadImage(
  fileContent: Buffer,
  fileName: string,
  contentType: string = 'image/png'
): Promise<string> {
  if (isProduction()) {
    const r2Key = `articles/${fileName}`;
    const client = getR2Client();
    await client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: fileContent,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }));
    return `https://${R2_PUBLIC_DOMAIN}/${r2Key}`;
  } else {
    const storage = getTOSStorage();
    const key = await storage.uploadFile({
      fileContent,
      fileName,
      contentType,
    });
    return key;
  }
}

/**
 * Upload image from a URL to object storage.
 * Returns the public URL (production) or storage key (development).
 */
export async function uploadImageFromUrl(url: string): Promise<string | null> {
  try {
    if (isProduction()) {
      // Download first, then upload to R2
      const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get('content-type') || 'image/jpeg';
      const fileName = `ai-generated-${Date.now()}.${contentType.includes('png') ? 'png' : 'jpeg'}`;
      return await uploadImage(buffer, fileName, contentType);
    } else {
      const storage = getTOSStorage();
      const result = await storage.uploadFromUrl({ url, timeout: 60000 });
      return result || null;
    }
  } catch (error) {
    console.error('Upload from URL failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Get a publicly accessible image URL for display.
 * Handles three cases:
 * 1. Full URL (https://...) → return as-is (R2 CDN URL or any external URL)
 * 2. Storage key (TOS key like "generate_image_xxx.jpeg") → generate signed URL
 * 3. Empty/null → placeholder
 */
export async function getImageUrl(key: string | null | undefined): Promise<string> {
  if (!key) return '/placeholder-image.svg';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  // It's a TOS storage key - generate signed URL (development only)
  try {
    const storage = getTOSStorage();
    return storage.generatePresignedUrl({ key, expireTime: 604800 });
  } catch {
    return '/placeholder-image.svg';
  }
}

/**
 * Get image URL synchronously (for SSR without await).
 * Only works for full URLs or local paths, not storage keys.
 * For storage keys, use getImageUrl() instead.
 */
export function getImageUrlSync(key: string | null | undefined): string {
  if (!key) return '/placeholder-image.svg';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  if (key.startsWith('/')) return key;
  // It's a storage key - return placeholder, will be resolved client-side
  return '/placeholder-image.svg';
}

/**
 * Delete an image from object storage.
 */
export async function deleteImage(key: string): Promise<boolean> {
  try {
    if (key.startsWith('https://') || key.startsWith('http://')) {
      // R2 public URL - extract key and delete from R2
      if (isProduction() && key.includes(R2_PUBLIC_DOMAIN)) {
        const url = new URL(key);
        const r2Key = url.pathname.substring(1); // Remove leading /
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        const client = getR2Client();
        await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: r2Key }));
        return true;
      }
      return false;
    }
    // TOS storage key
    const storage = getTOSStorage();
    return storage.deleteFile({ fileKey: key });
  } catch {
    return false;
  }
}

/**
 * Resolve image keys in HTML content to actual URLs.
 * Handles both R2 CDN URLs and TOS signed URLs.
 */
export async function resolveImageKeysInContent(htmlContent: string): Promise<string> {
  const keyPattern = /data-file-key="([^"]+)"/g;
  const matches = [...htmlContent.matchAll(keyPattern)];

  if (matches.length === 0) return htmlContent;

  let resolved = htmlContent;
  for (const match of matches) {
    const key = match[1];
    try {
      const url = await getImageUrl(key);
      resolved = resolved.replace(
        `data-file-key="${key}"`,
        `src="${url}" loading="lazy"`
      );
    } catch {
      resolved = resolved.replace(
        `data-file-key="${key}"`,
        `src="/placeholder-image.svg" alt="Image loading..." data-file-key="${key}"`
      );
    }
  }
  return resolved;
}

// ─── Legacy aliases (for backward compatibility) ───

/** @deprecated Use getImageUrl instead */
export async function getSignedImageUrl(key: string, expireTime: number = 86400): Promise<string> {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  const storage = getTOSStorage();
  return storage.generatePresignedUrl({ key, expireTime });
}

/** @deprecated Use getImageUrl instead */
export async function getCachedImageUrl(key: string): Promise<string> {
  if (!key) return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  return getSignedImageUrl(key, 604800);
}

/** @deprecated Use uploadImage instead */
export function getStorage(): S3Storage {
  return getTOSStorage();
}
