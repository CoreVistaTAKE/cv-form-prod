import { NextRequest, NextResponse } from "next/server";
import { pickString, postJsonWithRetry, safeUrl, unwrapPowerAutomatePayload } from "@/app/api/_lib/flowHttp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLOW_URL = process.env.FLOW_GET_BUILD_STATUS_URL || "";

export async function POST(req: NextRequest) {
  if (!FLOW_URL) {
    return NextResponse.json(
      { ok: false, reason: "FLOW_GET_BUILD_STATUS_URL が未設定です。" },
      { status: 500 },
    );
  }

  try {
    // eslint-disable-next-line no-new
    new URL(FLOW_URL);
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Flow URL が不正です（URL形式ではありません）。" },
      { status: 500 },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const statusPath = (body.statusPath || "").toString().trim();

    if (!statusPath) {
      return NextResponse.json({ ok: false, reason: "statusPath が不足しています。" }, { status: 400 });
    }

    console.log("[api/registry/build-status] calling Flow", { statusPath, url: safeUrl(FLOW_URL) });

    const { status, json, rawText } = await postJsonWithRetry(
      FLOW_URL,
      { ...body, statusPath },
      { attempts: 2, timeoutMs: 12_000, backoffMs: 700 },
    );

    if (status < 200 || status >= 300) {
      return NextResponse.json(
        {
          ok: false,
          reason: `upstream_http_${status}`,
          upstreamStatus: status,
          upstream: json,
          upstreamRaw: rawText,
        },
        { status: 502 },
      );
    }

    const payload = unwrapPowerAutomatePayload(json);

    const pctRaw = payload?.pct;
    const pct = typeof pctRaw === "number" ? pctRaw : Number(pctRaw || 0) || 0;

    const step = pickString(payload?.step);
    const url = pickString(payload?.url);
    const qrPath = pickString(payload?.qrPath);

    return NextResponse.json(
      { ok: true, pct, step, url, qrPath },
      { status: 200 },
    );
  } catch (err: any) {
    const code = err?.code || err?.cause?.code;
    console.error("[api/registry/build-status] error", err);
    return NextResponse.json(
      { ok: false, reason: err?.message || String(err), code },
      { status: 500 },
    );
  }
}
