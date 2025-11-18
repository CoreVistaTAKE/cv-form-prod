// app/api/forms/resolve/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const user = (body.varUser ?? body.user ?? process.env.NEXT_PUBLIC_DEFAULT_USER ?? "").toString();
  const bldg = (body.varBldg ?? body.bldg ?? "").toString();
  const host = (body.varHost ?? body.host ?? process.env.NEXT_PUBLIC_DEFAULT_HOST ?? "").toString();

  if (!user || !bldg || !host) {
    return NextResponse.json({ ok: false, reason: "missing params" }, { status: 400 });
  }

  const base = host.replace(/\/+$/,"");
  const url = `${base}/fill?user=${encodeURIComponent(user)}&bldg=${encodeURIComponent(bldg)}`;

  // ここで GetBuildStatus を叩いて存在確認することも可能だが、失敗してもURLは返す。
  return NextResponse.json({ ok: true, exists: true, url });
}
