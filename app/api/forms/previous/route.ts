import { NextRequest, NextResponse } from "next/server";
import { postJsonWithRetry, safeUrl, unwrapPowerAutomatePayload } from "@/app/api/_lib/flowHttp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLOW_URL = process.env.FLOW_GET_PREVIOUS_REPORT_URL || "";

export async function POST(req: NextRequest) {
  if (!FLOW_URL) {
    return NextResponse.json(
      { ok: false, reason: "FLOW_GET_PREVIOUS_REPORT_URL が未設定です。" },
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
    const body: any = await req.json().catch(() => ({}));

    const user = (body.varUser ?? body.user ?? "").toString().trim();
    const bldg = (body.varBldg ?? body.bldg ?? "").toString().trim();
    const seqRaw = body.varSeq ?? body.seq ?? "";
    const seq = String(seqRaw || "").padStart(3, "0");

    const missing: string[] = [];
    if (!user) missing.push("user");
    if (!bldg) missing.push("bldg");
    if (!seq) missing.push("seq");
    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, reason: `missing required fields: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const forwardBody = { ...body, varUser: user, varBldg: bldg, varSeq: seq, user, bldg, seq };

    console.log("[api/forms/previous] calling Flow", { user, bldg, seq, url: safeUrl(FLOW_URL) });

    const { status, json, rawText } = await postJsonWithRetry(
      FLOW_URL,
      forwardBody,
      { attempts: 2, timeoutMs: 12_000, backoffMs: 700 },
    );

    const payload = unwrapPowerAutomatePayload(json);

    if (status < 200 || status >= 300 || payload?.ok === false) {
      console.warn("[api/forms/previous] upstream error", { status, upstream: payload, upstreamRaw: rawText });
      // previous はベストエフォートなので 200 で返す運用でも良いが、いったん ok:true/item:null にする
    }

    const item = payload?.item ?? payload?.data?.item ?? null;

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (err: any) {
    console.error("[api/forms/previous] error", err);
    return NextResponse.json(
      { ok: false, reason: err?.message || String(err) },
      { status: 500 },
    );
  }
}
