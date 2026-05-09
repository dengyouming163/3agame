import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '3agame2025';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (password === ADMIN_PASSWORD) {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: '密码错误' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: '请求格式错误' }, { status: 400 });
  }
}
