import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 公開動線は一切触らない（認証・rewrite しない）
  if (pathname.startsWith("/fill") || pathname.startsWith("/resolve") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 既存の社内ページ等に別処理があるならここで（必要時のみ）
  return NextResponse.next();
}

export const config = {
  matcher: [
    // 静的配下などを除外。/fill, /resolve, /api は除外して素通しにする
    "/((?!api|_next|static|favicon.ico|fill|resolve|.*\\.(png|jpg|jpeg|svg|gif|ico)$).*)",
  ],
};
