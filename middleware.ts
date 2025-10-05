import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = (process.env.CANONICAL_HOST || "www.form.visone-ai.jp").toLowerCase();
const ENABLE_BASIC_AUTH = (process.env.ENABLE_BASIC_AUTH ?? "1") !== "0";
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || "";
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS || "";

/** 外形 Host を正規化（複数値/ポート付き対応） */
function externalHost(req: NextRequest): string {
  const raw = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return raw.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

/** 外形 Proto を正規化（複数値対応） */
function externalProto(req: NextRequest): string {
  const raw = req.headers.get("x-forwarded-proto") || "";
  return raw.split(",")[0].trim().toLowerCase();
}

/** Location を外形情報だけで明示組み立て（ポートを絶対に出さない） */
function buildExternalUrl(req: NextRequest, host: string): string {
  const u = req.nextUrl;
  const path = u.pathname || "/";
  const search = u.search || "";
  const hash = u.hash || "";
  return `https://${host}${path}${search}${hash}`;
}

/** https + 正規ホスト 以外なら 301 先 URL を返す（外形のみで判定） */
function needsCanonicalRedirect(req: NextRequest): string | null {
  const protoOk = externalProto(req) === "https";
  const hostOk = externalHost(req) === CANONICAL_HOST;
  if (protoOk && hostOk) return null;
  return buildExternalUrl(req, CANONICAL_HOST);
}

/** Authorization: Basic を robust に復号（Edge/Node 双対応） */
function decodeBasicHeader(h: string): { user: string; pass: string } | null {
  if (!h || !h.startsWith("Basic ")) return null;
  const b64 = h.slice(6).trim();
  try {
    const atobFn: any = (globalThis as any).atob;
    const decoded: string = atobFn
      ? atobFn(b64)
      : (globalThis as any).Buffer
      ? (globalThis as any).Buffer.from(b64, "base64").toString("utf8")
      : "";
    if (!decoded) return null;
    const i = decoded.indexOf(":");
    return { user: i >= 0 ? decoded.slice(0, i) : decoded, pass: i >= 0 ? decoded.slice(i + 1) : "" };
  } catch {
    return null;
  }
}

function basicAuthOk(req: NextRequest): boolean {
  const creds = decodeBasicHeader(req.headers.get("authorization") || "");
  if (!creds) return false;
  return creds.user === BASIC_AUTH_USER && creds.pass === BASIC_AUTH_PASS;
}

/** すべての応答（301/401/200）にセキュリティ標準ヘッダを付与 */
function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "accelerometer=(), autoplay=(), camera=(), microphone=(), geolocation=(), interest-cohort=()");
  if (ENABLE_BASIC_AUTH) {
    // 認証中はインデックス禁止（誤公開防止）
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return res;
}

function unauthorized(): NextResponse {
  const res = new NextResponse("Unauthorized", { status: 401 });
  res.headers.set("WWW-Authenticate", 'Basic realm="Protected"');
  return withSecurityHeaders(res);
}

export function middleware(req: NextRequest) {
  // 1) 正規化 301（https + 正規ホストのみで判定）— 最優先
  const target = needsCanonicalRedirect(req);
  if (target) return withSecurityHeaders(NextResponse.redirect(target, 301));

  // 2) Basic 認証（正規 URL に着地後）
  const p = req.nextUrl.pathname;
  const isHealth = p === "/healthz" || p === "/api/healthz"; // 監視系は素通し
  if (!isHealth && ENABLE_BASIC_AUTH && BASIC_AUTH_USER && BASIC_AUTH_PASS) {
    if (!basicAuthOk(req)) return unauthorized();
  }

  // 3) 通常レスポンスにもセキュリティ標準ヘッダを常時付与
  return withSecurityHeaders(NextResponse.next());
}

// 適用範囲（内部静的配信は除外）
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
