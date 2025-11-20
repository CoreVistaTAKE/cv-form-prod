// app/api/registry/lookup/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const FLOW_URL = process.env.FLOW_REGISTRY_LOOKUP_BUILDINGS_URL || "";
const HANDSHAKE_MS = Number(process.env.FLOW_FORWARD_HANDSHAKE_MS || "0");

async function postJson<T>(url: string, body: any, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
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
  } finally {
    clearTimeout(timer);
  }
}

function normalizeItems(raw: any, user: string) {
  const arr: any[] = (
    raw?.items || raw?.value || raw?.body?.items || raw?.body?.value || []
  );
  // item には最低限 token / bldg / seq / statusPath / schemaPath を揃える
  const items = arr.map((it: any) => {
    const token = it?.token || it?.name || "";
    const bldg  = it?.bldg  || it?.building || "";
    const seq   = it?.seq   || it?.sequence || "";
    // statusPath が無ければ推定
    const statusPath =
      it?.statusPath ||
      `/drive/root:/01_InternalTest/${user}/${token}/form/status.json`;
    // schemaPath が無ければ推定
    const schemaPath =
      it?.schemaPath ||
      `/01_InternalTest/${user}/${token}/form/form_base_${bldg}_${seq}.json`;
    return {
      user, token, bldg, seq, statusPath, schemaPath,
      label: `${bldg} / ${seq}`,
    };
  });
  return items;
}

async function _handle(user: string) {
  if (!FLOW_URL) return NextResponse.json({ ok: false, reason: "FLOW_REGISTRY_LOOKUP_BUILDINGS_URL 未設定" }, { status: 500 });
  if (!user)     return NextResponse.json({ ok: false, reason: "user が未指定" }, { status: 400 });

  if (HANDSHAKE_MS > 0) await new Promise(r => setTimeout(r, HANDSHAKE_MS));

  const raw = await postJson<any>(FLOW_URL, { varUser: user });
  const items = normalizeItems(raw, user);
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  try {
    const j = await req.json().catch(() => ({}));
    const user = String(j.user ?? j.varUser ?? process.env.NEXT_PUBLIC_DEFAULT_USER ?? "").trim();
    return _handle(user);
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message || "unexpected" }, { status: 500 });
  }
}

// GETにも対応（ブラウザ直叩き確認用）
export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = (url.searchParams.get("user") || process.env.NEXT_PUBLIC_DEFAULT_USER || "").trim();
  return _handle(user);
}
