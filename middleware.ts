// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BASIC_USER = process.env.BASIC_AUTH_USER;
const BASIC_PASS = process.env.BASIC_AUTH_PASS;
const CANON = process.env.NEXT_PUBLIC_CANONICAL_HOST;

// すべてのパスを対象にして、関数内で除外する
export const config = { matcher: ["/:path*"] };

export function middleware(req: NextRequest) {
  const { pathname, origin, search } = req.nextUrl;

  // 静的/画像は即スルー
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    /\.(png|jpe?g|svg|gif|ico)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // /fill と フォームAPIは匿名で素通し
  if (
    pathname.startsWith("/fill") ||
    pathname.startsWith("/api/forms/") ||
    pathname.startsWith("/api/flows/process-form-submission")
  ) {
    return NextResponse.next();
  }

  // カノニカルホスト強制
  const host = req.headers.get("host");
  if (CANON && host && host !== CANON) {
    return NextResponse.redirect(`${origin.replace(host, CANON)}${pathname}${search}`);
  }

  // 管理系のみ Basic 認証
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
