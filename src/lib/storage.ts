import { S3Storage } from 'coze-coding-dev-sdk';

let storageInstance: S3Storage | null = null;

export function getStorage(): S3Storage {
  if (!storageInstance) {
    storageInstance = new S3Storage({
      endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
      accessKey: '',
      secretKey: '',
      bucketName: process.env.COZE_BUCKET_NAME,
      region: 'cn-beijing',
    });
  }
  return storageInstance;
}

/**
 * Generate a signed URL for an image stored in object storage.
 * For CDN-cached images, use getCachedImageUrl instead.
 */
export async function getSignedImageUrl(key: string, expireTime: number = 86400): Promise<string> {
  if (!key) return '';
  const storage = getStorage();
  return storage.generatePresignedUrl({ key, expireTime });
}

/**
 * Get a CDN-friendly image URL.
 * Strategy: Use longer expiration for CDN-cached content (7 days),
 * and let the CDN handle the caching layer.
 * The browser will see Cache-Control headers from our next.config.ts.
 */
export async function getCachedImageUrl(key: string): Promise<string> {
  if (!key) return '';
  // 7-day expiration for CDN-friendly URLs
  return getSignedImageUrl(key, 604800);
}

/**
 * Upload an image to object storage and return the storage key.
 * IMPORTANT: Always use the returned key, NOT the fileName.
 */
export async function uploadImage(
  fileContent: Buffer,
  fileName: string,
  contentType: string = 'image/png'
): Promise<string> {
  const storage = getStorage();
  const key = await storage.uploadFile({
    fileContent,
    fileName,
    contentType,
  });
  return key;
}

/**
 * Upload image from a URL (e.g., AI-generated image URL) to object storage.
 * Returns the storage key.
 */
export async function uploadImageFromUrl(url: string): Promise<string> {
  const storage = getStorage();
  const key = await storage.uploadFromUrl({ url, timeout: 60000 });
  return key;
}

/**
 * Delete an image from object storage.
 */
export async function deleteImage(key: string): Promise<boolean> {
  const storage = getStorage();
  return storage.deleteFile({ fileKey: key });
}

/**
 * Resolve image keys in HTML content to signed URLs.
 * This replaces data-file-key attributes with actual image URLs.
 * Should be called at render time, not stored in DB.
 */
export async function resolveImageKeysInContent(htmlContent: string): Promise<string> {
  const keyPattern = /data-file-key="([^"]+)"/g;
  const matches = [...htmlContent.matchAll(keyPattern)];

  if (matches.length === 0) return htmlContent;

  let resolved = htmlContent;
  for (const match of matches) {
    const key = match[1];
    try {
      const url = await getCachedImageUrl(key);
      resolved = resolved.replace(
        `data-file-key="${key}"`,
        `src="${url}" loading="lazy"`
      );
    } catch {
      // If URL generation fails, leave the data attribute
      resolved = resolved.replace(
        `data-file-key="${key}"`,
        `src="/placeholder-image.svg" alt="Image loading..." data-file-key="${key}"`
      );
    }
  }
  return resolved;
}
