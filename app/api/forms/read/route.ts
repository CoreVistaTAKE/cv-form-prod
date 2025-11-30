// app/api/forms/read/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const FORM_BASE_ROOT = process.env.FORM_BASE_ROOT;

export const dynamic = "force-dynamic";

type Body = {
  varUser?: string;
  varBldg?: string;
};

export async function POST(req: Request) {
  if (!FORM_BASE_ROOT) {
    return NextResponse.json(
      {
        ok: false,
        reason: "FORM_BASE_ROOT が未設定です。.env.local を確認してください。",
      },
      { status: 500 },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const user = (body.varUser || "").trim();
    const bldg = (body.varBldg || "").trim();

    if (!user) {
      return NextResponse.json(
        { ok: false, reason: "varUser が空です。" },
        { status: 400 },
      );
    }
    if (!bldg) {
      return NextResponse.json(
        { ok: false, reason: "varBldg が空です。" },
        { status: 400 },
      );
    }

    const userRoot = path.join(FORM_BASE_ROOT, user);
    if (!fs.existsSync(userRoot)) {
      return NextResponse.json(
        {
          ok: false,
          reason: `ファイル/フォルダが見つかりませんでした: ${userRoot}`,
        },
        { status: 500 },
      );
    }

    // ===== 建物フォルダ候補を列挙 =====
    const candidates: { folder: string; formDir: string }[] = [];

    // 1) そのまま user/bldg/form というフォルダがあるか
    const directFolder = path.join(userRoot, bldg);
    const directFormDir = path.join(directFolder, "form");
    if (fs.existsSync(directFormDir)) {
      candidates.push({ folder: directFolder, formDir: directFormDir });
    }

    // 2) user 配下で「末尾が _建物名」のフォルダも候補にする
    //    例: FirstService _001_テストA
    const entries = fs.readdirSync(userRoot, { withFileTypes: true });
    for (const ent of entries) {
      if (!ent.isDirectory()) continue;
      const name = ent.name;
      if (name === "BaseSystem") continue;

      if (name === bldg || name.endsWith("_" + bldg)) {
        const formDir = path.join(userRoot, name, "form");
        if (fs.existsSync(formDir)) {
          candidates.push({
            folder: path.join(userRoot, name),
            formDir,
          });
        }
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          reason: `ファイル/フォルダが見つかりませんでした: ${directFormDir}`,
        },
        { status: 500 },
      );
    }

    // フォルダ名の辞書順で「一番後ろ」（＝Seq が一番大きい想定）を採用
    candidates.sort((a, b) =>
      a.folder.localeCompare(b.folder, "ja"),
    );
    const picked = candidates[candidates.length - 1];

    // ===== form_base*.json を探す =====
    const files = fs.readdirSync(picked.formDir);
    const jsonFiles = files.filter(
      (name) =>
        name.toLowerCase().startsWith("form_base") &&
        name.toLowerCase().endsWith(".json"),
    );

    if (jsonFiles.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          reason: `ファイル/フォルダが見つかりませんでした: ${path.join(
            picked.formDir,
            "form_base*.json",
          )}`,
        },
        { status: 500 },
      );
    }

    // ファイル名の辞書順で最後のものを「最新」とみなす
    jsonFiles.sort();
    const jsonName = jsonFiles[jsonFiles.length - 1];
    const jsonPath = path.join(picked.formDir, jsonName);

    const content = fs.readFileSync(jsonPath, "utf8");
    const schema = JSON.parse(content);

    return NextResponse.json(
      {
        ok: true,
        schema,
        folder: picked.folder,
        jsonPath,
      },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        reason: err?.message || String(err),
      },
      { status: 500 },
    );
  }
}
