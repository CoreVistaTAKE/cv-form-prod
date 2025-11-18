// middleware.ts（プロジェクト直下）
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BASIC_USER = process.env.BASIC_AUTH_USER;
const BASIC_PASS = process.env.BASIC_AUTH_PASS;
const CANON = process.env.NEXT_PUBLIC_CANONICAL_HOST;

export const config = {
  // キャプチャや複雑な拡張子除外をやめ、最低限に
  matcher: ["/((?!_next/|favicon.ico).*)"],
};

export function middleware(req: NextRequest) {
  const { pathname, origin, search } = req.nextUrl;

  // /fill と フォームAPI は素通し
  if (pathname.startsWith("/fill") || pathname.startsWith("/api/forms/") || pathname.startsWith("/api/flows/process-form-submission")) {
    return NextResponse.next();
  }

  // カノニカル
  if (CANON) {
    const host = req.headers.get("host");
    if (host && host !== CANON) {
      return NextResponse.redirect(`${origin.replace(host, CANON)}${pathname}${search}`);
    }
  }

  // 管理系にだけ Basic
  const needsAuth = pathname.startsWith("/user-builder") || pathname.startsWith("/manual") || pathname.startsWith("/admin");
  if (needsAuth && BASIC_USER && BASIC_PASS) {
    const auth = req.headers.get("authorization") || "";
    const [scheme, encoded] = auth.split(" ");
    if (scheme !== "Basic" || !encoded) {
      return new Response("Auth required", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Restricted"' } });
    }
    const [u, p] = atob(encoded).split(":");
    if (u !== BASIC_USER || p !== BASIC_PASS) {
      return new Response("Forbidden", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Restricted"' } });
    }
  }

  return NextResponse.next();
}
