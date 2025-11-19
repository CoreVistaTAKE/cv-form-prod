// app/api/forms/resolve/route.ts
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const FLOW_GET_BUILD_STATUS_URL = process.env.FLOW_GET_BUILD_STATUS_URL!;
const FLOW_GET_NEXT_SEQ_URL = process.env.FLOW_GET_NEXT_SEQ_URL!;

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

type GetStatusResp = { percent?: number; url?: string; qrPath?: string; step?: string; ok?: boolean; schemaPath?: string; body?: any; result?: any; };

export async function POST(req: Request) {
  try {
    const { varUser, varBldg, varHost } = await req.json();
    const user = String(varUser || "").trim();
    const bldg = String(varBldg || "").trim();
    if (!user || !bldg) return NextResponse.json({ ok: false, reason: "user/bldg が未指定" }, { status: 400 });
    if (!FLOW_GET_BUILD_STATUS_URL) return NextResponse.json({ ok: false, reason: "FLOW_GET_BUILD_STATUS_URL 未設定" }, { status: 500 });

    // 近い seq から降順に探索（NEXT_SEQ があればヒントに）
    let nextSeqNum = 999;
    if (FLOW_GET_NEXT_SEQ_URL) {
      try {
        const seqRes: any = await postJson<any>(FLOW_GET_NEXT_SEQ_URL, { varUser: user, varBldg: bldg });
        const seqStr: string = seqRes?.nextSeq || seqRes?.seq || seqRes?.body?.nextSeq || seqRes?.body?.seq || "";
        const parsed = parseInt(String(seqStr).replace(/\D+/g, ""), 10);
        if (!Number.isNaN(parsed) && parsed > 0) nextSeqNum = parsed;
      } catch {}
    }

    const MAX_TRY = 50;
    const start = Math.max(1, nextSeqNum - 1);
    const userLower = user.toLowerCase();

    for (let i = start; i >= Math.max(1, start - (MAX_TRY - 1)); i--) {
      const seq = String(i).padStart(3, "0");
      const token = `${userLower}_${seq}_${bldg}`;
      const statusPath = `/drive/root:/01_InternalTest/${user}/${token}/form/status.json`;

      try {
        const st = await postJson<GetStatusResp>(FLOW_GET_BUILD_STATUS_URL, { statusPath });
        const url = st?.url || st?.body?.url || st?.result?.url;
        const schemaPath =
          st?.schemaPath || st?.body?.schemaPath || st?.result?.schemaPath
          || `/drive/root:/01_InternalTest/${user}/${token}/form/form_base_${bldg}_${seq}.json`;

        if (url) {
          return NextResponse.json({
            ok: true, exists: true, url, schemaPath,
            from: { statusPath, seq, token }
          });
        }
      } catch { /* 次候補へ */ }
    }

    return NextResponse.json({ ok: true, exists: false, reason: "status.json が見つかりません（完成未反映）" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message || "unexpected error" }, { status: 500 });
  }
}
