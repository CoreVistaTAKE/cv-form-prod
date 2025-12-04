import { NextRequest, NextResponse } from "next/server";
import { pickString, postJsonWithRetry, safeUrl, unwrapPowerAutomatePayload } from "@/app/api/_lib/flowHttp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLOW_URL = process.env.FLOW_CREATE_FORM_FOLDER_URL || "";

export async function POST(req: NextRequest) {
  if (!FLOW_URL) {
    return NextResponse.json(
      { ok: false, reason: "FLOW_CREATE_FORM_FOLDER_URL が未設定です。" },
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

    const user =
      (body.varUser ?? body.user ?? "").toString().trim() ||
      process.env.NEXT_PUBLIC_DEFAULT_USER ||
      "FirstService";

    const bldg = (body.varBldg ?? body.bldg ?? "").toString().trim();
    const host =
      (body.varHost ?? body.host ?? "").toString().trim() ||
      process.env.NEXT_PUBLIC_DEFAULT_HOST ||
      "";

    if (!bldg) {
      return NextResponse.json({ ok: false, reason: "varBldg/bldg が不足しています。" }, { status: 400 });
    }

    const forwardBody = {
      ...body,
      varUser: user,
      varBldg: bldg,
      varHost: host,
      user,
      bldg,
      host,
    };

    console.log("[api/registry/create-folder] calling Flow", { user, bldg, url: safeUrl(FLOW_URL) });

    const { status, json, rawText } = await postJsonWithRetry(
      FLOW_URL,
      forwardBody,
      { attempts: 2, timeoutMs: 20_000, backoffMs: 800 },
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

    const traceId = pickString(payload?.traceId, payload?.trace_id, payload?.runId, payload?.run_id);
    const token = pickString(payload?.bldgFolderName, payload?.token);
    const statusPath = pickString(payload?.statusPath);
    const seq = pickString(payload?.seq);

    if (!token || !statusPath) {
      return NextResponse.json(
        { ok: false, reason: "Flow 応答に token(bldgFolderName) または statusPath がありません。", upstream: payload },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        user,
        bldg,
        host,
        token,
        bldgFolderName: token,
        statusPath,
        seq,
        traceId,
      },
      { status: 200 },
    );
  } catch (err: any) {
    const code = err?.code || err?.cause?.code;
    console.error("[api/registry/create-folder] error", err);
    return NextResponse.json(
      { ok: false, reason: err?.message || String(err), code },
      { status: 500 },
    );
  }
}
