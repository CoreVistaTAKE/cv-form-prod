/* canonical v3: build absolute URL as string (no port), add security headers */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL_HOST = process.env.NEXT_PUBLIC_CANONICAL_HOST || "www.form.visone-ai.jp";

function isBypass(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/health" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

function basicAuthOK(req: NextRequest) {
  const u = process.env.BASIC_AUTH_USER;
  const p = process.env.BASIC_AUTH_PASS;
  if (!u || !p) return true; // 未設定なら通す
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return false;
  const [user, pass] = Buffer.from(auth.split(" ")[1], "base64").toString().split(":");
  return user === u && pass === p;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isBypass(pathname)) return NextResponse.next();

  // 1) https + 正規ホストへ統一（元URLは使わず、ゼロから絶対URL文字列を組み立てる）
  const host  = req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host !== CANONICAL_HOST || proto !== "https") {
    const location = `https://${CANONICAL_HOST}${pathname || "/"}${search || ""}`;
    return NextResponse.redirect(location, 301);
  }

  // 2) （任意）Basic認証：環境変数が設定されている時だけ有効
  if (!basicAuthOK(req)) {
    return new NextResponse("Auth required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Protected"' }
    });
  }

  // 3) セキュリティヘッダ
  const res = NextResponse.next();
  res.headers.set("Strict-Transport-Security", "max-age=15552000; includeSubDomains; preload");
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  return res;
}
