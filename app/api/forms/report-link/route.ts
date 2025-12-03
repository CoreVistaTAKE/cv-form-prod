// app/api/forms/report-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getReportResult } from "../reportStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();

    const user = (body.varUser ?? body.user ?? "").toString().trim();
    const bldg = (body.varBldg ?? body.bldg ?? "").toString().trim();
    const seqRaw = body.varSeq ?? body.seq ?? "";
    const seq = String(seqRaw || "").padStart(3, "0");

    if (!user || !bldg || !seq) {
      console.warn("[/api/forms/report-link] missing base params", {
        user,
        bldg,
        seq,
      });
      return NextResponse.json(
        { ok: false, reason: "user / bldg / seq が不足しています。" },
        { status: 400 },
      );
    }

    const entry = getReportResult(user, bldg, seq);

    if (!entry) {
      // Flow がまだ完了していない or エラーで結果が保存されていない
      return NextResponse.json(
        { ok: false, reason: "not_ready" },
        { status: 200 },
      );
    }

    if (!entry.reportUrl) {
      return NextResponse.json(
        {
          ok: false,
          reason: "reportUrl が保存されていません。",
          sheetKey: entry.sheetKey,
          traceId: entry.traceId,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        reportUrl: entry.reportUrl,
        sheetKey: entry.sheetKey,
        traceId: entry.traceId,
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
