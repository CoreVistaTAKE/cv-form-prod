import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = (process.env.CANONICAL_HOST || "www.form.visone-ai.jp").toLowerCase();
const ENABLE_BASIC_AUTH = (process.env.ENABLE_BASIC_AUTH ?? "1") !== "0";
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || "";
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS || "";

function needsCanonicalRedirect(req: NextRequest): string | null {
  const url = req.nextUrl.clone();
  const xfProto = (req.headers.get("x-forwarded-proto") || "").toLowerCase();
  const xfHost  = (req.headers.get("x-forwarded-host")  || req.headers.get("host") || url.host).toLowerCase();

  let changed = false;

  // Force https
  if (xfProto !== "https") {
    url.protocol = "https:";
    changed = true;
  }

  // Force canonical host
  if (xfHost !== CANONICAL_HOST) {
    url.host = CANONICAL_HOST;
    changed = true;
  }

  return changed ? url.toString() : null;
}

function basicAuthOk(req: NextRequest): boolean {
  const h = req.headers.get("authorization");
  if (!h || !h.startsWith("Basic ")) return false;
  try {
    const decoded = atob(h.slice(6)); // "user:pass"
    const idx = decoded.indexOf(":");
    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);
    return user === BASIC_AUTH_USER && pass === BASIC_AUTH_PASS;
  } catch {
    return false;
  }
}

function unauthorized(): NextResponse {
  const res = new NextResponse("Unauthorized", { status: 401 });
  res.headers.set("WWW-Authenticate", 'Basic realm="Protected"');
  return res;
}

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "accelerometer=(), autoplay=(), camera=(), microphone=(), geolocation=(), interest-cohort=()");
  return res;
}

export function middleware(req: NextRequest) {
  // 1) 正規化リダイレクト（最優先）
  const target = needsCanonicalRedirect(req);
  if (target) return NextResponse.redirect(target, 301);

  // 2) Basic 認証（正規URLに着地後）
  const p = req.nextUrl.pathname;
  const isHealth = p === "/healthz" || p === "/api/healthz";
  if (!isHealth && ENABLE_BASIC_AUTH && BASIC_AUTH_USER && BASIC_AUTH_PASS) {
    if (!basicAuthOk(req)) return unauthorized();
  }

  // 3) 通常レスポンス + セキュリティ標準ヘッダ
  return withSecurityHeaders(NextResponse.next());
}

// Next.js ミドルウェア適用範囲（内部静的配信は除外）
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};