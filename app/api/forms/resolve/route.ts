import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReqBody = {
  user?: string; username?: string; varUser?: string;
  bldg?: string; varBldg?: string;
  host?: string; varHost?: string;
};

function toStr(x: any){ return (x === null || x === undefined) ? "" : String(x).trim(); }
function coalesce<T>(...vals: (T | undefined | null)[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return undefined;
}

export async function GET() {
  return NextResponse.json({ ok: true, name: "forms-resolve" });
}

export async function POST(req: Request) {
  let body: ReqBody = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const user = toStr(coalesce(body.varUser, body.user, body.username));
  const bldg = toStr(coalesce(body.varBldg, body.bldg));
  const hostRaw = toStr(coalesce(body.varHost, body.host));
  const host = hostRaw.replace(/\/+$/, ""); // 末尾スラッシュ除去

  if (!user || !bldg || !host) {
    return NextResponse.json(
      { ok: false, error: "Bad Request", detail: "user/bldg/host required" },
      { status: 400 }
    );
  }

  const basePath = (process.env.FORM_BASE_PATH ?? "/form").replace(/\/+$/, "");
  const path = `${basePath}/${encodeURIComponent(user)}/${encodeURIComponent(bldg)}/index.html`;
  const url = `${host}${path.startsWith("/") ? "" : "/"}${path}`;

  const timeoutMs = Number(process.env.RESOLVE_HEAD_TIMEOUT_MS ?? "2000");
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);

  let exists = false;
  let reason = "";
  try {
    let res = await fetch(url, { method: "HEAD", cache: "no-store", signal: ac.signal as any });
    if (res.status === 405 || res.status === 403) {
      // 一部のホストは HEAD 禁止。GET で存在探り。
      res = await fetch(url, { method: "GET", cache: "no-store", signal: ac.signal as any });
    }
    clearTimeout(t);
    exists = res.ok;
    reason = `probe ${res.status}`;
  } catch (err: any) {
    clearTimeout(t);
    reason = (err?.name === "AbortError") ? `timeout ${timeoutMs}ms` : (err?.message || "fetch error");
  }

  return NextResponse.json({ ok: true, exists, url: exists ? url : undefined, reason });
}
