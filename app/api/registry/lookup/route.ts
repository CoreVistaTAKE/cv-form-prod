// app/api/registry/lookup/route.ts
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const FLOW_REGISTRY_LOOKUP_BUILDINGS_URL = process.env.FLOW_REGISTRY_LOOKUP_BUILDINGS_URL!;
const DEF_USER = process.env.NEXT_PUBLIC_DEFAULT_USER || "";

async function postJson<T>(url: string, body: any, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: "no-store",
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} ${txt}`);
    try { return JSON.parse(txt) as T; } catch { return {} as T; }
  } finally { clearTimeout(id); }
}

export async function POST(req: Request) {
  try {
    const j = await req.json().catch(() => ({}));
    const user = String(j.varUser || DEF_USER || "").trim();
    const host = String(j.varHost || process.env.NEXT_PUBLIC_DEFAULT_HOST || "").trim();

    if (!FLOW_REGISTRY_LOOKUP_BUILDINGS_URL) {
      return NextResponse.json({ ok: false, reason: "FLOW_REGISTRY_LOOKUP_BUILDINGS_URL 未設定" }, { status: 500 });
    }
    if (!user) {
      return NextResponse.json({ ok: false, reason: "varUser が未指定" }, { status: 400 });
    }

    // Flow 応答のばらつきに耐える正規化
    const raw: any = await postJson<any>(FLOW_REGISTRY_LOOKUP_BUILDINGS_URL, { varUser: user, varHost: host });

    const list: any[] =
      Array.isArray(raw?.items) ? raw.items :
      Array.isArray(raw?.value) ? raw.value :
      Array.isArray(raw?.body?.items) ? raw.body.items :
      Array.isArray(raw) ? raw : [];

    const options: string[] = [];
    for (const it of list) {
      const name =
        typeof it === "string" ? it :
        (it?.bldg || it?.name || it?.folderName || it?.token || it?.text || "");
      if (!name) continue;
      if (/BaseSystem/i.test(name)) continue; // ベースは除外
      options.push(String(name));
    }

    // 重複除去
    const dedup = Array.from(new Set(options));
    return NextResponse.json({ ok: true, user, options: dedup, count: dedup.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message || "unexpected error" }, { status: 500 });
  }
}
