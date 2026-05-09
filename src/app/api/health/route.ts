import { NextResponse } from 'next/server';
import { checkDatabaseHealth } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const start = Date.now();
  const dbHealth = await checkDatabaseHealth();

  const status = dbHealth.connected ? 'healthy' : 'unhealthy';
  const httpStatus = dbHealth.connected ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: {
          connected: dbHealth.connected,
          latencyMs: dbHealth.latencyMs,
          mode: dbHealth.isProduction ? 'production' : 'development',
          error: dbHealth.error || null,
        },
        storage: {
          configured: !!(process.env.COZE_BUCKET_ENDPOINT_URL && process.env.COZE_BUCKET_NAME),
        },
      },
      responseTimeMs: Date.now() - start,
    },
    { status: httpStatus }
  );
}
