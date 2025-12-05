// app/api/flows/create-form-folder/route.ts
import { NextResponse } from "next/server";
import { currentOrigin, postFlow } from "../_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

function safeStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const s = safeStr(x).trim();
    if (s) out.push(s);
  }
  return out;
}

export async function POST(req: Request) {
  const url = process.env.FLOW_CREATE_FORM_FOLDER_URL;
  if (!url) {
    return NextResponse.json(
      { ok: false, reason: "FLOW_CREATE_FORM_FOLDER_URL is not set." },
      { status: 500 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const varUser = safeStr(body.varUser ?? body.user).trim();
  const varBldg = safeStr(body.varBldg ?? body.bldg).trim();

  // host はクライアント指定を優先（公開URL発行のため）
  const varHostRaw = safeStr(body.varHost ?? body.host).trim();
  const varHost = varHostRaw || currentOrigin();

  const excludePages = safeStrArray(body.excludePages ?? body.varExcludedPages ?? body.excludedPages);
  const excludeFields = safeStrArray(body.excludeFields ?? body.varExcludedFields ?? body.excludedFields);
  const theme = safeStr(body.theme ?? body.varTheme).trim();

  if (!varUser || !varBldg) {
    return NextResponse.json(
      { ok: false, reason: "varUser / varBldg is required." },
      { status: 400 },
    );
  }

  const result = await postFlow(url, {
    varUser,
    varBldg,
    varHost,
    excludePages,
    excludeFields,
    theme,
  });

  return NextResponse.json(result);
}
