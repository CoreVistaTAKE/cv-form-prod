// app/api/forms/resolve/route.ts
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { varUser, varBldg } = await req.json();
    if (!varUser || !varBldg) {
      return Response.json({ ok: false, reason: "varUser/varBldg は必須" }, { status: 400 });
    }

    const GET_NEXT = process.env.FLOW_GET_NEXT_SEQ_URL!;
    const GET_STATUS = process.env.FLOW_GET_BUILD_STATUS_URL!;

    // 1) 次シーケンスを取得
    const nextRes = await fetch(GET_NEXT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ varUser, varBldg }),
      cache: "no-store",
    });
    if (!nextRes.ok) {
      const t = await nextRes.text().catch(() => "");
      return Response.json({ ok: false, reason: `GetNextSeq 失敗: ${nextRes.status} ${t}` }, { status: 500 });
    }
    const nextJson: any = await nextRes.json().catch(() => ({}));
    const nextSeq = Number(nextJson?.seq ?? nextJson?.nextSeq ?? NaN);
    if (!Number.isFinite(nextSeq)) {
      return Response.json({ ok: false, reason: "GetNextSeq の応答が不正（seq が無い）" }, { status: 500 });
    }
    const seq = String(Math.max(1, nextSeq - 1)).padStart(3, "0");

    // 2) status.json のパス作成
    const statusPath =
      `/drive/root:/02_Cliants/${varUser}/${varUser}_${seq}_${varBldg}/form/status.json`;

    // 3) GetBuildStatus で URL を取得
    const stRes = await fetch(GET_STATUS, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ statusPath }),
      cache: "no-store",
    });
    if (!stRes.ok) {
      const t = await stRes.text().catch(() => "");
      return Response.json({ ok: false, reason: `GetBuildStatus 失敗: ${stRes.status} ${t}` }, { status: 500 });
    }
    const st: any = await stRes.json().catch(() => ({}));
    const url = st?.url || st?.body?.url || st?.result?.url || null;

    if (!url) {
      return Response.json({ ok: false, reason: "status.json に url がありません。" }, { status: 404 });
    }

    return Response.json({ ok: true, exists: true, url, statusPath, seq });
  } catch (e: any) {
    return Response.json({ ok: false, reason: e?.message || String(e) }, { status: 500 });
  }
}
