// app/api/forms/report-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import dns from "node:dns";
import type { IncomingHttpHeaders } from "node:http";
import { getReportResult, saveReportResult } from "../reportStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

const FLOW_URL = process.env.FLOW_GET_REPORT_SHARE_LINK_URL || "";
const FLOW_TIMEOUT_MS = Number(process.env.FLOW_GET_REPORT_SHARE_LINK_TIMEOUT_MS ?? 12_000);
const FLOW_ATTEMPTS = Number(process.env.FLOW_GET_REPORT_SHARE_LINK_ATTEMPTS ?? 2);
const FLOW_BACKOFF_MS = Number(process.env.FLOW_GET_REPORT_SHARE_LINK_BACKOFF_MS ?? 700);

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function jsonNoStore(payload: any, status = 200) {
  return NextResponse.json(payload, { status, headers: NO_STORE_HEADERS });
}

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

function normalizeSeq(seqRaw: any): string {
  const s = String(seqRaw ?? "").trim();
  return String(s || "001").padStart(3, "0");
}

/**
 * undici(fetch) を避けて、https 直叩き（IPv4固定）で POST JSON
 */
async function httpsPostJsonIPv4(
  urlStr: string,
  payload: any,
  timeoutMs: number,
): Promise<{ status: number; headers: IncomingHttpHeaders; text: string }> {
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
        res.on("end", () => resolve({ status: res.statusCode || 0, headers: res.headers, text: data }));
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

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function postJsonWithRetry(
  url: string,
  payload: any,
  opts: { attempts: number; timeoutMs: number; backoffMs: number },
) {
  let lastErr: any;

  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    try {
      const { status, headers, text } = await httpsPostJsonIPv4(url, payload, opts.timeoutMs);
      const json = safeJsonParse(text);

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

// ===== inflight lock（同一 user+bldg+seq の report-link 多重呼び出し抑止）=====
declare global {
  // eslint-disable-next-line no-var
  var __cvInflightReportLink: Map<string, number> | undefined;
}
const inflight = globalThis.__cvInflightReportLink ?? (globalThis.__cvInflightReportLink = new Map());
const INFLIGHT_TTL_MS = 30 * 1000;
function inflightKey(user: string, bldg: string, seq: string) {
  return `${user}::${bldg}::${seq}`;
}

export async function POST(req: NextRequest) {
  if (!FLOW_URL) {
    console.error("[/api/forms/report-link] FLOW_GET_REPORT_SHARE_LINK_URL is empty");
    return jsonNoStore({ ok: false, reason: "FLOW_GET_REPORT_SHARE_LINK_URL が未設定です。" }, 500);
  }

  try {
    // eslint-disable-next-line no-new
    new URL(FLOW_URL);
  } catch {
    console.error("[/api/forms/report-link] invalid Flow URL:", FLOW_URL);
    return jsonNoStore({ ok: false, reason: "Flow URL が不正です（URL形式ではありません）。" }, 500);
  }

  try {
    const body: any = await req.json().catch(() => ({}));

    const user = (body.varUser ?? body.user ?? "").toString().trim();
    const bldg = (body.varBldg ?? body.bldg ?? "").toString().trim();
    const seqRaw = body.varSeq ?? body.seq ?? body.Sseq ?? body.sseq ?? "";
    const seq = normalizeSeq(seqRaw);

    // ★リクエストからも sheetKey 候補を拾う（storeが欠けても進める）
    const reqSheetKey = pickString(body.sheetKey, body.sheet_key, body.varSheet, body.sheet);

    if (!user || !bldg || !seq) {
      return jsonNoStore({ ok: false, reason: "user / bldg / seq が不足しています。" }, 400);
    }

    // 1) submit(背景) が保存した結果を参照（キャッシュ）
    const stored = getReportResult(user, bldg, seq);

    // submit 側が error を保存しているならそれを返す（無限ポーリング防止）
    if (stored?.status === "error") {
      return jsonNoStore(
        {
          ok: false,
          reason: "submit_error",
          error: stored.error,
          sheetKey: stored.sheetKey ?? reqSheetKey,
          traceId: stored.traceId,
        },
        200,
      );
    }

    // reportUrl があるなら最優先で返す
    const storedUrl = pickString(stored?.reportUrl);
    if (storedUrl) {
      return jsonNoStore(
        { ok: true, reportUrl: storedUrl, sheetKey: stored?.sheetKey ?? reqSheetKey, traceId: stored?.traceId },
        200,
      );
    }

    // sheetKey は store 優先、無ければ request を採用
    const sheetKey = pickString(stored?.sheetKey, reqSheetKey);
    const traceId = pickString(stored?.traceId);

    // store に sheetKey が無いのに request にはある → 埋めておく（次回から sheetkey_not_ready を出さない）
    if (!pickString(stored?.sheetKey) && sheetKey) {
      saveReportResult({ user, bldg, seq, status: "running", sheetKey });
    }

    // sheetKey が無いと Flow を叩けない
    if (!sheetKey) {
      return jsonNoStore({ ok: false, reason: "sheetkey_not_ready", traceId }, 200);
    }

    // 多重呼び出し抑止（ポーリングが速いと Flow がスパムされる）
    const ikey = inflightKey(user, bldg, seq);
    const now = Date.now();
    const started = inflight.get(ikey);
    if (started && now - started < INFLIGHT_TTL_MS) {
      return jsonNoStore({ ok: false, reason: "inflight", sheetKey, traceId }, 200);
    }
    if (started) inflight.delete(ikey);
    inflight.set(ikey, now);

    try {
      // 2) GetReportShareLink を起動してリンク生成
      const forwardBody = {
        ...body,
        user,
        bldg,
        seq,
        sheetKey,
        // Flow 側で拾いやすいように互換フィールドも送る
        sheet: sheetKey,
        varUser: user,
        varBldg: bldg,
        varSeq: seq,
        varSheet: sheetKey,
        ...(traceId ? { traceId, varTraceId: traceId } : {}),
      };

      console.log("[/api/forms/report-link] calling Flow(GetReportShareLink)", {
        user,
        bldg,
        seq,
        sheetKey,
        url: safeUrl(FLOW_URL),
      });

      const { status, json, rawText } = await postJsonWithRetry(FLOW_URL, forwardBody, {
        attempts: Number.isFinite(FLOW_ATTEMPTS) && FLOW_ATTEMPTS > 0 ? FLOW_ATTEMPTS : 2,
        timeoutMs: Number.isFinite(FLOW_TIMEOUT_MS) && FLOW_TIMEOUT_MS > 0 ? FLOW_TIMEOUT_MS : 12_000,
        backoffMs: Number.isFinite(FLOW_BACKOFF_MS) && FLOW_BACKOFF_MS >= 0 ? FLOW_BACKOFF_MS : 700,
      });

      // PowerAutomate が {statusCode, body:{...}} 形式で返すケース吸収
      const payload = json?.body && typeof json.body === "object" ? json.body : json;

      if (status < 200 || status >= 300 || payload?.ok === false) {
        return jsonNoStore(
          {
            ok: false,
            reason: payload?.reason || `upstream_http_${status}`,
            sheetKey,
            traceId,
            reportFilePath: payload?.reportFilePath,
            upstreamStatus: status,
            upstreamRaw: typeof payload?.raw === "string" ? payload.raw : rawText,
          },
          200,
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

      const nextTraceId = pickString(
        payload?.traceId,
        payload?.trace_id,
        payload?.runId,
        payload?.run_id,
        traceId,
      );

      if (!reportUrl) {
        // 「まだ生成中/リンク未生成」もここに入る（= ポーリング継続対象）
        return jsonNoStore(
          {
            ok: false,
            reason: "reportUrl_missing",
            sheetKey,
            traceId: nextTraceId,
            reportFilePath: payload?.reportFilePath,
          },
          200,
        );
      }

      // 3) 取れたリンクを store に保存（次回から即返せる）
      saveReportResult({
        user,
        bldg,
        seq,
        status: "success",
        reportUrl,
        sheetKey,
        traceId: nextTraceId,
      });

      return jsonNoStore(
        { ok: true, reportUrl, sheetKey, traceId: nextTraceId, reportFilePath: payload?.reportFilePath },
        200,
      );
    } finally {
      inflight.delete(inflightKey(user, bldg, seq));
    }
  } catch (err: any) {
    const code = err?.code || err?.cause?.code;
    console.error("[/api/forms/report-link] error", err);

    return jsonNoStore(
      {
        ok: false,
        reason: err?.message || String(err),
        code,
        cause: err?.cause
          ? { code: err.cause.code, message: err.cause.message, name: err.cause.name }
          : undefined,
      },
      500,
    );
  }
}
