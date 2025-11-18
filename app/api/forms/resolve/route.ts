// app/api/forms/resolve/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const FLOW_GET_BUILD_STATUS_URL = process.env.FLOW_GET_BUILD_STATUS_URL!;
const FLOW_GET_NEXT_SEQ_URL = process.env.FLOW_GET_NEXT_SEQ_URL!;

// Flow を叩くユーティリティ
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
  } finally {
    clearTimeout(id);
  }
}

type GetStatusResp = {
  percent?: number;
  url?: string;
  qrPath?: string;
  step?: string;
  ok?: boolean;
};

export async function POST(req: Request) {
  try {
    const { varUser, varBldg, varHost } = await req.json();
    const user = String(varUser || "").trim();
    const bldg = String(varBldg || "").trim();
    const host = String(varHost || (process.env.NEXT_PUBLIC_DEFAULT_HOST ?? "")).trim();

    if (!user || !bldg) {
      return NextResponse.json({ ok: false, reason: "user/bldg が未指定" }, { status: 400 });
    }
    if (!FLOW_GET_BUILD_STATUS_URL) {
      return NextResponse.json({ ok: false, reason: "FLOW_GET_BUILD_STATUS_URL 未設定" }, { status: 500 });
    }

    // 1) nextSeq を参照（取得失敗時は 999 と仮定）
    let nextSeqNum = 999;
    if (FLOW_GET_NEXT_SEQ_URL) {
      try {
        const seqRes: any = await postJson<any>(FLOW_GET_NEXT_SEQ_URL, { varUser: user, varBldg: bldg });
        const seqStr: string =
          seqRes?.nextSeq || seqRes?.seq || seqRes?.body?.nextSeq || seqRes?.body?.seq || "";
        const parsed = parseInt(String(seqStr).replace(/\D+/g, ""), 10);
        if (!Number.isNaN(parsed) && parsed > 0) nextSeqNum = parsed;
      } catch {
        // 失敗は無視（フォールバック探索へ）
      }
    }

    // 2) 最新に近い seq から降順探索（例: 50 件まで）
    const MAX_TRY = 50;
    const start = Math.max(1, nextSeqNum - 1);
    const userLower = user.toLowerCase();

    for (let i = start; i >= Math.max(1, start - (MAX_TRY - 1)); i--) {
      const seq = String(i).padStart(3, "0");
      const token = `${userLower}_${seq}_${bldg}`;
      const statusPath = `/drive/root:/01_InternalTest/${user}/${token}/form/status.json`;

      try {
        const st = await postJson<GetStatusResp>(FLOW_GET_BUILD_STATUS_URL, { statusPath });
        const finalUrl =
          st?.url ||
          // 一部の Flow 実装ではプロパティ位置が異なることがあるため多段で見る
          (st as any)?.body?.url ||
          (st as any)?.result?.url;

        if (finalUrl && /^https?:\/\//i.test(finalUrl)) {
          return NextResponse.json({
            ok: true,
            exists: true,
            url: finalUrl,
            from: { statusPath, seq, token, host },
          });
        }
      } catch {
        // 見つからなければ次の候補へ
      }
    }

    // 見つからず
    return NextResponse.json({
      ok: true,
      exists: false,
      reason: "status.json が見つかりません。『完成フォームを更新』が未実施の可能性があります。",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, reason: e?.message || "unexpected error" }, { status: 500 });
  }
}
