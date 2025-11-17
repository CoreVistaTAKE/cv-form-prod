import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const p = path.join(process.cwd(), "CHANGELOG.md");
    const buf = await fs.readFile(p);
    let txt = buf.toString("utf8");
    if (txt.length > 2000) txt = txt.slice(0, 2000) + "\\n... (truncated)";
    return NextResponse.json({ ok: true, changelog: txt });
  } catch (e:any) {
    return NextResponse.json({ ok: false, error: e?.message || "read failed" }, { status: 500 });
  }
}
