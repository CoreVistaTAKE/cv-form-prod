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

const FLOW_URL =
  process.env.FLOW_REGISTRY_LOOKUP_BUILDINGS_URL ||
  process.env.FLOW_REGISTRY_LOOKUP_URL ||
  process.env.FLOW_LOOKUP_BUILDINGS_URL ||
  "";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function toStr(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

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
        family: 4,
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

    const kill = setTimeout(() => {
      const err: any = new Error("request_timeout");
      err.code = "ETIMEDOUT";
      req.destroy(err);
    }, timeoutMs);

    req.on("error", (e) => {
      clearTimeout(kill);
      reject(e);
    });

    req.on("close", () => {
      clearTimeout(kill);
    });

    req.write(body);
    req.end();
  });
}

async function postJsonWithRetry(
  url: string,
  payload: any,
  opts: { attempts: number; timeoutMs: number; backoffMs: number },
): Promise<{ status: number; json: any; rawText: string }> {
  let lastErr: any;
  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    try {
      const { status, text } = await httpsPostJsonIPv4(url, payload, opts.timeoutMs);

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

      return { status, json, rawText: text };
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
    return NextResponse.json(
      { ok: false, reason: "FLOW_REGISTRY_LOOKUP_BUILDINGS_URL が未設定です。" },
      { status: 500 },
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "request body must be JSON" }, { status: 400 });
  }

  const user = (toStr(body.varUser) || toStr(body.user) || process.env.NEXT_PUBLIC_DEFAULT_USER || "FirstService").trim();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "missing required field: user" }, { status: 400 });
  }

  try {
    const { status, json, rawText } = await postJsonWithRetry(
      FLOW_URL,
      { varUser: user, user, ...body },
      { attempts: 2, timeoutMs: 9_000, backoffMs: 400 },
    );

    if (status < 200 || status >= 300 || json?.ok === false) {
      return NextResponse.json(
        {
          ok: false,
          reason: json?.reason || json?.error || `Flow HTTP ${status}`,
          upstreamStatus: status,
          upstream: json,
          upstreamRaw: typeof json?.raw === "string" ? json.raw : rawText,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (e: any) {
    const code = e?.code || e?.cause?.code;
    if (code === "ETIMEDOUT") {
      return NextResponse.json(
        { ok: false, reason: "Flow 接続がタイムアウトしました。", code },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { ok: false, reason: e?.message || String(e), code },
      { status: 500 },
    );
  }
}
