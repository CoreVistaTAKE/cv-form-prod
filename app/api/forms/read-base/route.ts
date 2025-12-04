// /app/api/forms/read-base/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const FORM_BASE_ROOT = process.env.FORM_BASE_ROOT;

/**
 * BaseSystem 用 form_base.json を読むエンドポイント
 * - パス: FORM_BASE_ROOT/BaseSystem/form/form_base.json
 * - Body の varUser などは今は使わない（互換のため受けるだけ）
 */
export async function POST(_req: NextRequest) {
  try {
    if (!FORM_BASE_ROOT) {
      return NextResponse.json(
        {
          ok: false,
          reason:
            "FORM_BASE_ROOT が設定されていません（.env.local と Heroku Config Vars を確認してください）。",
        },
        { status: 500 },
      );
    }

    // 例: fs-root/02_Cliants/FirstService/BaseSystem/form/form_base.json
    const basePath = path.join(
      FORM_BASE_ROOT,
      "BaseSystem",
      "form",
      "form_base.json",
    );

    const raw = await fs.readFile(basePath, "utf-8");
    const schema = JSON.parse(raw);

    return NextResponse.json({ ok: true, schema });
  } catch (e: any) {
    console.error("[api/forms/read-base] error", e);
    const reason =
      e?.code === "ENOENT"
        ? `BaseSystem の form_base.json が見つかりませんでした: ${e?.path || ""}`
        : e?.message || String(e);

    return NextResponse.json({ ok: false, reason }, { status: 500 });
  }
}
