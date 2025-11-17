"use client";

import React, { useEffect, useState } from "react";

type StatusRes = {
  pct?: number;
  step?: string;
  url?: string;
  qrPath?: string;
};

type Props = {
  user?: string;
  bldg?: string;
  statusPath?: string;
  statusUrl?: string;
  justTriggered?: boolean;
};

export default function BuildStatus({
  user,
  bldg,
  statusPath,
  statusUrl,
  justTriggered,
}: Props) {
  const [info, setInfo] = useState<{
    user?: string;
    bldg?: string;
    statusPath?: string;
  }>({});
  const [pct, setPct] = useState<number>(0);
  const [url, setUrl] = useState<string | undefined>();
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 初期 statusPath の決定
  useEffect(() => {
    if (statusPath) {
      const next = { user, bldg, statusPath };
      setInfo(next);
      try {
        localStorage.setItem("cv:lastBuild", JSON.stringify(next));
      } catch {}
      return;
    }
    try {
      const raw = localStorage.getItem("cv:lastBuild");
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && obj.statusPath) setInfo(obj);
      }
    } catch {}
  }, [statusPath, user, bldg]);

  // ポーリング
  useEffect(() => {
    if (!info.statusPath) return;
    if (!statusUrl) {
      setErr(
        "FLOW_GET_BUILD_STATUS_URL が未設定です（statusUrl が渡されていません）。"
      );
      return;
    }

    let cancelled = false;
    let timer: any = null;

    const poll = async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const res = await fetch(statusUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ statusPath: info.statusPath }),
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`GetBuildStatus HTTP ${res.status} ${txt}`);
        }
        const json = (await res.json().catch(() => ({}))) as StatusRes;
        const p = typeof json.pct === "number" ? json.pct : 0;
        setPct(p);
        if (json.url) setUrl(json.url);
        setErr(null);
        if (p >= 100) return;
      } catch (e: any) {
        console.error(e);
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }

      if (!cancelled) {
        timer = setTimeout(poll, 1500);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [info.statusPath, statusUrl]);

  const displayPct = Math.min(100, Math.max(0, pct || 0));
  const qrImageUrl =
    url &&
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      url
    )}`;

  if (!info.statusPath) {
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
        対象:{" "}
        <span className="font-semibold">
          {info.user || "-"} / {info.bldg || "-"}
        </span>
      </div>

      {/* 進捗バー */}
      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-300"
          style={{
            width: `${displayPct}%`,
            backgroundColor:
              displayPct >= 100 ? "#16a34a" : "#2563eb",
          }}
        />
      </div>
      <div className="text-xs text-slate-600">
        進捗: <span className="font-semibold">{displayPct}%</span>
        {loading && " （更新中…）"}
      </div>

      {err && (
        <div className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1 whitespace-pre-wrap">
          {err}
        </div>
      )}

      {displayPct >= 100 && url && (
        <div className="space-y-2">
          <div className="text-xs text-slate-700">
            フォームURL:{" "}
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline"
            >
              {url}
            </a>
          </div>
          {qrImageUrl && (
            <div className="mt-2">
              <div className="text-xs text-slate-700 mb-1">QRコード</div>
              <img
                src={qrImageUrl}
                alt="フォームURLのQRコード"
                className="border border-slate-200 rounded-md bg-white p-1"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
