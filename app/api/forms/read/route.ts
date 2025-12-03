// app/api/forms/read/route.ts
import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns";

// IPv6で詰まる環境対策：IPv4優先（Heroku/Undici/LogicApps系で刺さることがある）
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

const FLOW_URL =
  process.env.FLOW_READ_FORM_URL ||
  process.env.FLOW_FORMS_READ_URL ||
  process.env.FLOW_GET_FORM_READ_URL;

// 明示的に Node ランタイム & 非キャッシュ
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function fetchJsonWithRetry(
  url: string,
  init: RequestInit,
  opts: { attempts: number; timeoutMs: number; backoffMs: number },
) {
  let lastErr: any;

  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(new Error("fetch_timeout"));
    }, opts.timeoutMs);

    try {
      const res = await fetch(url, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
        redirect: "follow",
      } as any);

      const text = await res.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text };
      }

      // 429/5xx はリトライ対象にする（Flow/コネクタの一時不安定対策）
      if (!res.ok && (res.status === 429 || (res.status >= 500 && res.status <= 599))) {
        if (attempt < opts.attempts) {
          await sleep(opts.backoffMs * attempt);
          continue;
        }
      }

      return { res, json };
    } catch (e: any) {
      lastErr = e;

      // ネットワーク系はリトライ
      if (attempt < opts.attempts) {
        await sleep(opts.backoffMs * attempt);
        continue;
      }
      break;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr;
}

export async function POST(req: NextRequest) {
  if (!FLOW_URL) {
    console.error("[api/forms/read] no Flow URL (env missing)");
    return NextResponse.json(
      {
        ok: false,
        reason:
          "FLOW_READ_FORM_URL (または FLOW_FORMS_READ_URL / FLOW_GET_FORM_READ_URL) が未設定です。",
      },
      { status: 500 },
    );
  }

  // URLバリデーション（変なURLだと fetch failed になるので先に落とす）
  try {
    // eslint-disable-next-line no-new
    new URL(FLOW_URL);
  } catch {
    console.error("[api/forms/read] invalid Flow URL:", FLOW_URL);
    return NextResponse.json(
      { ok: false, reason: "Flow URL が不正です（URL形式ではありません）。" },
      { status: 500 },
    );
  }

  try {
    const body: any = await req.json().catch(() => ({}));

    // 受け取りゆれ吸収（fill 側の実装差分に強くする）
    const user = (body.varUser ?? body.user ?? "").toString().trim();
    const bldg = (body.varBldg ?? body.bldg ?? "").toString().trim();
    const seqRaw = body.varSeq ?? body.seq ?? body.Sseq ?? body.sseq ?? "";
    const seq = String(seqRaw || "").padStart(3, "0");

    const missing: string[] = [];
    if (!user) missing.push("user");
    if (!bldg) missing.push("bldg");
    if (!seq) missing.push("seq");

    if (missing.length > 0) {
      const reason = `missing required fields: ${missing.join(", ")}`;
      console.warn("[api/forms/read] bad request:", reason, { user, bldg, seq });
      return NextResponse.json({ ok: false, reason }, { status: 400 });
    }

    const forwardBody = {
      ...body,
      user,
      bldg,
      seq,
      varUser: user,
      varBldg: bldg,
      varSeq: seq,
    };

    console.log("[api/forms/read] calling Flow", {
      user,
      bldg,
      seq,
      url: safeUrl(FLOW_URL),
    });

    const { res: flowRes, json } = await fetchJsonWithRetry(
      FLOW_URL,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(forwardBody),
      },
      {
        attempts: 3, // ここは効きます（瞬断/混雑）
        timeoutMs: 10_000, // 1回10秒
        backoffMs: 600, // 0.6s, 1.2s, 1.8s
      },
    );

    // Flowが 200 を返す設計が多いので、ここは素直に透過
    // 「ok が無い」なら付与しておく（呼び出し側が ok 前提の場合の保険）
    if (flowRes.ok && (json?.ok === undefined || json?.ok === null)) {
      json.ok = true;
    }

    // upstream が非200の場合でも、理由は JSON に入れて返す（デバッグしやすく）
    if (!flowRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          reason: json?.reason || `upstream_http_${flowRes.status}`,
          upstreamStatus: flowRes.status,
          upstream: json,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(json, { status: 200 });
  } catch (err: any) {
    const cause = err?.cause;
    const code = cause?.code || err?.code;
    const message = err?.message || String(err);

    console.error("[api/forms/read] error", err);

    // 「fetch failed」だけ返すと詰むので、最低限 code と cause を返す
    return NextResponse.json(
      {
        ok: false,
        reason: message,
        code,
        cause: cause
          ? {
              code: cause.code,
              message: cause.message,
              name: cause.name,
            }
          : undefined,
      },
      { status: 500 },
    );
  }
}
