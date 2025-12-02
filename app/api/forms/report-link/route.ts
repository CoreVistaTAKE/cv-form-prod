// app/api/forms/report-link/route.ts
import { NextRequest, NextResponse } from "next/server";

// GetReportShareLink フローの URL
const FLOW_URL = process.env.FLOW_GET_REPORT_SHARE_LINK_URL;

type Answer = {
  key: string;
  value: string;
};

/**
 * answers の受け取り形式を吸収するユーティリティ
 * 必要なら将来拡張できるように ProcessFormSubmission と同じ形にしておく
 */
function toAnswerArray(src: any): Answer[] {
  if (!src) return [];

  if (Array.isArray(src)) {
    return src
      .map((item) => ({
        key: item && item.key != null ? String(item.key) : "",
        value: item && item.value != null ? String(item.value) : "",
      }))
      .filter((x) => x.key);
  }

  if (typeof src === "object") {
    return Object.entries(src).map(([k, v]) => ({
      key: String(k),
      value: v == null ? "" : String(v),
    }));
  }

  return [];
}

// 明示的に Node ランタイム & 非キャッシュ
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!FLOW_URL) {
    console.error(
      "[/api/forms/report-link] no Flow URL: FLOW_GET_REPORT_SHARE_LINK_URL is empty."
    );
    return NextResponse.json(
      {
        ok: false,
        reason:
          "FLOW_GET_REPORT_SHARE_LINK_URL がサーバー側で設定されていません。",
      },
      { status: 500 }
    );
  }

  try {
    const body: any = await req.json();

    // --- 1) 入力正規化 -------------------------------------------------
    // submit と同じ優先順位でフィールドを拾う
    const user = (body.varUser ?? body.user ?? "").toString().trim();
    const bldg = (body.varBldg ?? body.bldg ?? "").toString().trim();
    const seqRaw = body.varSeq ?? body.seq ?? "";
    const seq = String(seqRaw || "").padStart(3, "0");

    // date / sheet などは Flow 側の仕様に合わせて必要なら拾う
    const date = (body.varDate ?? body.date ?? "").toString().trim();
    const sheet = (body.varSheet ?? body.sheet ?? "").toString().trim();

    // answers: 将来 Flow で使いたくなったときのために一応正規化だけしておく
    const answers: Answer[] =
      Array.isArray(body.answers) && body.answers.length > 0
        ? toAnswerArray(body.answers)
        : toAnswerArray(body.values ?? body.varValues);

    const missing: string[] = [];
    if (!user) missing.push("user");
    if (!bldg) missing.push("bldg");
    if (!seq) missing.push("seq");
    // GetReportShareLink は answers 不要ならチェックしない

    if (missing.length > 0) {
      const reason = `missing required fields: ${missing.join(", ")}`;
      console.warn("[/api/forms/report-link] bad request:", reason, {
        user,
        bldg,
        seq,
      });
      return NextResponse.json({ ok: false, reason }, { status: 400 });
    }

    const forwardBody = {
      // 元の payload をまるっと渡しておく
      ...body,
      // 正規化済みフィールドで上書き
      user,
      bldg,
      seq,
      date: date || body.date,
      sheet: sheet || body.sheet,
      answers,
    };

    console.log("[/api/forms/report-link] calling Flow GetReportShareLink", {
      user,
      bldg,
      seq,
    });

    // --- 2) Flow を呼び出し -------------------------------------------
    const flowRes = await fetch(FLOW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forwardBody),
    });

    const flowText = await flowRes.text();
    let flowJson: any = {};
    try {
      flowJson = flowText ? JSON.parse(flowText) : {};
    } catch (e) {
      console.warn(
        "[/api/forms/report-link] Flow response JSON parse failed",
        e,
        flowText
      );
    }

    if (!flowRes.ok || flowJson?.ok === false) {
      console.warn(
        "[/api/forms/report-link] Flow returned error",
        flowRes.status,
        flowJson
      );
    }

    // --- 3) Flow のレスポンスから reportUrl / traceId を拾う ----------
    const reportUrl: string | undefined =
      (typeof flowJson.reportUrl === "string" && flowJson.reportUrl) ||
      (typeof flowJson.report_url === "string" && flowJson.report_url) ||
      (typeof flowJson.fileUrl === "string" && flowJson.fileUrl) ||
      (typeof flowJson.file_url === "string" && flowJson.file_url) ||
      (typeof flowJson?.body?.reportUrl === "string" &&
        flowJson.body.reportUrl) ||
      (typeof flowJson?.data?.reportUrl === "string" &&
        flowJson.data.reportUrl) ||
      undefined;

    const traceId: string | undefined =
      (typeof flowJson.traceId === "string" && flowJson.traceId) ||
      (typeof flowJson?.body?.traceId === "string" && flowJson.body.traceId) ||
      undefined;

    // --- 4) リンクがまだ無い場合の扱い --------------------------------
    if (!reportUrl) {
      // ファイル未作成 or シェアリンク未生成など
      const reason =
        flowJson?.reason ||
        flowJson?.error ||
        "reportUrl がまだ取得できません。（レポート生成中の可能性があります）";

      // 404 or 202 のどちらか好みだが、今回は「まだ無い」という意味で 404 に寄せる
      return NextResponse.json(
        {
          ok: false,
          user,
          bldg,
          seq,
          traceId,
          reason,
        },
        { status: 404 }
      );
    }

    // --- 5) 正常レスポンス --------------------------------------------
    return NextResponse.json(
      {
        ok: true,
        user,
        bldg,
        seq,
        reportUrl,
        traceId,
        // デバッグ用に欲しければ raw を付けても良い（本番は不要なら削る）
        // raw: flowJson,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[/api/forms/report-link] error", err);
    const message = err?.message || String(err);
    return NextResponse.json(
      {
        ok: false,
        reason: message,
      },
      { status: 500 }
    );
  }
}
