// app/api/forms/resolve/route.ts
export const dynamic = "force-dynamic";

import type { NextRequest } from "next/server";

type Body = {
  varUser?: string;
  varBldg?: string;
  varHost?: string;
  user?: string;
  bldg?: string;
  host?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json().catch(() => ({} as any));
    const user = (body.varUser || body.user || process.env.NEXT_PUBLIC_DEFAULT_USER || "").toString();
    const bldg = (body.varBldg || body.bldg || "").toString();
    const host = (body.varHost || body.host || process.env.NEXT_PUBLIC_DEFAULT_HOST || "https://www.form.visone-ai.jp").toString();

    if (!user || !bldg) {
      return new Response(
        JSON.stringify({ ok: false, exists: false, reason: "missing user or bldg" }),
        { status: 400 }
      );
    }

    const url =
      `${host.replace(/\/+$/, "")}/fill` +
      `?user=${encodeURIComponent(user)}&bldg=${encodeURIComponent(bldg)}`;

    return Response.json({ ok: true, exists: true, url });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, reason: e?.message || "unexpected error" }),
      { status: 500 }
    );
  }
}
