// app/api/debug/env/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // 本番では無効化（情報露出を避ける）
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, reason: "not available" }, { status: 404 });
  }

  const keys = [
    "FLOW_CREATE_FORM_FOLDER_URL",
    "FLOW_PROCESS_FORM_SUBMISSION_URL",
    "FLOW_SAVE_FILES_URL",
    "FLOW_GET_NEXT_SEQ_URL",
    "FLOW_FORWARD_HANDSHAKE_MS",
  ];
  const env = Object.fromEntries(keys.map((k) => [k, process.env[k] ? "SET" : "MISSING"]));
  return NextResponse.json({ ok: true, env });
}
