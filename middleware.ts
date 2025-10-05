import { NextRequest, NextResponse } from "next/server";

const CANONICAL_HOST = (process.env.CANONICAL_HOST || "www.form.visone-ai.jp").toLowerCase();
const ENABLE_BASIC_AUTH = (process.env.ENABLE_BASIC_AUTH ?? "1") !== "0";
const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || "";
const BASIC_AUTH_PASS = process.env.BASIC_AUTH_PASS || "";

/** x-forwarded-host を複数値/ポート付きでも正規化 */
function normalizedForwardedHost(req: NextRequest): string {
  const raw = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return raw.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

/** x-forwarded-proto を複数値でも先頭だけ採用 */
function normalizedForwardedProto(req: NextRequest): string {
  const raw = req.headers.get("x-forwarded-proto") || "";
  return raw.split(",")[0].trim().toLowerCase();
}

/** https + 正規ホスト + ポート消去 へ 301 が必要なら URL を返す */
function needsCanonicalRedirect(req: NextRequest): string | null {
  const xfProto = normalizedForwardedProto(req);
  const xfHost  = normalizedForwardedHost(req);

  const url = req.nextUrl.clone();
  let changed = false;

  // https 強制（外形/内部いずれも https で統一）
  if (xfProto !== "https" || url.protocol !== "https:") {
    url.protocol = "https:";
    changed = true;
  }

  // 正規ホスト強制（:443 等のポート付きも排除）
  if (xfHost !== CANONICAL_HOST || url.hostname !== CANONICAL_HOST) {
    url.hostname = CANONICAL_HOST;
    changed = true;
  }

  // Location にポート番号を出さない
  if (url.port) {
    url.port = "";
    changed = true;
  }

  return changed ? url.toString() : null;
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
  // Basic 認証運用中はインデックス禁止（誤公開対策）
  if (ENABLE_BASIC_AUTH) {
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
  // 1) 正規化 301（https + 正規ホスト + ポート削除）— 最優先
  const target = needsCanonicalRedirect(req);
  if (target) return withSecurityHeaders(NextResponse.redirect(target, 301));

  // 2) Basic 認証（正規 URL に着地後）
  const p = req.nextUrl.pathname;
  const isHealth = p === "/healthz" || p === "/api/healthz"; // 死活監視は素通し
  if (!isHealth && ENABLE_BASIC_AUTH && BASIC_AUTH_USER && BASIC_AUTH_PASS) {
    if (!basicAuthOk(req)) return unauthorized();
  }

  // 3) 通常レスポンス（200 等）にもセキュリティ標準ヘッダを常時付与
  return withSecurityHeaders(NextResponse.next());
}

// ミドルウェア適用範囲（内部静的配信は除外）
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
