// app/api/forms/report-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import dns from "node:dns";
import type { IncomingHttpHeaders } from "node:http";
import { getReportResult, saveReportResult } from "../reportStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

const FLOW_URL = process.env.FLOW_GET_REPORT_SHARE_LINK_URL || "";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function safeUrl(raw: string) {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "<invalid-url>";
  }
}

function pickString(...cands: any[]): string | undefined {
  for (const c of cands) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return undefined;
}

/**
 * Flow(LogicApps/PowerAutomate) の戻りの揺れを吸収
 * - そのまま {ok:true,...} が返るケース
 * - { statusCode, headers, body } 形式で返るケース
 *   - body が object
 *   - body が JSON string
 */
function normalizeFlowPayload(json: any): {
  payload: any;
  embeddedStatusCode?: number;
} {
  if (!json || typeof json !== "object") {
    return { payload: json };
  }

  // wrapper: {statusCode, headers, body}
  const scRaw = (json as any).statusCode ?? (json as any).status ?? undefined;
  const embeddedStatusCode =
    typeof scRaw === "string"
      ? Number(scRaw)
      : typeof scRaw === "number"
        ? scRaw
        : undefined;

  // body が object
  if (json.body && typeof json.body === "object") {
    return { payload: json.body, embeddedStatusCode };
  }

  // body が string(JSON)
  if (typeof json.body === "string") {
    try {
      const parsed = JSON.parse(json.body);
      return { payload: parsed, embeddedStatusCode };
    } catch {
      return { payload: { raw: json.body }, embeddedStatusCode };
    }
  }

  // wrapper じゃない/または body が無い
  return { payload: json, embeddedStatusCode };
}

/**
 * undici(fetch) を避けて、https 直叩き（IPv4固定）で POST JSON
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
        family: 4, // IPv4固定
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
  try {
    const body: any = await req.json().catch(() => ({}));

    const user = (body.varUser ?? body.user ?? "").toString().trim();
    const bldg = (body.varBldg ?? body.bldg ?? "").toString().trim();
    const seqRaw = body.varSeq ?? body.seq ?? body.Sseq ?? body.sseq ?? "";
    const seq = String(seqRaw || "001").padStart(3, "0");

    if (!user || !bldg || !seq) {
      return NextResponse.json(
        { ok: false, reason: "user / bldg / seq が不足しています。" },
        { status: 400 },
      );
    }

    // 1) submit(背景) が保存した結果を参照（ここが主導）
    const stored = getReportResult(user, bldg, seq);

    if (!stored) {
      // まだ ProcessFormSubmission が完走してない
      return NextResponse.json({ ok: false, reason: "not_ready" }, { status: 200 });
    }

    const sheetKey = pickString(stored.sheetKey);
    const traceId = pickString(stored.traceId);

    // ProcessFormSubmission が reportUrl まで返しているなら、その時点で完了
    const storedUrl = pickString(stored.reportUrl);
    if (storedUrl) {
      return NextResponse.json(
        { ok: true, reportUrl: storedUrl, sheetKey, traceId },
        { status: 200 },
      );
    }

    // sheetKey が無いなら、リンク生成以前に止まっている（= まだ or 異常）
    if (!sheetKey) {
      return NextResponse.json(
        { ok: false, reason: "sheetkey_not_ready", traceId },
        { status: 200 },
      );
    }

    // 2) ここから先は Flow(GetReportShareLink) が必要
    if (!FLOW_URL) {
      console.error("[/api/forms/report-link] FLOW_GET_REPORT_SHARE_LINK_URL is empty");
      return NextResponse.json(
        { ok: false, reason: "FLOW_GET_REPORT_SHARE_LINK_URL が未設定です。" },
        { status: 500 },
      );
    }

    try {
      // eslint-disable-next-line no-new
      new URL(FLOW_URL);
    } catch {
      console.error("[/api/forms/report-link] invalid Flow URL:", FLOW_URL);
      return NextResponse.json(
        { ok: false, reason: "Flow URL が不正です（URL形式ではありません）。" },
        { status: 500 },
      );
    }

    // 3) sheetKey を varSheet として渡して共有リンク作成を依頼
    const forwardBody = {
      ...body, // 先に body を展開しておく（下で上書きする）
      user,
      bldg,
      seq,
      sheetKey,
      // Flow 側互換（varSheet が主）
      sheet: sheetKey,
      varUser: user,
      varBldg: bldg,
      varSeq: seq,
      varSheet: sheetKey,
    };

    console.log("[/api/forms/report-link] calling Flow(GetReportShareLink)", {
      user,
      bldg,
      seq,
      sheetKey,
      url: safeUrl(FLOW_URL),
    });

    const { status: httpStatus, json, rawText } = await postJsonWithRetry(
      FLOW_URL,
      forwardBody,
      { attempts: 2, timeoutMs: 12_000, backoffMs: 700 },
    );

    const { payload, embeddedStatusCode } = normalizeFlowPayload(json);
    const effectiveStatus =
      typeof embeddedStatusCode === "number" && !Number.isNaN(embeddedStatusCode)
        ? embeddedStatusCode
        : httpStatus;

    if (effectiveStatus < 200 || effectiveStatus >= 300 || payload?.ok === false) {
      // ここに file_not_found_or_not_ready が来る想定（= ポーリング継続）
      return NextResponse.json(
        {
          ok: false,
          reason: payload?.reason || `upstream_http_${effectiveStatus}`,
          sheetKey,
          traceId,
          reportFilePath: payload?.reportFilePath,
          upstreamStatus: effectiveStatus,
          upstream: payload,
          upstreamRaw:
            typeof payload?.raw === "string"
              ? payload.raw
              : typeof json?.raw === "string"
                ? json.raw
                : rawText,
        },
        { status: 200 },
      );
    }

    const reportUrl = pickString(
      payload?.reportUrl,
      payload?.report_url,
      payload?.fileUrl,
      payload?.file_url,
      payload?.WebUrl,
      payload?.webUrl,
      payload?.url,
    );

    if (!reportUrl) {
      return NextResponse.json(
        {
          ok: false,
          reason: "reportUrl_missing",
          sheetKey,
          traceId,
          reportFilePath: payload?.reportFilePath,
          upstream: payload,
        },
        { status: 200 },
      );
    }

    // 4) 取れたリンクを store に保存（次回から即返す）
    saveReportResult({
      user,
      bldg,
      seq,
      reportUrl,
      sheetKey,
      traceId,
    });

    return NextResponse.json(
      {
        ok: true,
        reportUrl,
        sheetKey,
        traceId,
        reportFilePath: payload?.reportFilePath,
      },
      { status: 200 },
    );
  } catch (err: any) {
    const code = err?.code || err?.cause?.code;
    console.error("[/api/forms/report-link] error", err);

    return NextResponse.json(
      {
        ok: false,
        reason: err?.message || String(err),
        code,
        cause: err?.cause
          ? {
              code: err.cause.code,
              message: err.cause.message,
              name: err.cause.name,
            }
          : undefined,
      },
      { status: 500 },
    );
  }
}
