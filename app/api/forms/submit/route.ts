// app/api/forms/submit/route.ts
import { NextRequest, NextResponse } from "next/server";

// ProcessFormSubmission の URL を使う
const FLOW_URL = process.env.FLOW_PROCESS_FORM_SUBMISSION_URL;

type Answer = {
  key: string;
  value: string;
};

/**
 * answers の受け取り形式を吸収するユーティリティ
 * - [{key,value}, ...] 形式
 * - { label: value, ... } 形式
 */
function toAnswerArray(src: any): Answer[] {
  if (!src) return [];

  // すでに [{key,value}] 配列
  if (Array.isArray(src)) {
    return src
      .map((item) => ({
        key: item && item.key != null ? String(item.key) : "",
        value: item && item.value != null ? String(item.value) : "",
      }))
      .filter((x) => x.key);
  }

  // { label: value, ... } なオブジェクト
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
      "[/api/forms/submit] no Flow URL: FLOW_PROCESS_FORM_SUBMISSION_URL is empty."
    );
    return NextResponse.json(
      {
        ok: false,
        reason: "FLOW_PROCESS_FORM_SUBMISSION_URL がサーバー側で設定されていません。",
      },
      { status: 500 }
    );
  }

  try {
    const body: any = await req.json();

    // --- 1) 入力正規化 -------------------------------------------------
    const user = (body.varUser ?? body.user ?? "").toString().trim();
    const bldg = (body.varBldg ?? body.bldg ?? "").toString().trim();
    const seqRaw = body.varSeq ?? body.seq ?? "";
    const seq = String(seqRaw || "").padStart(3, "0");

    // answers: まず body.answers を優先、それが無ければ values / varValues から生成
    const answers: Answer[] =
      Array.isArray(body.answers) && body.answers.length > 0
        ? toAnswerArray(body.answers)
        : toAnswerArray(body.values ?? body.varValues);

    const missing: string[] = [];
    if (!user) missing.push("user");
    if (!bldg) missing.push("bldg");
    if (!seq) missing.push("seq");
    if (!answers.length) missing.push("answers");

    if (missing.length > 0) {
      const reason = `missing required fields: ${missing.join(", ")}`;
      console.warn("[/api/forms/submit] bad request:", reason, {
        user,
        bldg,
        seq,
        answersCount: answers.length,
      });
      return NextResponse.json({ ok: false, reason }, { status: 400 });
    }

    const forwardBody = {
      // 元の payload も残しておく（Flow 側で date / sheet などを拾える）
      ...body,
      // Flow トリガーが確実に拾えるよう、正規化済みフィールドを上書き
      user,
      bldg,
      seq,
      answers,
    };

    console.log("[/api/forms/submit] calling Flow (fire-and-forget)", {
      user,
      bldg,
      seq,
      answersCount: answers.length,
    });

    // --- 2) Flow を「投げっぱなし」で起動 --------------------------
    //    → ここを await しないので Heroku の 30 秒制限に引っかからない
    void (async () => {
      try {
        const flowRes = await fetch(FLOW_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(forwardBody),
        });

        const flowText = await flowRes.text();

        if (!flowRes.ok) {
          console.warn(
            "[/api/forms/submit] background Flow error",
            flowRes.status,
            flowText
          );
        } else {
          console.log(
            "[/api/forms/submit] background Flow completed",
            flowRes.status
          );
        }
      } catch (e) {
        console.error(
          "[/api/forms/submit] background Flow call failed",
          e
        );
      }
    })();

    // --- 3) フロントには即座に「受付完了」だけ返す ------------------
    // reportUrl はここでは返さない（後で /api/forms/report-link から取る）
    return NextResponse.json(
      {
        ok: true,
        accepted: true,
        user,
        bldg,
        seq,
      },
      { status: 202 } // 202 Accepted にしておくと「非同期処理中」が伝わりやすい
    );
  } catch (err: any) {
    console.error("[/api/forms/submit] error", err);
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
