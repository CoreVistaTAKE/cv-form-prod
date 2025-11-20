// app/resolve/route.ts
export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const user = (url.searchParams.get("user") ?? "").trim();
  const bldg = (url.searchParams.get("bldg") ?? "").trim();
  const host = (url.searchParams.get("host") ?? process.env.NEXT_PUBLIC_DEFAULT_HOST ?? "").trim();

  if (!user || !bldg) {
    return NextResponse.json({ ok: false, reason: "missing user or bldg" }, { status: 400 });
  }

  const target = new URL("/fill", url.origin);
  target.searchParams.set("user", user);
  target.searchParams.set("bldg", bldg);
  if (host) target.searchParams.set("host", host);

  return NextResponse.redirect(target, 302);
}
