import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const keys = [
    "FLOW_CREATE_FORM_FOLDER_URL",
    "FLOW_GET_BUILD_STATUS_URL",
    "FLOW_PROCESS_FORM_SUBMISSION_URL",
    "FLOW_SAVE_FILES_URL",
    "FLOW_GET_NEXT_SEQ_URL",
    "FLOW_REGISTRY_LOOKUP_BUILDINGS_URL",
    "FLOW_GET_PREVIOUS_REPORT_URL",
    "FLOW_GET_FORM_SCHEMA_URL",
    "FLOW_GET_REPORT_SHARE_LINK_URL",
    "FLOW_READ_FORM_URL",
    "FLOW_FORWARD_HANDSHAKE_MS",
    "FORM_BASE_ROOT",
    "NEXT_PUBLIC_DEFAULT_USER",
    "NEXT_PUBLIC_DEFAULT_HOST",
  ];

  const env = Object.fromEntries(
    keys.map((k) => [k, process.env[k] ? "SET" : "MISSING"]),
  );

  return NextResponse.json({ ok: true, env });
}
