import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Prod from "./middleware.prod";

const ALLOW_LOCAL = ["localhost","127.0.0.1","::1"];

export function middleware(request: NextRequest) {
  const url = new URL(request.url);
  const host = request.headers.get("host") || url.host;
  const isLocal = ALLOW_LOCAL.some(h => host.includes(h));
  const enforce = process.env.NODE_ENV === "production" || process.env.CANONICAL_ENFORCE === "true";

  // dev or localhost のときは本番リダイレクトを完全停止し、入口をローカルの /admin-builder に固定
  if (!enforce || isLocal) {
    const p = url.pathname;
    if (isLocal && (p === "/" || p === "/builder")) {
      return NextResponse.rewrite(new URL("/admin-builder", request.url));
    }
    return NextResponse.next();
  }

  // 本番は元の middleware に委譲（無ければ素通し）
  // @ts-ignore
  if (Prod && typeof (Prod as any).middleware === "function") return (Prod as any).middleware(request);
  return NextResponse.next();
}

// マッチャーは元の設定を引き継ぐ。無ければ全パス。
export const config = (Prod as any)?.config ?? { matcher: ["/:path*"] };
