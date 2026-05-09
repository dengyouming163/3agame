import { Pool, PoolConfig } from 'pg';

// Load platform environment variables (PGDATABASE_URL, etc.)
// This uses coze_workload_identity to fetch credentials at runtime
let envLoaded = false;
async function loadPlatformEnv(): Promise<void> {
  if (envLoaded) return;
  try {
    const { execSync } = await import('child_process');
    const pythonCode = `
import os, sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;
    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // Silently fail - may not be available in all environments
  }
  envLoaded = true;
}

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
  game_name?: string | null;
  game_slug?: string | null;
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

let pool: Pool | null = null;
let poolInitPromise: Promise<Pool> | null = null;

function getConnectionString(): string {
  // Priority:
  // 1. DATABASE_URL (production: your PG server at 123.207.50.64)
  // 2. PGDATABASE_URL (development: platform-injected Supabase PG)
  return process.env.DATABASE_URL || process.env.PGDATABASE_URL || '';
}

async function createPool(): Promise<Pool> {
  // Ensure platform env vars are loaded (PGDATABASE_URL, etc.)
  await loadPlatformEnv();

  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error('DATABASE_URL or PGDATABASE_URL environment variable is not set');
  }

  const config: PoolConfig = {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false },
  };

  const newPool = new Pool(config);

  newPool.on('error', (err) => {
    console.error('Unexpected pool error:', err.message);
  });

  // Test connection
  try {
    const client = await newPool.connect();
    client.release();
    console.log('Database connected successfully');
  } catch (err) {
    const error = err as Error;
    console.error('Database connection test failed:', error.message);
    // Try fallback connection
    if (process.env.DATABASE_URL && process.env.PGDATABASE_URL && process.env.DATABASE_URL !== process.env.PGDATABASE_URL) {
      console.log('Trying fallback PGDATABASE_URL connection...');
      try {
        const fallbackPool = new Pool({
          connectionString: process.env.PGDATABASE_URL,
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          ssl: { rejectUnauthorized: false },
        });
        const client = await fallbackPool.connect();
        client.release();
        console.log('Fallback database connected successfully');
        newPool.end();
        return fallbackPool;
      } catch (fallbackErr) {
        console.error('Fallback connection also failed:', (fallbackErr as Error).message);
      }
    }
  }

  return newPool;
}

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  if (poolInitPromise) return poolInitPromise;

  poolInitPromise = createPool().then((p) => {
    pool = p;
    return p;
  });

  return poolInitPromise;
}

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  try {
    const db = await getPool();
    const result = await db.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text: text.slice(0, 80), duration, rows: result.rowCount });
    return result;
  } catch (error) {
    const err = error as Error;
    console.error('Database query error:', err.message);
    throw error;
  }
}
