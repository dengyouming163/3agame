import { NextResponse } from 'next/server';

// Cron endpoint for automated daily generation
// Can be called by external cron services (cron-job.org, Cloudflare Workers Cron, etc.)
// Or by the built-in Next.js cron if configured
export async function GET() {
  try {
    // Call the daily generation API internally
    const baseUrl = process.env.PORT
      ? `http://localhost:${process.env.PORT}`
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/generate/daily`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    return NextResponse.json({
      triggered: true,
      result: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cron trigger error:', message);
    return NextResponse.json(
      { triggered: false, error: message },
      { status: 500 }
    );
  }
}

// Also support POST for manual cron triggers
export async function POST() {
  return GET();
}
