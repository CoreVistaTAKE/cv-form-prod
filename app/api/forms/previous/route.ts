// app/api/forms/previous/route.ts
import { NextRequest, NextResponse } from "next/server";

const FLOW_URL = process.env.FLOW_GET_PREVIOUS_REPORT_URL;

export async function POST(req: NextRequest) {
  if (!FLOW_URL) {
    return NextResponse.json(
      {
        ok: false,
        reason: "FLOW_GET_PREVIOUS_REPORT_URL がサーバー側で設定されていません。",
      },
      { status: 500 }
    );
  }

  try {
    const body: any = await req.json();

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
        {
          ok: false,
          reason: `missing required fields: ${missing.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const forwardBody = {
      varUser: user,
      varBldg: bldg,
      varSeq: seq,
      // 互換用
      user,
      bldg,
      seq,
    };

    const flowRes = await fetch(FLOW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forwardBody),
    });

    const text = await flowRes.text();
    let flowJson: any = {};
    try {
      flowJson = text ? JSON.parse(text) : {};
    } catch {
      flowJson = { raw: text };
    }

    if (!flowRes.ok || flowJson?.ok === false) {
      console.warn(
        "[/api/forms/previous] Flow returned error",
        flowRes.status,
        flowJson
      );
    }

    // { ok:true, item:{...} } を想定
    const item =
      flowJson?.item ??
      flowJson?.data?.item ??
      null;

    return NextResponse.json(
      {
        ok: true,
        item,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/forms/previous] error", err);
    return NextResponse.json(
      {
        ok: false,
        reason: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
