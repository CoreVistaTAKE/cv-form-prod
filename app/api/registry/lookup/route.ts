// app/api/registry/lookup/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const ENV_FORM_BASE_ROOT = process.env.FORM_BASE_ROOT;

function getFormBaseRoot(): string {
  const root = ENV_FORM_BASE_ROOT || process.env.FORM_BASE_ROOT;
  if (!root) {
    throw new Error("FORM_BASE_ROOT is not set in environment variables");
  }
  return root;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;

    const varUser =
      (body.varUser || "").toString().trim() ||
      process.env.NEXT_PUBLIC_DEFAULT_USER ||
      "FirstService";

    const root = getFormBaseRoot(); // 例: fs-root/02_Cliants/FirstService

    const entries = await fs.readdir(root, { withFileTypes: true });

    const options = entries
      .filter((ent) => ent.isDirectory())
      .map((ent) => ent.name)
      .filter((name) => name.toLowerCase() !== "basesystem")
      .sort((a, b) => a.localeCompare(b, "ja"));

    return NextResponse.json({ ok: true, user: varUser, options });
  } catch (e: any) {
    console.error("[api/registry/lookup] error", e);
    const msg =
      e?.code === "ENOENT"
        ? `フォルダが見つかりませんでした: ${e?.path || ""}`
        : e?.message || String(e);
    return NextResponse.json(
      { ok: false, reason: msg },
      { status: 500 },
    );
  }
}
