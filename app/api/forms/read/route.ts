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
  process.env.FLOW_READ_FORM_URL ||
  process.env.FLOW_FORMS_READ_URL ||
  process.env.FLOW_GET_FORM_READ_URL ||
  process.env.FLOW_GET_FORM_SCHEMA_URL ||
  "";

const BUILDING_TOKEN_RE = /^([A-Za-z0-9]+)_(\d{3})_(.+)$/;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function safeUrl(raw: string) {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`;
  } catch {
    return "<invalid-url>";
  }
}

function safeStringArray(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
}

function applyExcludeToEnabled(schema: any) {
  const meta = schema?.meta || {};
  const exPages = new Set<string>(safeStringArray(meta.excludePages));
  const exFields = new Set<string>(safeStringArray(meta.excludeFields));

  if (Array.isArray(schema?.pages) && exPages.size > 0) {
    schema.pages = schema.pages.map((p: any) => {
      if (!p || typeof p !== "object") return p;
      const id = typeof p.id === "string" ? p.id : "";
      if (id && exPages.has(id)) return { ...p, enabled: false };
      return p;
    });
  }

  if (Array.isArray(schema?.fields) && exFields.size > 0) {
    schema.fields = schema.fields.map((f: any) => {
      if (!f || typeof f !== "object") return f;
      const id = typeof f.id === "string" ? f.id : "";
      if (id && exFields.has(id)) return { ...f, enabled: false };
      return f;
    });
  }

  // meta の正規化（念のため）
  schema.meta = {
    ...(meta || {}),
    excludePages: Array.from(exPages),
    excludeFields: Array.from(exFields),
  };

  return schema;
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
      {
        ok: false,
        reason:
          "FLOW_READ_FORM_URL (または FLOW_FORMS_READ_URL / FLOW_GET_FORM_READ_URL / FLOW_GET_FORM_SCHEMA_URL) が未設定です。",
      },
      { status: 500 },
    );
  }

  try {
    // eslint-disable-next-line no-new
    new URL(FLOW_URL);
  } catch {
    return NextResponse.json(
      { ok: false, reason: "Flow URL が不正です（URL形式ではありません）。" },
      { status: 500 },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as any;

    const user = (body.varUser || body.user || process.env.NEXT_PUBLIC_DEFAULT_USER || "FirstService")
      .toString()
      .trim();

    const bldgRaw = (body.varBldg || body.bldg || "").toString().trim();

    let seqRaw = (body.varSeq ?? body.seq ?? body.Sseq ?? body.sseq ?? "").toString();
    if (!/^\d+$/.test(seqRaw)) seqRaw = "001";
    let seq = seqRaw.padStart(3, "0");

    let buildingName = bldgRaw;
    const m = BUILDING_TOKEN_RE.exec(bldgRaw);
    if (m) {
      buildingName = m[3];
      if (!body.varSeq && !body.seq && !body.Sseq && !body.sseq) {
        seq = m[2].padStart(3, "0");
      }
    }

    if (!user || !buildingName || !seq) {
      return NextResponse.json({ ok: false, reason: "user / bldg / seq が不足しています。" }, { status: 400 });
    }

    console.log("[api/forms/read] calling Flow", {
      user,
      bldg: buildingName,
      seq,
      url: safeUrl(FLOW_URL),
    });

    const { status, json, rawText } = await postJsonWithRetry(
      FLOW_URL,
      {
        varUser: user,
        varBldg: buildingName,
        varSeq: seq,
        user,
        bldg: buildingName,
        seq,
        ...body,
      },
      { attempts: 3, timeoutMs: 12_000, backoffMs: 600 },
    );

    if (status < 200 || status >= 300) {
      return NextResponse.json(
        {
          ok: false,
          reason: json?.reason || `Flow HTTP ${status}`,
          upstreamStatus: status,
          upstream: json,
          upstreamRaw: typeof json?.raw === "string" ? json.raw : rawText,
        },
        { status: 502 },
      );
    }

    let schema: any;

    if (json?.ok && json.schema) schema = json.schema;
    else if (json?.ok && json.data?.schema) schema = json.data.schema;
    else if (json?.meta && Array.isArray(json.pages) && Array.isArray(json.fields)) schema = json;
    else if (json?.body?.meta && Array.isArray(json.body.pages) && Array.isArray(json.body.fields)) schema = json.body;
    else if (json?.body?.ok && json.body.schema) schema = json.body.schema;
    else {
      const reason = json?.reason || json?.error || "Flow 応答に schema が含まれていません。";
      return NextResponse.json({ ok: false, reason, upstream: json }, { status: 500 });
    }

    // ★ここが重要：exclude を enabled に落として「確実に反映」
    schema = applyExcludeToEnabled(schema);

    return NextResponse.json({ ok: true, schema }, { status: 200 });
  } catch (err: any) {
    const code = err?.code || err?.cause?.code;
    console.error("[api/forms/read] error", err);

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
