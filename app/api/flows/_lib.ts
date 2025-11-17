// /app/api/flows/_lib.ts
import { headers } from "next/headers";

export function currentOrigin(): string {
  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host  = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  return `${proto}://${host}`;
}

export async function postFlow(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", "Accept": "application/json" },
    body: JSON.stringify(body),
    // 応答が返るまで待つ制限。CreateFormFolder はACK即返す設計なので60秒で十分
    next: { revalidate: 0 },
  });
  const text = await res.text();
  // フローはJSONを返す前提。非JSONでも壊れないよう try
  let json: any; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`Flow HTTP ${res.status}: ${text}`);
  return json;
}