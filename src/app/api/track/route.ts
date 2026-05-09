import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, referrer } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'path is required' }, { status: 400 });
    }

    // 只追踪公开页面，不追踪admin和api
    if (path.startsWith('/admin') || path.startsWith('/api')) {
      return NextResponse.json({ tracked: false });
    }

    // 限制path长度
    const cleanPath = path.slice(0, 500);
    const cleanReferrer = (referrer || '').slice(0, 500);

    // IP hash for UV计算（不存储真实IP）
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);

    // 从Cloudflare header获取国家
    const country = request.headers.get('cf-ipcountry') || '';

    // 简化user agent
    const ua = request.headers.get('user-agent') || '';
    const shortUa = ua.slice(0, 500);

    await query(
      `INSERT INTO page_views (path, referrer, country, user_agent, ip_hash, visited_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [cleanPath, cleanReferrer, country, shortUa, ipHash]
    );

    return NextResponse.json({ tracked: true });
  } catch (error) {
    // 静默失败，不影响用户体验
    console.error('Track error:', error);
    return NextResponse.json({ tracked: false });
  }
}
