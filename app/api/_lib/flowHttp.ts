import https from "node:https";
import dns from "node:dns";
import type { IncomingHttpHeaders } from "node:http";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

export function safeUrl(raw: string) {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`; // sig等は落とす
  } catch {
    return "<invalid-url>";
  }
}

export function parseJsonLoose(text: string): any {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

/** Power Automate が { statusCode, body:{...} } 形式で返すケース吸収 */
export function unwrapPowerAutomatePayload(json: any): any {
  if (json && typeof json === "object" && json.body && typeof json.body === "object") {
    return json.body;
  }
  return json;
}

export async function httpsPostJsonIPv4(
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
        family: 4, // ★IPv4固定
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function postJsonWithRetry(
  url: string,
  payload: any,
  opts: { attempts: number; timeoutMs: number; backoffMs: number },
): Promise<{ status: number; json: any; rawText: string }> {
  let lastErr: any;

  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    try {
      const { status, text } = await httpsPostJsonIPv4(url, payload, opts.timeoutMs);
      const json = parseJsonLoose(text);

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

export function pickString(...cands: any[]): string | undefined {
  for (const c of cands) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return undefined;
}
