import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the internal base URL for server-side API fetching.
 * Production SSR: http://localhost:{PORT} (internal, avoids Cloudflare round-trip)
 * Development: uses COZE_PROJECT_DOMAIN_DEFAULT or localhost:5000
 */
export function getBaseUrl(): string {
  // Production SSR: call self directly via localhost
  if (process.env.NODE_ENV === 'production') {
    const port = process.env.PORT || '3000';
    return `http://localhost:${port}`;
  }
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'localhost:5000';
  if (domain.startsWith('http://') || domain.startsWith('https://')) {
    return domain;
  }
  const protocol = domain.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${domain}`;
}

/**
 * Get the public site URL for sitemap, OG tags, JSON-LD etc.
 * Production: https://3agamemaster.com (from SITE_URL env or derived)
 * Development: uses COZE_PROJECT_DOMAIN_DEFAULT or localhost:5000
 */
export function getSiteUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.env.SITE_URL || 'https://3agamemaster.com';
  }
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'localhost:5000';
  if (domain.startsWith('http://') || domain.startsWith('https://')) {
    return domain;
  }
  const protocol = domain.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${domain}`;
}
