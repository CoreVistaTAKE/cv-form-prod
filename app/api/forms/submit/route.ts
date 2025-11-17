import { NextRequest, NextResponse } from "next/server";

function pick<T extends object>(src: any, keys: (keyof T)[]): Partial<T> {
  const out: any = {};
  for (const k of keys) {
    if (src && src[k] !== undefined) out[k] = src[k];
  }
  return out;
}

export async function GET() {
  return NextResponse.json({ ok: true, name: "forms-submit" });
}

export async function POST(req: NextRequest) {
  const forwardUrl = process.env.FLOW_PROCESS_FORM_SUBMISSION_URL;
  const ms = Number(process.env.FLOW_FORWARD_HANDSHAKE_MS || "1500");

  if (!forwardUrl) {
    return NextResponse.json(
      { ok: false, error: "Internal", detail: "missing env: FLOW_PROCESS_FORM_SUBMISSION_URL" },
      { status: 500 },
    );
  }

  // 受領ボディ（JSON 前提）
  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  // ここで「二系統のキー」を正規化
  const user  = body.varUser ?? body.username ?? body.user ?? "";
  const bldg  = body.varBldg ?? body.bldg   ?? "";
  const host  = body.varHost ?? body.host   ?? "";

  // 必須チェック
  const missing: string[] = [];
  if (!user) missing.push("user");
  if (!bldg) missing.push("bldg");
  if (!host) missing.push("host");

  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: "Bad Request", detail: `missing: ${missing.join(",")}` },
      { status: 400 },
    );
  }

  // トレースID
  const traceId = Math.random().toString(36).slice(2) + "-" + Math.random().toString(36).slice(2);

  // フォワードするペイロード（元の body を温存 + 正規化フィールド）
  const payload = {
    ...body,
    user, bldg, host,
    traceId,
  };

  // “投げっぱなしACK”: fetch は await しない
  (async () => {
    try {
      await fetch(forwardUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (_e) {
      // ログに残したければここに console.error
    }
  })();

  // 即時ACK
  return NextResponse.json({
    ok: true,
    accepted: true,
    forwarded: false,        // ACK 時点では未完了想定
    reason: `detached after ${ms}ms`,
    input: pick<typeof payload>(payload, ["user","bldg","host","traceId"]) ,
  });
}
