//app/user-builder/_components/BuildStatus.client.tsx
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

type RegistryEntry = {
  bldg?: string; // 表示用名
  bldgFolderName?: string; // フォルダ名（プルダウン value と揃える想定）
  statusPath: string;
  url?: string;
};

const MAX_ATTEMPTS = 2; // ★ 最大試行回数：2回（初回 + リトライ1回）

function upsertRegistry(entry: RegistryEntry) {
  try {
    // cv:lastBuild と同じ statusPath なら、そこで保存した bldgFolderName を引き継ぐ
    try {
      const lastRaw = localStorage.getItem("cv:lastBuild");
      if (lastRaw) {
        const last: any = JSON.parse(lastRaw);
        if (
          last &&
          typeof last.statusPath === "string" &&
          last.statusPath === entry.statusPath
        ) {
          if (
            !entry.bldgFolderName &&
            typeof last.bldgFolderName === "string" &&
            last.bldgFolderName
          ) {
            entry.bldgFolderName = last.bldgFolderName;
          }
          if (!entry.bldg && typeof last.bldg === "string" && last.bldg) {
            entry.bldg = last.bldg;
          }
        }
      }
    } catch {
      // 無視
    }

    const raw = localStorage.getItem("cv_registry") || "[]";
    let arr: RegistryEntry[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed as RegistryEntry[];
    } catch {
      arr = [];
    }

    const idx = arr.findIndex(
      (x) => x && x.statusPath === entry.statusPath,
    );
    if (idx >= 0) {
      arr[idx] = { ...arr[idx], ...entry };
    } else {
      arr.push(entry);
    }

    localStorage.setItem("cv_registry", JSON.stringify(arr));
  } catch {
    // 失敗しても致命傷ではない
  }
}

export default function BuildStatus({
  user,
  bldg,
  statusPath,
  statusUrl,
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
    // 1) 明示的に statusPath が渡されているときは最優先
    if (statusPath) {
      const next = { user, bldg, statusPath };
      setInfo(next);
      try {
        localStorage.setItem("cv:lastBuild", JSON.stringify(next));
      } catch {
        // ignore
      }
      return;
    }

    // 2) user/bldg のみ指定 → 「この建物はまだフォルダ未作成」として扱う
    if (user || bldg) {
      setInfo({ user, bldg, statusPath: undefined });
      return;
    }

    // 3) 何も指定がなければ最後のビルドにフォールバック（旧 UI 用）
    try {
      const raw = localStorage.getItem("cv:lastBuild");
      if (raw) {
        const obj = JSON.parse(raw);
        if (obj && obj.statusPath) setInfo(obj);
      }
    } catch {
      // ignore
    }
  }, [statusPath, user, bldg]);

  // ポーリング（最大 MAX_ATTEMPTS 回まで）
  useEffect(() => {
    if (!info.statusPath) return;
    if (!statusUrl) {
      setErr(
        "FLOW_GET_BUILD_STATUS_URL が未設定です（statusUrl が渡されていません）。",
      );
      return;
    }

    let cancelled = false;
    let timer: any = null;
    let tries = 0; // ★ このエフェクト内だけでカウント

    const poll = async () => {
      if (cancelled) return;
      tries += 1;

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

        if (json.url) {
          setUrl(json.url);
          // 完了時にレジストリへ保存（フォルダ名は upsertRegistry 内で補完）
          upsertRegistry({
            bldg: info.bldg,
            statusPath: info.statusPath!,
            url: json.url,
          });
        }

        setErr(null);

        // ★ pct が 100 以上ならここで終了（成功）
        if (p >= 100) return;

        // ★ 試行回数上限に達したら終了（失敗扱い）
        if (tries >= MAX_ATTEMPTS) {
          setErr(
            "ステータス取得の試行回数が上限に達しました。しばらくしてから再度お試しください。",
          );
          return;
        }
      } catch (e: any) {
        console.error(e);
        setErr(e?.message || String(e));

        // エラー時もリトライカウントに含める。
        if (tries >= MAX_ATTEMPTS) {
          return;
        }
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
  }, [info.statusPath, info.bldg, statusUrl]);

  const displayPct = Math.min(100, Math.max(0, pct || 0));
  const qrImageUrl =
    url &&
    `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      url,
    )}`;

  // statusPath が無い = まだ建物フォルダを作っていない建物
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
      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
        <div
          className="h-3 rounded-full transition-all duration-300"
          style={{
            width: `${displayPct}%`,
            backgroundColor: displayPct >= 100 ? "#16a34a" : "#2563eb",
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
