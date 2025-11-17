// app/api/registry/lookup/route.ts
import { NextResponse } from "next/server";
import { join } from "path";
import { existsSync, readFileSync } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegistryItem = {
  user: string;
  bldg: string;
  formUrl?: string;
  updatedAt?: string;
};
type Registry = RegistryItem[];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const user = (searchParams.get("user") || "").trim();
  const bldg = (searchParams.get("bldg") || "").trim();

  if (!user || !bldg) {
    return NextResponse.json(
      { ok: false, error: "BadRequest", detail: "user/bldg is required" },
      { status: 400 }
    );
  }

  // data/inventory.json を見に行く（存在しなくても落ちない）
  try {
    const p = join(process.cwd(), "data", "inventory.json");
    if (!existsSync(p)) {
      return NextResponse.json({ ok: true, found: false });
    }
    const raw = readFileSync(p, "utf8");
    const json = JSON.parse(raw) as Registry;
    const hit = json.find(
      (r) => r.user === user && r.bldg === bldg && r.formUrl
    );
    if (!hit) return NextResponse.json({ ok: true, found: false });

    return NextResponse.json({
      ok: true,
      found: true,
      formUrl: hit.formUrl,
      updatedAt: hit.updatedAt ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "ServerError", detail: e?.message ?? "read error" },
      { status: 500 }
    );
  }
}
