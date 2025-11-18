// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BASIC_USER = process.env.BASIC_AUTH_USER;
const BASIC_PASS = process.env.BASIC_AUTH_PASS;
const CANON = process.env.NEXT_PUBLIC_CANONICAL_HOST;

// 1) ミドルウェア適用対象（除外ルートに注意）
//   - /fill, /api/forms/*, /api/flows/process-form-submission は素通し
export const config = {
  matcher: [
    // 静的/内部を除外
    "/((?!_next/|favicon.ico|.*\\.(png|jpg|jpeg|svg|gif|ico)$).*)",
  ],
};

export function middleware(req: NextRequest) {
  const { pathname, origin, search } = req.nextUrl;

  // 2) /fill と フォーム API は必ず素通し（匿名アクセスを許可）
  if (
    pathname.startsWith("/fill") ||
    pathname.startsWith("/api/forms/") ||
    pathname.startsWith("/api/flows/process-form-submission")
  ) {
    return NextResponse.next();
  }

  // 3) カノニカルホスト強制（必要時のみ）
  if (CANON) {
    const host = req.headers.get("host");
    if (host && host !== CANON) {
      return NextResponse.redirect(`${origin.replace(host, CANON)}${pathname}${search}`);
    }
  }

  // 4) Basic 認証を掛けるのは “管理系だけ”
  const needsAuth =
    pathname.startsWith("/user-builder") ||
    pathname.startsWith("/manual") ||
    pathname.startsWith("/admin");

  if (needsAuth && BASIC_USER && BASIC_PASS) {
    const auth = req.headers.get("authorization") || "";
    const [scheme, encoded] = auth.split(" ");
    if (scheme !== "Basic" || !encoded) {
      return new Response("Auth required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Restricted"' },
      });
    }
    // Edge Runtime では atob 使用可
    const [u, p] = atob(encoded).split(":");
    if (u !== BASIC_USER || p !== BASIC_PASS) {
      return new Response("Forbidden", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Restricted"' },
      });
    }
  }

  return NextResponse.next();
}