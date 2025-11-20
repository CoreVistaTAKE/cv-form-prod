// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(_req: NextRequest) {
  // 認証・書き換えは行わず素通し（必要が生じたらアプリ側で判定）
  return NextResponse.next();
}

// Next.js の matcher は複雑な否定先読みや拡張子列挙に制約があるため、
// 必要最小限の安全なパターンのみ指定。
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
