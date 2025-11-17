import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Prod from "./middleware.prod";

const ALLOW_LOCAL = ["localhost","127.0.0.1","::1"];

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const isLocal = ALLOW_LOCAL.some(h => host.includes(h));
  const enforce = process.env.NODE_ENV === "production" || process.env.CANONICAL_ENFORCE === "true";
  // dev では強制停止、localhost/127.0.0.1/::1 は常に停止
  if (!enforce || isLocal) return NextResponse.next();
  // 本番は元の middleware に委譲（存在しない場合は素通し）
  // @ts-ignore
  if (Prod && typeof (Prod as any).middleware === "function") return (Prod as any).middleware(request);
  return NextResponse.next();
}

// 元の config があれば引き継ぐ（なければ全パス対象）
export const config = (Prod as any)?.config ?? { matcher: ["/:path*"] };
