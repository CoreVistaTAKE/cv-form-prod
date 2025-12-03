// app/api/forms/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import dns from "node:dns";
import type { IncomingHttpHeaders } from "node:http";
import { saveReportResult } from "../reportStore";

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

// Heroku/Undici/LogicApps 系で IPv6 が刺さることがあるので念のため
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function safeUrl(raw: string) {
  try {
    const u = new URL(raw);
    // sig 等のクエリはログに出さない
    return `${u.origin}${u.pathname}`;
  } catch {
    return "<invalid-url>";
  }
}

/**
 * fetch(undici) を避けて、https 直叩き（IPv4固定）で POST JSON。
 * ※Flow(LogicApps) 側が IPv6 で詰まる環境向け
 */
async function httpsPostJsonIPv4(
  urlStr: string,
  payload: any,
  timeoutMs: number,
): Promise<{
  status: number;
  headers: IncomingHttpHeaders;
  text: string;
}> {
  const u = new URL(urlStr);
  const body = JSON.stringify(payload ?? {});
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body).toString(),
  };

  return await new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port ? Number(u.port) : 443,
        path: `${u.pathname}${u.search}`,
        method: "POST",
        headers,
        family: 4, // ★ IPv4固定
      } as any,
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            text: data,
          });
        });
      },
    );

    req.on("error", reject);

    req.setTimeout(timeoutMs, () => {
      const err: any = new Error("request_timeout");
      err.code = "ETIMEDOUT";
      req.destroy(err);
    });

    req.write(body);
    req.end();
  });
}

async function postJsonWithRetry(
  url: string,
  payload: any,
  opts: { attempts: number; timeoutMs: number; backoffMs: number },
) {
  let lastErr: any;

  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    try {
      const { status, headers, text } = await httpsPostJsonIPv4(
        url,
        payload,
        opts.timeoutMs,
      );

      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text };
      }

      // 429/5xx はリトライ
      if (status === 429 || (status >= 500 && status <= 599)) {
        if (attempt < opts.attempts) {
          await sleep(opts.backoffMs * attempt);
          continue;
        }
      }

      return { status, headers, json, rawText: text };
    } catch (e: any) {
      lastErr = e;
      if (attempt < opts.attempts) {
        await sleep(opts.backoffMs * attempt);
        continue;
      }
      break;
    }
  }

  throw lastErr;
}

export async function POST(req: NextRequest) {
  if (!FLOW_URL) {
    console.error(
      "[/api/forms/submit] no Flow URL: FLOW_PROCESS_FORM_SUBMISSION_URL is empty.",
    );
    return NextResponse.json(
      {
        ok: false,
        reason:
          "FLOW_PROCESS_FORM_SUBMISSION_URL がサーバー側で設定されていません。",
      },
      { status: 500 },
    );
  }

  // URLバリデーション
  try {
    // eslint-disable-next-line no-new
    new URL(FLOW_URL);
  } catch {
    console.error("[/api/forms/submit] invalid Flow URL:", FLOW_URL);
    return NextResponse.json(
      { ok: false, reason: "Flow URL が不正です（URL形式ではありません）。" },
      { status: 500 },
    );
  }

  try {
    const body: any = await req.json().catch(() => ({}));

    // --- 1) 入力正規化 -------------------------------------------------
    const user = (body.varUser ?? body.user ?? "").toString().trim();
    const bldg = (body.varBldg ?? body.bldg ?? "").toString().trim();
    const seqRaw = body.varSeq ?? body.seq ?? body.Sseq ?? body.sseq ?? "";
    const seq = String(seqRaw || "001").padStart(3, "0");

    const sheet = (body.varSheet ?? body.sheet ?? "").toString().trim();

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
        sheet,
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

      // Flow 互換
      varUser: user,
      varBldg: bldg,
      varSeq: seq,
      ...(sheet ? { varSheet: sheet, sheet } : {}),
    };

    console.log("[/api/forms/submit] accepted; start background Flow", {
      user,
      bldg,
      seq,
      sheet,
      answersCount: answers.length,
      url: safeUrl(FLOW_URL),
    });

    // --- 2) Flow を「投げっぱなし」で起動 --------------------------
    void (async () => {
      const startedAt = Date.now();
      try {
        // Flow 実行は最終 37 秒とのことなので、背景側の timeout は余裕を持たせる
        const { status, json, rawText } = await postJsonWithRetry(
          FLOW_URL,
          forwardBody,
          {
            attempts: 2,
            timeoutMs: 70_000, // ★ 背景実行なので長くしてOK
            backoffMs: 800,
          },
        );

        const elapsedMs = Date.now() - startedAt;

        if (status < 200 || status >= 300 || json?.ok === false) {
          console.warn("[/api/forms/submit] background Flow error", {
            status,
            elapsedMs,
            user,
            bldg,
            seq,
            sheet,
            upstream: json,
            upstreamRaw: typeof json?.raw === "string" ? json.raw : rawText,
          });
          return;
        }

        // Flow からの結果をメモリストアに保存
        const reportUrl: string | undefined =
          json.reportUrl ||
          json.report_url ||
          json.fileUrl ||
          json.file_url ||
          json.url ||
          json?.body?.reportUrl ||
          json?.body?.report_url ||
          json?.body?.fileUrl ||
          json?.body?.file_url ||
          json?.body?.url;

        const sheetKey: string | undefined =
          json.sheetKey ||
          json.sheet_key ||
          json.sheet ||
          json.varSheet ||
          json?.body?.sheetKey ||
          json?.body?.sheet_key ||
          json?.body?.sheet ||
          json?.body?.varSheet;

        const traceId: string | undefined =
          json.traceId ||
          json.trace_id ||
          json.runId ||
          json.run_id ||
          json?.body?.traceId ||
          json?.body?.trace_id ||
          json?.body?.runId ||
          json?.body?.run_id;

        saveReportResult({
          user,
          bldg,
          seq,
          reportUrl,
          sheetKey,
          traceId,
        });

        console.log("[/api/forms/submit] background Flow completed", {
          status,
          elapsedMs,
          user,
          bldg,
          seq,
          sheet,
          hasUrl: !!reportUrl,
          sheetKey,
          traceId,
        });
      } catch (e: any) {
        const elapsedMs = Date.now() - startedAt;
        console.error("[/api/forms/submit] background Flow call failed", {
          elapsedMs,
          user,
          bldg,
          seq,
          sheet,
          error: e?.message || String(e),
          code: e?.code || e?.cause?.code,
          cause: e?.cause
            ? { code: e.cause.code, message: e.cause.message, name: e.cause.name }
            : undefined,
        });
      }
    })();

    // --- 3) フロントには即座に「受付完了」だけ返す ------------------
    return NextResponse.json(
      {
        ok: true,
        accepted: true,
        user,
        bldg,
        seq,
      },
      { status: 202 },
    );
  } catch (err: any) {
    console.error("[/api/forms/submit] error", err);
    const message = err?.message || String(err);
    return NextResponse.json(
      {
        ok: false,
        reason: message,
      },
      { status: 500 },
    );
  }
}
