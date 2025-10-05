// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = process.env.NEXT_PUBLIC_CANONICAL_HOST || 'www.form.visone-ai.jp';

function needsRedirect(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return host !== CANONICAL_HOST || proto !== 'https';
}

function basicAuthOk(req: NextRequest) {
  const u = process.env.BASIC_AUTH_USER;
  const p = process.env.BASIC_AUTH_PASS;
  if (!u || !p) return true; // 未設定なら通す
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) return false;
  const [user, pass] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
  return user === u && pass === p;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 静的アセット等は素通し
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname === '/health') {
    return NextResponse.next();
  }

  // 1) HTTPS + 正規ホストへリダイレクト
  if (needsRedirect(req)) {
    const url = new URL(req.url);
    url.protocol = 'https:';
    url.hostname = CANONICAL_HOST;
    return NextResponse.redirect(url, 301);
  }

  // 2) （任意）Basic認証：環境変数がセットされている時だけ有効
  if (!basicAuthOk(req)) {
    return new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Protected"' }
    });
  }

  return NextResponse.next();
}