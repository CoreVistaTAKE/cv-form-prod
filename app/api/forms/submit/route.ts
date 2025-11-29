// app/api/forms/submit/route.ts
import { NextRequest, NextResponse } from "next/server";

// Flow 呼び出し先
// 1) まず AppendAnswerAndRunProcessFormSubmission の URL を優先
// 2) 未設定なら従来どおり ProcessFormSubmission の URL を使う
const FLOW_URL =
  process.env.FLOW_APPEND_ANSWER_AND_RUN_PROCESS_FORM_SUBMISSION_URL ??
  process.env.FLOW_PROCESS_FORM_SUBMISSION_URL;

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
        key:
          item && item.key != null
            ? String(item.key)
            : "",
        value:
          item && item.value != null
            ? String(item.value)
            : "",
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

export async function POST(req: NextRequest) {
  if (!FLOW_URL) {
    console.error(
      "[/api/forms/submit] no Flow URL: FLOW_APPEND_ANSWER_AND_RUN_PROCESS_FORM_SUBMISSION_URL / FLOW_PROCESS_FORM_SUBMISSION_URL are both empty."
    );
    return NextResponse.json(
      {
        ok: false,
        reason:
          "FLOW_APPEND_ANSWER_AND_RUN_PROCESS_FORM_SUBMISSION_URL または FLOW_PROCESS_FORM_SUBMISSION_URL がサーバー側で設定されていません。",
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

    console.log("[/api/forms/submit] forwarding to Flow", {
      user,
      bldg,
      seq,
      answersCount: answers.length,
      target:
        process.env.FLOW_APPEND_ANSWER_AND_RUN_PROCESS_FORM_SUBMISSION_URL
          ? "AppendAnswerAndRunProcessFormSubmission"
          : "ProcessFormSubmission",
    });

    // --- 2) Flow への転送（投げっぱなし ACK） ---------------------------
    // Flow の完了は待たず、HTTP 呼び出しだけ fire-and-forget する
    void fetch(FLOW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(forwardBody),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error(
            "[/api/forms/submit] Flow HTTP error",
            res.status,
            res.statusText,
            text
          );
        }
      })
      .catch((err) => {
        console.error("[/api/forms/submit] Flow fetch failed", err);
      });

    // フロントにはすぐ ACK を返す
    return NextResponse.json(
      {
        ok: true,
        accepted: true,
        user,
        bldg,
        seq,
      },
      { status: 200 }
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
