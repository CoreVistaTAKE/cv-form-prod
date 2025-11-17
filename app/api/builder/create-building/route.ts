import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReqBody = {
  username?: string;
  user?: string;
  varUser?: string;
  bldg?: string;
  varBldg?: string;
  host?: string;
  varHost?: string;
};

function toStr(x: any): string {
  if (x === null || x === undefined) return "";
  return String(x).trim();
}
function coalesce<T>(...vals: (T | undefined | null)[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return undefined;
}
function makeTraceId(): string {
  const a = Math.random().toString(36).slice(2, 8);
  const b = Date.now().toString(36);
  return `${a}-${b}`;
}

export async function GET() {
  return NextResponse.json({ ok: true, name: "create-building" });
}

export async function POST(req: Request) {
  const flowUrl = process.env.FLOW_CREATE_FORM_FOLDER_URL;
  const handshakeMsRaw = process.env.FLOW_FORWARD_HANDSHAKE_MS ?? "1500";
  const handshakeMs = Number.isFinite(Number(handshakeMsRaw)) ? Math.max(0, Number(handshakeMsRaw)) : 1500;

  if (!flowUrl) {
    return NextResponse.json(
      { ok: false, error: "Internal", detail: "missing env: FLOW_CREATE_FORM_FOLDER_URL" },
      { status: 500 }
    );
  }

  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Bad Request", detail: "invalid json" },
      { status: 400 }
    );
  }

  const user = toStr(coalesce(body.user, body.username, body.varUser));
  const bldg = toStr(coalesce(body.bldg, body.varBldg));
  const host = toStr(coalesce(body.host, body.varHost));

  const missing: string[] = [];
  if (!user) missing.push("user");
  if (!bldg) missing.push("bldg");
  if (!host) missing.push("host");

  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: "Bad Request", detail: `username/bldg/host required (missing: ${missing.join(", ")})` },
      { status: 400 }
    );
  }

  const traceId = makeTraceId();

  const out = { varUser: user, varBldg: bldg, varHost: host, traceId };

  let forwarded = false;
  let reason = "";

  const ac = new AbortController();
  const to = setTimeout(() => ac.abort(), handshakeMs);

  try {
    const res = await fetch(flowUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(out),
      cache: "no-store",
      signal: ac.signal,
    });
    clearTimeout(to);
    forwarded = res.ok;
    reason = `flow ${res.status}`;
  } catch (err: any) {
    clearTimeout(to);
    reason = (err?.name === "AbortError") ? `detached after ${handshakeMs}ms` : (err?.message || "fetch error");
  }

  return NextResponse.json({
    ok: true, accepted: true, forwarded, reason,
    input: { user, bldg, host, traceId },
  });
}
