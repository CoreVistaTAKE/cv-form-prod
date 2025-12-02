// app/api/forms/report-link/route.ts
import { NextRequest, NextResponse } from "next/server";

const FLOW_URL = process.env.FLOW_GET_REPORT_SHARE_LINK_URL;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!FLOW_URL) {
    console.error("[/api/forms/report-link] no Flow URL");
    return NextResponse.json(
      { ok: false, reason: "FLOW_GET_REPORT_SHARE_LINK_URL が未設定です。" },
      { status: 500 },
    );
  }

  try {
    const body: any = await req.json();

    const user = (body.varUser ?? body.user ?? "").toString().trim();
    const bldg = (body.varBldg ?? body.bldg ?? "").toString().trim();
    const seqRaw = body.varSeq ?? body.seq ?? "";
    const seq = String(seqRaw || "").padStart(3, "0");

    // シート名（ReportSheet）
    const sheet = (body.varSheet ?? body.sheet ?? "").toString().trim();

    if (!user || !bldg || !seq) {
      console.warn("[/api/forms/report-link] missing base params", {
        user,
        bldg,
        seq,
        sheet,
      });
      return NextResponse.json(
        { ok: false, reason: "user / bldg / seq が不足しています。" },
        { status: 400 },
      );
    }

    if (!sheet) {
      console.warn("[/api/forms/report-link] sheet is empty", {
        user,
        bldg,
        seq,
      });
      return NextResponse.json(
        { ok: false, reason: "sheet（ReportSheet）が指定されていません。" },
        { status: 400 },
      );
    }

    const forward = {
      user,
      bldg,
      seq,
      sheet,
      varUser: user,
      varBldg: bldg,
      varSeq: seq,
      varSheet: sheet,
    };

    console.log("[/api/forms/report-link] calling Flow", forward);

    const flowRes = await fetch(FLOW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forward),
    });

    const text = await flowRes.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }

    if (!flowRes.ok || json?.ok === false) {
      console.warn(
        "[/api/forms/report-link] Flow error or not ready",
        flowRes.status,
        json,
      );
      return NextResponse.json(
        {
          ok: false,
          reason: json?.reason || "file_not_found_or_not_ready",
          reportFilePath: json?.reportFilePath,
        },
        { status: 200 },
      );
    }

    const reportUrl: string | undefined =
      json.reportUrl ||
      json.report_url ||
      json.fileUrl ||
      json.file_url ||
      json.WebUrl ||
      json.url;

    if (!reportUrl) {
      console.warn(
        "[/api/forms/report-link] no reportUrl in Flow response",
        json,
      );
      return NextResponse.json(
        {
          ok: false,
          reason: "reportUrl が取得できませんでした。",
          reportFilePath: json?.reportFilePath,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        reportUrl,
        reportFilePath: json?.reportFilePath,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[/api/forms/report-link] error", err);
    return NextResponse.json(
      { ok: false, reason: err?.message || String(err) },
      { status: 500 },
    );
  }
}
