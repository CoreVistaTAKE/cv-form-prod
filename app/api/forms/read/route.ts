// app/api/forms/read/route.ts
import { NextRequest, NextResponse } from "next/server";

const FLOW_GET_FORM_SCHEMA_URL =
  process.env.FLOW_GET_FORM_SCHEMA_URL || "";

// 例: "FirstService_001_テストビルB"
const BUILDING_TOKEN_RE = /^([A-Za-z0-9]+)_(\d{3})_(.+)$/;

/**
 * フォーム定義を OneDrive から取得する API
 *
 * 入口パラメータ（どれも任意）:
 *   varUser / user  … テナントID (例: "FirstService")
 *   varBldg / bldg  … 建物名 もしくは フォルダ名
 *                      - "テストビルB"
 *                      - "FirstService_001_テストビルB"
 *   varSeq  / seq   … "001" 形式の通番（未指定なら 001）
 *
 * 処理フロー:
 *   1) user / bldgRaw / seq を正規化
 *   2) bldgRaw が "FirstService_001_テストビルB" 形式なら
 *        → 建物名 = "テストビルB" / seq = "001"
 *   3) Flow (GetFormSchemaFromOneDrive) を呼び出し
 *        varUser = user
 *        varBldg = 建物名
 *        varSeq  = seq (3桁)
 *   4) Flow 応答から schema を取り出して返却
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;

    const user = (
      body.varUser ||
      body.user ||
      process.env.NEXT_PUBLIC_DEFAULT_USER ||
      "FirstService"
    )
      .toString()
      .trim();

    const bldgRaw = (body.varBldg || body.bldg || "")
      .toString()
      .trim();

    // seq は数字以外なら 001 にする
    let seqRaw = (body.varSeq || body.seq || "").toString();
    if (!/^\d+$/.test(seqRaw)) seqRaw = "001";
    let seq = seqRaw.padStart(3, "0");

    // ===== bldgRaw から建物名と seq を抽出 =====
    let buildingName = bldgRaw;

    const m = BUILDING_TOKEN_RE.exec(bldgRaw);
    if (m) {
      // 例: "FirstService_001_テストビルB"
      // m[1] = "FirstService", m[2] = "001", m[3] = "テストビルB"
      buildingName = m[3];
      // URL 側で seq 指定が無ければ、トークンの seq を採用
      if (!body.varSeq && !body.seq) {
        seq = m[2].padStart(3, "0");
      }
    }

    if (!FLOW_GET_FORM_SCHEMA_URL) {
      return NextResponse.json(
        {
          ok: false,
          reason:
            "FLOW_GET_FORM_SCHEMA_URL が未設定のため、OneDrive からフォーム定義を取得できません。",
        },
        { status: 500 },
      );
    }

    // ===== Power Automate (GetFormSchemaFromOneDrive) 呼び出し =====
    const flowRes = await fetch(FLOW_GET_FORM_SCHEMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        varUser: user,
        varBldg: buildingName, // ← フォルダ名ではなく建物名だけ
        varSeq: seq,           // ← 常に 3 桁 ("001" など)
      }),
    });

    const text = await flowRes.text();

    if (!flowRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          reason: `Flow HTTP ${flowRes.status}: ${text}`,
        },
        { status: 500 },
      );
    }

    let payload: any = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json(
        {
          ok: false,
          reason: "Flow 応答 JSON の parse に失敗しました。",
        },
        { status: 500 },
      );
    }

    // ===== Flow 応答から schema を抽出 =====
    let schema: any;

    // ① 推奨: { ok:true, schema:{meta,pages,fields} }
    if (payload?.ok && payload.schema) {
      schema = payload.schema;

      // ② { ok:true, data:{ schema:{...} } }
    } else if (payload?.ok && payload.data?.schema) {
      schema = payload.data.schema;

      // ③ スキーマ本体そのまま: {meta,pages,fields}
    } else if (
      payload?.meta &&
      Array.isArray(payload.pages) &&
      Array.isArray(payload.fields)
    ) {
      schema = payload;
    } else {
      const reason =
        payload?.reason ||
        payload?.error ||
        "Flow 応答に schema が含まれていません。";
      return NextResponse.json({ ok: false, reason }, { status: 500 });
    }

    return NextResponse.json({ ok: true, schema });
  } catch (err: any) {
    console.error("[api/forms/read] error", err);
    return NextResponse.json(
      {
        ok: false,
        reason: err?.message || String(err),
      },
      { status: 500 },
    );
  }
}
