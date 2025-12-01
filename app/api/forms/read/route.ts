// app/api/forms/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const ENV_FORM_BASE_ROOT = process.env.FORM_BASE_ROOT;

/** FORM_BASE_ROOT を安全に取得 */
function getFormBaseRoot(): string {
  const root = ENV_FORM_BASE_ROOT || process.env.FORM_BASE_ROOT;
  if (!root) {
    throw new Error("FORM_BASE_ROOT is not set in environment variables");
  }
  return root;
}

// 例: "FirstService_001_テストビルC" を分解する
const BUILDING_TOKEN_RE = /^([A-Za-z0-9]+)_(\d{3})_(.+)$/;

type Schema = {
  meta?: any;
  pages?: any[];
  fields?: any[];
};

async function readJson(filePath: string): Promise<any> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;

    // --- パラメータ吸収（var付き/無しどちらでもOK） ---
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

    const seqRaw = body.varSeq ?? body.seq ?? "";
    const seq = seqRaw
      ? seqRaw.toString().padStart(3, "0")
      : "001"; // デフォルト 001

    const root = getFormBaseRoot(); // 例: fs-root/02_Cliants/FirstService

    // ===== 1) BaseSystem 読込（建物指定なし） =====
    if (!bldgRaw) {
      const basePath = path.join(root, "BaseSystem", "form", "form_base.json");
      const schema = (await readJson(basePath)) as Schema;
      return NextResponse.json({ ok: true, schema });
    }

    // ===== 2) 建物フォルダ名を決定 =====
    // bldgRaw が "FirstService_001_テストビルC" 形式ならそのまま使う
    // そうでなければ "<user>_<seq>_<bldgRaw>" を自動で作る
    let folderName = bldgRaw;
    let buildingLabel = bldgRaw;
    let seqForFile = seq;

    const m = BUILDING_TOKEN_RE.exec(bldgRaw);
    if (m) {
      // m[1]=user, m[2]=seq, m[3]=建物名
      folderName = bldgRaw;
      buildingLabel = m[3];
      seqForFile = m[2];
    } else {
      folderName = `${user}_${seq}_${bldgRaw}`;
      buildingLabel = bldgRaw;
      seqForFile = seq;
    }

    const formDir = path.join(root, folderName, "form");

    // ===== 3) スキーマファイルを探す =====
    // 優先: form_base.json
    // 次点: form_base_<建物名>_<seq>.json
    let schema: Schema | null = null;
    const primaryPath = path.join(formDir, "form_base.json");
    let firstError: unknown = null;

    try {
      schema = (await readJson(primaryPath)) as Schema;
    } catch (e) {
      firstError = e;
    }

    if (!schema) {
      const altName = `form_base_${buildingLabel}_${seqForFile}.json`;
      const altPath = path.join(formDir, altName);
      try {
        schema = (await readJson(altPath)) as Schema;
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

    // ===== 4) 形式を揃えて返却 =====
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
