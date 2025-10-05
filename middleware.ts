// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const allow = (req: NextRequest) => {
  const u = process.env.BASIC_AUTH_USER;
  const p = process.env.BASIC_AUTH_PASS;
  if (!u || !p) return true; // 未設定ならスルー
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) return false;
  const [user, pass] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
  return user === u && pass === p;
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname === '/health') {
    return NextResponse.next();
  }
  if (!allow(req)) {
    return new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Protected"' }
    });
  }
  return NextResponse.next();
}
