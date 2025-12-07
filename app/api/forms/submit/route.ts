// app/api/forms/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import dns from "node:dns";
import type { IncomingHttpHeaders } from "node:http";
import { saveReportResult } from "../reportStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

const FLOW_URL = process.env.FLOW_PROCESS_FORM_SUBMISSION_URL || "";

type Answer = {
  key: string;
  value: string;
};

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

function safeUrl(raw: string) {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "<invalid-url>";
  }
}

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

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
        family: 4,
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

// ===== inflight lock（同一 user+bldg+seq の並列送信を止める）=====
declare global {
  // eslint-disable-next-line no-var
  var __cvInflightSubmit: Map<string, number> | undefined;
}
const inflight = globalThis.__cvInflightSubmit ?? (globalThis.__cvInflightSubmit = new Map());
const INFLIGHT_TTL_MS = 15 * 60 * 1000;

function inflightKey(user: string, bldg: string, seq: string) {
  return `${user}::${seq}::${bldg}`;
}

export async function POST(req: NextRequest) {
  if (!FLOW_URL) {
    return NextResponse.json(
      { ok: false, reason: "FLOW_PROCESS_FORM_SUBMISSION_URL がサーバー側で設定されていません。" },
      { status: 500 },
    );
  }

  try {
    // eslint-disable-next-line no-new
    new URL(FLOW_URL);
  } catch {
    return NextResponse.json({ ok: false, reason: "Flow URL が不正です（URL形式ではありません）。" }, { status: 500 });
  }

  const body: any = await req.json().catch(() => ({}));

  const user = (body.varUser ?? body.user ?? "").toString().trim();
  const bldg = (body.varBldg ?? body.bldg ?? "").toString().trim();
  const seqRaw = body.varSeq ?? body.seq ?? body.Sseq ?? body.sseq ?? "";
  const seq = String(seqRaw || "001").padStart(3, "0");

  const sheet = (body.varSheet ?? body.sheet ?? "").toString().trim();

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
    return NextResponse.json({ ok: false, reason: `missing required fields: ${missing.join(", ")}` }, { status: 400 });
  }

  // inflight check
  const key = inflightKey(user, bldg, seq);
  const now = Date.now();
  const started = inflight.get(key);

  if (started && now - started < INFLIGHT_TTL_MS) {
    return NextResponse.json(
      { ok: true, accepted: true, alreadyRunning: true, code: "INFLIGHT", user, bldg, seq },
      { status: 202 },
    );
  }
  if (started) inflight.delete(key);
  inflight.set(key, now);

  const forwardBody = {
    ...body,
    user,
    bldg,
    seq,
    answers,
    varUser: user,
    varBldg: bldg,
    varSeq: seq,
    ...(sheet ? { varSheet: sheet, sheet } : {}),
  };

  console.log("[/api/forms/submit] accepted; call Flow in background", {
    user,
    bldg,
    seq,
    sheet,
    answersCount: answers.length,
    url: safeUrl(FLOW_URL),
  });

  // 投げっぱなし（ただし retry はしない / 完了時に lock解除）
  void (async () => {
    const startedAt = Date.now();
    try {
      const { status, text } = await httpsPostJsonIPv4(FLOW_URL, forwardBody, 80_000);
      const json = safeJsonParse(text);

      const elapsedMs = Date.now() - startedAt;

      if (status < 200 || status >= 300 || json?.ok === false) {
        console.warn("[/api/forms/submit] Flow error", {
          status,
          elapsedMs,
          user,
          bldg,
          seq,
          sheet,
          upstream: json,
        });
        return;
      }

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

      saveReportResult({ user, bldg, seq, reportUrl, sheetKey, traceId });

      console.log("[/api/forms/submit] Flow completed", {
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
      console.error("[/api/forms/submit] Flow call failed", {
        user,
        bldg,
        seq,
        sheet,
        error: e?.message || String(e),
        code: e?.code || e?.cause?.code,
      });
    } finally {
      inflight.delete(key);
    }
  })();

  return NextResponse.json({ ok: true, accepted: true, user, bldg, seq }, { status: 202 });
}
