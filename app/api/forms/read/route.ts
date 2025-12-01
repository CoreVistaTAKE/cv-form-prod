import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const FLOW_GET_FORM_SCHEMA_URL = process.env.FLOW_GET_FORM_SCHEMA_URL ?? "";
const FORM_BASE_ROOT = process.env.FORM_BASE_ROOT || "";

// トークン形式の建物フォルダ名: 例) "FirstService_001_テストビルA"
const BUILDING_TOKEN_RE = /^([A-Za-z0-9]+)_(\d{3})_(.+)$/;

async function readJson(p: string) {
  const raw = await fs.readFile(p, "utf-8");
  return JSON.parse(raw);
}

/**
 * フォーム定義の読み込み
 * - 優先: GetFormSchemaFromOneDrive（FLOW_GET_FORM_SCHEMA_URL）
 * - フォールバック: fs-root（FORM_BASE_ROOT）配下から読み込み
 *
 * 受け取るパラメータ：
 *   varUser / user  … ユーザーID (例: "FirstService")
 *   varBldg / bldg  … 建物名 or フォルダトークン
 *   varSeq  / seq   … 3桁の Sseq (例: "001") 省略時は "001"
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;

    const user =
      (body.varUser ||
        body.user ||
        process.env.NEXT_PUBLIC_DEFAULT_USER ||
        "FirstService")
        .toString()
        .trim();

    const bldgRaw = (body.varBldg || body.bldg || "")
      .toString()
      .trim();

    // seq は数字以外なら無視して "001" にする
    let seqRaw = (body.varSeq || body.seq || "").toString();
    if (!/^\d+$/.test(seqRaw)) seqRaw = "001";
    let seq = seqRaw.padStart(3, "0");

    // ====== bldgRaw を解析して buildingName / folderToken を決める ======
    let buildingName = bldgRaw; // "テストビルA" など
    let folderToken: string | null = null;

    const m = BUILDING_TOKEN_RE.exec(bldgRaw);
    if (m) {
      // bldgRaw が "FirstService_001_テストビルA" 形式
      // m[1] = User, m[2] = Seq, m[3] = 建物名
      folderToken = bldgRaw;
      buildingName = m[3];
      // 明示的な varSeq / seq が無い場合は、トークン側の Seq を採用
      if (!body.varSeq && !body.seq) {
        seq = m[2].padStart(3, "0");
      }
    } else if (bldgRaw) {
      // 単なる建物名（例: "テストビルA"）
      folderToken = `${user}_${seq}_${bldgRaw}`;
      buildingName = bldgRaw;
    }

    // ==================================================
    // 1) Flow 優先: OneDrive（GetFormSchemaFromOneDrive）から読む
    // ==================================================
    if (FLOW_GET_FORM_SCHEMA_URL) {
      const res = await fetch(FLOW_GET_FORM_SCHEMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          // Flow 側は常に「ユーザー名 + 建物名 + Seq」でパス組み立てする想定
          varUser: user,
          varBldg: buildingName, // ← フォルダ名ではなく建物名だけ
          varSeq: seq,           // ← 常に 3 桁
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

      // Flow 応答から schema を抽出
      let schema: any;
      if (payload?.ok && payload.schema) {
        schema = payload.schema;
      } else if (payload?.ok && payload.data?.schema) {
        schema = payload.data.schema;
      } else if (
        payload?.meta &&
        Array.isArray(payload.pages) &&
        Array.isArray(payload.fields)
      ) {
        // スキーマ本体がそのまま返ってきたケース
        schema = payload;
      } else {
        const reason =
          payload?.reason ||
          payload?.error ||
          "Flow 応答に schema が含まれていません。";
        return NextResponse.json({ ok: false, reason }, { status: 500 });
      }

      return NextResponse.json({ ok: true, schema });
    }

    // ==================================================
    // 2) Flow 未設定時のフォールバック: fs-root（開発用）
    // ==================================================
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

    // 建物指定なし → BaseSystem にフォールバック
    if (!bldgRaw || !folderToken) {
      const basePath = path.join(
        FORM_BASE_ROOT,
        "BaseSystem",
        "form",
        "form_base.json",
      );
      const schema = await readJson(basePath);
      return NextResponse.json({ ok: true, schema });
    }

    // 例:
    //   FORM_BASE_ROOT = fs-root/02_Cliants/FirstService
    //   folderToken    = FirstService_001_テストビルA
    //   buildingName   = テストビルA
    //
    // → fs-root/02_Cliants/FirstService/FirstService_001_テストビルA/form/...
    const formDir = path.join(FORM_BASE_ROOT, folderToken, "form");

    // 候補1: form_base.json
    const primaryPath = path.join(formDir, "form_base.json");

    let schema: any | null = null;
    let firstError: unknown = null;

    try {
      schema = await readJson(primaryPath);
    } catch (e) {
      firstError = e;
    }

    // 候補2: form_base_<建物名>_<Seq>.json
    if (!schema) {
      const altName = `form_base_${buildingName}_${seq}.json`;
      const altPath = path.join(formDir, altName);
      try {
        schema = await readJson(altPath);
      } catch (e2) {
        console.error("[api/forms/read] schema not found", {
          formDir,
          primaryPath,
          altPath,
          firstError,
          secondError: e2,
        });
        return NextResponse.json(
          {
            ok: false,
            reason: `ファイル/フォルダが見つかりませんでした: ${formDir}`,
          },
          { status: 500 },
        );
      }
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
