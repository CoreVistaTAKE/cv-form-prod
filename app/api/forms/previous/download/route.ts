// app/api/forms/previous/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";

const FORM_BASE_ROOT = process.env.FORM_BASE_ROOT;

export async function GET(req: NextRequest) {
  if (!FORM_BASE_ROOT) {
    return NextResponse.json(
      {
        ok: false,
        reason: "FORM_BASE_ROOT がサーバー側で設定されていません。",
      },
      { status: 500 }
    );
  }

  try {
    const url = new URL(req.url);
    const user = (url.searchParams.get("user") ?? "").trim();
    const bldg = (url.searchParams.get("bldg") ?? "").trim();
    const seqRaw = url.searchParams.get("seq") ?? "001";
    const seq = String(seqRaw || "001").padStart(3, "0");
    const file = url.searchParams.get("file");

    if (!user || !bldg || !file) {
      return NextResponse.json(
        { ok: false, reason: "user / bldg / file が不足しています。" },
        { status: 400 }
      );
    }

    // パストラバーサル対策でファイル名だけ抽出
    const safeFile = path.basename(file);
    const filePath = path.join(
      FORM_BASE_ROOT,
      user,
      `${user}_${seq}_${bldg}`,
      "reports",
      safeFile
    );

    const bin = await fs.readFile(filePath);

    return new NextResponse(bin, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          `inline; filename*=UTF-8''${encodeURIComponent(safeFile)}`,
      },
    });
  } catch (err: any) {
    console.error("[api/forms/previous/download] error", err);
    return NextResponse.json(
      { ok: false, reason: err?.message || String(err) },
      { status: 500 }
    );
  }
}
