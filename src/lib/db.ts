import { getSupabaseClient } from '@/storage/database/supabase-client';

export interface Game {
  id: number;
  name: string;
  slug: string;
  genre: string | null;
  platform: string | null;
  release_date: string | null;
  description: string | null;
  cover_image_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: number;
  game_id: number | null;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  cover_image_key: string | null;
  status: 'draft' | 'generated' | 'reviewed' | 'published';
  language: string;
  meta_title: string | null;
  meta_description: string | null;
  keywords: string[] | null;
  author: string;
  published_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  game_name?: string;
  game_slug?: string;
}

export interface PublishQueueItem {
  id: number;
  article_id: number;
  scheduled_at: string;
  status: 'pending' | 'publishing' | 'published' | 'failed';
  attempts: number;
  last_attempt_at: string | null;
  created_at: string;
  article_title?: string;
}

export interface GenerationLog {
  id: number;
  article_id: number | null;
  game_id: number | null;
  prompt: string | null;
  model: string | null;
  tokens_used: number | null;
  generated_at: string;
}

export function getClient() {
  return getSupabaseClient();
}
