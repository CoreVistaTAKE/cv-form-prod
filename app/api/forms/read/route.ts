// app/api/forms/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const FLOW_GET_FORM_SCHEMA_URL = process.env.FLOW_GET_FORM_SCHEMA_URL ?? "";
const FORM_BASE_ROOT = process.env.FORM_BASE_ROOT || "";

// Flow の応答から schema を取り出すヘルパ
function extractSchema(payload: any) {
  // ① { ok:true, schema:{...} }
  if (payload?.ok && payload.schema) return payload.schema;
  // ② { ok:true, data:{schema:{...}} }
  if (payload?.ok && payload.data?.schema) return payload.data.schema;
  // ③ {meta,pages,fields} をそのまま返してくるパターン
  if (
    payload?.meta &&
    Array.isArray(payload.pages) &&
    Array.isArray(payload.fields)
  ) {
    return payload;
  }
  throw new Error("Flow 応答から schema を抽出できませんでした。");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;

    const user =
      (body.varUser || body.user || process.env.NEXT_PUBLIC_DEFAULT_USER || "FirstService")
        .toString()
        .trim();

    const bldg = (body.varBldg || body.bldg || "")
      .toString()
      .trim();

    const seqRaw = (body.varSeq || body.seq || "001").toString();
    const seq = seqRaw.padStart(3, "0");

    // ===============================
    // 1) Flow 優先: OneDrive から読む
    // ===============================
    if (FLOW_GET_FORM_SCHEMA_URL) {
      const res = await fetch(FLOW_GET_FORM_SCHEMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          varUser: user,
          varBldg: bldg,
          varSeq: seq,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        return NextResponse.json(
          {
            ok: false,
            reason: `Flow HTTP ${res.status}: ${text}`,
          },
          { status: 500 },
        );
      }

      let payload: any = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        throw new Error("Flow 応答 JSON の parse に失敗しました。");
      }

      const schema = extractSchema(payload);
      return NextResponse.json({ ok: true, schema });
    }

    // ==========================================
    // 2) Flow 未設定時のフォールバック: FS から読む
    //    （ローカル開発や緊急時用）
    // ==========================================
    if (!FORM_BASE_ROOT) {
      return NextResponse.json(
        {
          ok: false,
          reason:
            "FLOW_GET_FORM_SCHEMA_URL も FORM_BASE_ROOT も未設定です。どちらかを設定してください。",
        },
        { status: 500 },
      );
    }

    // 建物指定が無ければ BaseSystem を返す
    if (!bldg) {
      const basePath = path.join(
        FORM_BASE_ROOT,
        "BaseSystem",
        "form",
        "form_base.json",
      );
      const raw = await fs.readFile(basePath, "utf-8");
      const schema = JSON.parse(raw);
      return NextResponse.json({ ok: true, schema });
    }

    // 建物フォルダ名を組み立て (<user>_<seq>_<bldg>)
    const folderName = `${user}_${seq}_${bldg}`;
    const formDir = path.join(
      FORM_BASE_ROOT,
      folderName,
      "form",
    );

    // form_base_<bldg>_<seq>.json を読む
    const filePath = path.join(
      formDir,
      `form_base_${bldg}_${seq}.json`,
    );
    const raw = await fs.readFile(filePath, "utf-8");
    const schema = JSON.parse(raw);

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
