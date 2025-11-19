import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 公開動線は素通し（認証/書換え禁止）
  if (pathname.startsWith("/fill") || pathname.startsWith("/resolve") || pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

// ★キャプチャ無しの安全なパターン（Next公式例ベース）
//  - _next/static と _next/image、favicon.ico を除外
//  - あわせて api / fill / resolve も除外
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|fill|resolve).*)"],
};
