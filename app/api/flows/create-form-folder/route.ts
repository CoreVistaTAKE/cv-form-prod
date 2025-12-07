import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import dns from "node:dns";
import type { IncomingHttpHeaders } from "node:http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

type AnyRecord = Record<string, unknown>;

type CreateReq = {
  user?: unknown;
  bldg?: unknown;
  host?: unknown;

  varUser?: unknown;
  varBldg?: unknown;
  varHost?: unknown;

  excludePages?: unknown;
  excludeFields?: unknown;
  theme?: unknown;
  meta?: unknown;
};

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function safeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    const s = toStr(x).trim();
    if (s) out.push(s);
  }
  return out;
}

function isRecord(v: unknown): v is AnyRecord {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function safeUrl(raw: string) {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "<invalid-url>";
  }
}

function originFromReq(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "") || "https";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    new URL(req.url).host ||
    "localhost:3000";
  return `${proto}://${host}`;
}

/**
 * https直叩き（IPv4固定）で POST JSON
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
        family: 4,
      } as any,
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode || 0, headers: res.headers, text: data }));
      },
    );

    const kill = setTimeout(() => {
      const err: any = new Error("request_timeout");
      err.code = "ETIMEDOUT";
      req.destroy(err);
    }, timeoutMs);

    req.on("error", (e) => {
      clearTimeout(kill);
      reject(e);
    });
    req.on("close", () => clearTimeout(kill));

    req.write(body);
    req.end();
  });
}

// ===== server-side inflight lock =====
declare global {
  // eslint-disable-next-line no-var
  var __cvInflightCreateFolder: Map<string, number> | undefined;
}
const inflight = globalThis.__cvInflightCreateFolder ?? (globalThis.__cvInflightCreateFolder = new Map());

function inflightKey(user: string, bldg: string) {
  return `${user}::${bldg}`;
}

function unwrapFlowResponse(parsed: any) {
  // Flowの「内部表現（statusCode/headers/body）」でも、素のbodyでも両対応
  if (parsed && typeof parsed === "object" && parsed.body && typeof parsed.body === "object") {
    return parsed.body;
  }
  return parsed;
}

export async function POST(req: NextRequest) {
  const FLOW_URL = process.env.FLOW_CREATE_FORM_FOLDER_URL || process.env.PA_CREATE_FORM_FOLDER_URL || "";
  const TIMEOUT_MS = 28_000; // ★ 12s → 28s

  if (!FLOW_URL) {
    return NextResponse.json({ ok: false, reason: "FLOW_CREATE_FORM_FOLDER_URL がサーバー側で設定されていません。" }, { status: 500 });
  }
  try {
    // eslint-disable-next-line no-new
    new URL(FLOW_URL);
  } catch {
    return NextResponse.json({ ok: false, reason: "Flow URL が不正です（URL形式ではありません）。" }, { status: 500 });
  }

  let body: CreateReq = {};
  try {
    body = (await req.json()) as CreateReq;
  } catch {
    return NextResponse.json({ ok: false, reason: "request body must be JSON" }, { status: 400 });
  }

  const user = (toStr(body.user) || toStr(body.varUser)).trim();
  const bldg = (toStr(body.bldg) || toStr(body.varBldg)).trim();
  const varHost = (toStr(body.varHost) || toStr(body.host)).trim() || originFromReq(req);

  if (!user || !bldg) {
    return NextResponse.json(
      { ok: false, reason: "missing required fields: user, bldg", got: { user: !!user, bldg: !!bldg } },
      { status: 400 },
    );
  }

  const lockKey = inflightKey(user, bldg);
  if (inflight.has(lockKey)) {
    return NextResponse.json({ ok: false, reason: "inflight: same request is already running", code: "INFLIGHT" }, { status: 409 });
  }

  inflight.set(lockKey, Date.now());
  try {
    const metaUnknown = body.meta;
    const metaObj = isRecord(metaUnknown) ? metaUnknown : null;

    const excludePages = safeStringArray(body.excludePages ?? (metaObj ? metaObj["excludePages"] : undefined));
    const excludeFields = safeStringArray(body.excludeFields ?? (metaObj ? metaObj["excludeFields"] : undefined));
    const theme = toStr(body.theme ?? (metaObj ? metaObj["theme"] : undefined)).trim();

    const forwardBody = {
      varUser: user,
      varBldg: bldg,
      varHost,

      user,
      bldg,
      host: varHost,

      excludePages,
      excludeFields,
      theme,

      varExcludePages: excludePages,
      varExcludeFields: excludeFields,
      varTheme: theme,
    };

    console.log("[api/flows/create-form-folder] calling Flow", {
      user,
      bldg,
      hasExcludePages: excludePages.length > 0,
      hasExcludeFields: excludeFields.length > 0,
      theme: theme || "",
      url: safeUrl(FLOW_URL),
      timeoutMs: TIMEOUT_MS,
    });

    const { status, text } = await httpsPostJsonIPv4(FLOW_URL, forwardBody, TIMEOUT_MS);

    let parsed: any = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }

    const payload = unwrapFlowResponse(parsed);

    // ok:false は明確に失敗
    if (payload?.ok === false) {
      return NextResponse.json({ ok: false, reason: payload?.reason || payload?.error || "Flow returned ok:false", upstreamStatus: status, upstream: payload }, { status: 502 });
    }

    // upstream HTTPが2xx以外は失敗
    if (status < 200 || status >= 300) {
      return NextResponse.json(
        { ok: false, reason: payload?.reason || payload?.error || `Flow HTTP ${status}`, upstreamStatus: status, upstream: payload },
        { status: 502 },
      );
    }

    // ★ ここが重要：クライアントが j.finalUrl で取れる形にする
    return NextResponse.json(payload, { status: 200 });
  } catch (e: any) {
    const code = e?.code || e?.cause?.code;
    const msg = e?.message || String(e);

    if (code === "ETIMEDOUT") {
      return NextResponse.json({ ok: false, reason: "Flow 接続がタイムアウトしました（PowerPlatform到達不可/遅延）", code }, { status: 504 });
    }
    return NextResponse.json({ ok: false, reason: msg, code }, { status: 500 });
  } finally {
    inflight.delete(lockKey);
  }
}
