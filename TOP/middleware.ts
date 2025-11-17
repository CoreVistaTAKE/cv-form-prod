import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const publicMode = process.env.NEXT_PUBLIC_PUBLIC_MODE === "true";
  const url = req.nextUrl;
  const path = url.pathname;

  // Public モード時：ホーム＆社内ビルダーは見せない（直URLでも）
  if (publicMode) {
    if (path === "/" || path.startsWith("/builder")) {
      url.pathname = "/user-builder";
      return NextResponse.redirect(url);
    }
  }

  // 任意：Basic 認証（/builder のみ、Edge 互換）
  const u = process.env.BASIC_AUTH_USER;
  const p = process.env.BASIC_AUTH_PASS;
  if (!publicMode && path.startsWith("/builder") && u && p) {
    const auth = req.headers.get("authorization");
    if (!auth || !auth.startsWith("Basic ")) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Restricted"' },
      });
    }
    const decoded = atob(auth.slice(6)); // "user:pass"
    const sep = decoded.indexOf(":");
    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);
    if (user !== u || pass !== p) {
      return new NextResponse("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Restricted"' },
      });
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/", "/builder/:path*"] };