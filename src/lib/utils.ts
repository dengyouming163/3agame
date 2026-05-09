import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the base URL for the site.
 * Handles COZE_PROJECT_DOMAIN_DEFAULT which may already include https://
 * Production: https://3agamemaster.com
 */
export function getBaseUrl(): string {
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'localhost:5000';
  if (domain.startsWith('http://') || domain.startsWith('https://')) {
    return domain;
  }
  const protocol = domain.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${domain}`;
}
