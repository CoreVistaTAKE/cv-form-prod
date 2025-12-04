// app/user-builder/_components/BuildStatus.client.tsx
"use client";

import React, { useEffect, useState } from "react";

type StatusRes = {
  ok?: boolean;
  pct?: number;
  step?: string;
  url?: string;
  qrPath?: string;
  reason?: string;
};

type Props = {
  user?: string;
  bldg?: string;
  statusPath?: string;
  justTriggered?: boolean;
};

const DEFAULT_MAX_ATTEMPTS = 120; // 1500ms間隔で約3分

export default function BuildStatus({ user, bldg, statusPath, justTriggered }: Props) {
  const [pct, setPct] = useState<number>(0);
  const [url, setUrl] = useState<string | undefined>();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!statusPath) return;

    let cancelled = false;
    let timer: any = null;
    let tries = 0;

    const maxAttempts = DEFAULT_MAX_ATTEMPTS + (justTriggered ? 40 : 0);

    const poll = async () => {
      if (cancelled) return;
      tries += 1;

      setLoading(true);
      try {
        // ★Flow直叩き禁止。サーバAPIにプロキシさせる
        const res = await fetch("/api/registry/build-status", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ statusPath }),
        });

        const txt = await res.text().catch(() => "");
        if (!res.ok) throw new Error(`build-status HTTP ${res.status} ${txt}`);

        const json: StatusRes = txt ? JSON.parse(txt) : {};
        if (json?.ok === false) {
          throw new Error(json.reason || "build-status returned ok:false");
        }

        const p = typeof json.pct === "number" ? json.pct : 0;
        setPct(p);

        if (json.url) setUrl(json.url);

        setErr(null);

        if (p >= 100) return;

        if (tries >= maxAttempts) {
          setErr("ステータス取得がタイムアウトしました。しばらくしてから「再試行」を押してください。");
          return;
        }
      } catch (e: any) {
        setErr(e?.message || String(e));
        if (tries >= maxAttempts) return;
      } finally {
        setLoading(false);
      }

      if (!cancelled) timer = setTimeout(poll, 1500);
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [statusPath, retry, justTriggered]);

  const displayPct = Math.min(100, Math.max(0, pct || 0));
  const qrImageUrl =
    url &&
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;

  if (!statusPath) {
    return (
      <div className="text-xs text-slate-500">
        まだ建物フォルダが作成されていません。
        <br />
        先に「建物フォルダ作成 + URL発行」を実行してください。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-slate-600">
        対象: <span className="font-semibold">{user || "-"} / {bldg || "-"}</span>
      </div>

      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-300"
          style={{ width: `${displayPct}%`, backgroundColor: displayPct >= 100 ? "#16a34a" : "#2563eb" }}
        />
      </div>

      <div className="text-xs text-slate-600">
        進捗: <span className="font-semibold">{displayPct}%</span>
        {loading && " （更新中…）"}
      </div>

      {err && (
        <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-2 whitespace-pre-wrap">
          <div>{err}</div>
          <div className="mt-2 text-right">
            <button
              className="btn-secondary"
              onClick={() => {
                setErr(null);
                setPct(0);
                setUrl(undefined);
                setRetry((x) => x + 1);
              }}
            >
              再試行
            </button>
          </div>
        </div>
      )}

      {displayPct >= 100 && url && (
        <div className="space-y-2">
          <div className="text-xs text-slate-700">
            フォームURL:{" "}
            <a href={url} target="_blank" rel="noreferrer" className="text-blue-600 underline">
              {url}
            </a>
          </div>

          {qrImageUrl && (
            <div className="mt-2">
              <div className="text-xs text-slate-700 mb-1">QRコード</div>
              <img src={qrImageUrl} alt="フォームURLのQRコード" className="border border-slate-200 rounded-md bg-white p-1" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
