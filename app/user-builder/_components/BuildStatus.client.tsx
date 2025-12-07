"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  startedAt: number; // ボタン押下時刻(ms)
  user: string; // tenant
  requestedBldg: string; // 入力した建物名（例：テストビル）

  // Flow から返る想定
  token?: string; // 例：FirstService_001_テストビル
  finalUrl?: string; // ★これが正。例： https://www.form.visone-ai.jp/fill?user=FirstService&bldg=...&Sseq=001
  traceId?: string;

  error?: string;
};

const TOTAL_SECONDS = 40;

const BUILDING_TOKEN_RE = /^([A-Za-z0-9]+)_(\d{3})_(.+)$/;

function normalizeOrigin(raw: string) {
  const s = (raw || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function getOrigin() {
  const canonical = normalizeOrigin(process.env.NEXT_PUBLIC_CANONICAL_HOST || "");
  if (canonical) return canonical;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function buildFillUrl(origin: string, user: string, bldg: string, seq: string) {
  const u = new URL(origin);
  u.pathname = "/fill";
  u.searchParams.set("user", user);
  u.searchParams.set("bldg", bldg);
  u.searchParams.set("Sseq", seq);
  return u.toString();
}

function getBestFinalUrl(origin: string, user: string, requestedBldg: string, token?: string, finalUrl?: string) {
  // 1) Flowが返した finalUrl を最優先
  if (finalUrl && /^https?:\/\//i.test(finalUrl)) return finalUrl;

  // 2) 相対URLで返るケース（/fill?...）
  if (finalUrl && finalUrl.startsWith("/")) return `${origin}${finalUrl}`;

  // 3) token から組み立て（FirstService_001_テストビル）
  const m = token ? BUILDING_TOKEN_RE.exec(token) : null;
  if (m) {
    const seq = m[2];
    const bldg = m[3];
    return buildFillUrl(origin, user, bldg, seq);
  }

  // 4) 最後の保険：入力値 + 001
  if (requestedBldg) return buildFillUrl(origin, user, requestedBldg, "001");

  return "";
}

function aiFolderCreateMessage(pct: number) {
  if (pct < 15) return { title: "受付・準備中", detail: "AI（自動処理）が入力値を検証し、フォルダ作成ジョブを起票しています。" };
  if (pct < 30) return { title: "テンプレートをコピー中", detail: "AI（自動処理）が BaseSystem をコピーして、建物フォルダの土台を作っています。" };
  if (pct < 45) return { title: "フォルダ構成を生成中", detail: "AI（自動処理）が form / originals の構成を作成し、命名ルールを適用しています。" };
  if (pct < 65) return { title: "フォーム定義を反映中", detail: "AI（自動処理）が テーマ・対象外(非適用) をフォームJSONへ反映して保存しています。" };
  if (pct < 85) return { title: "配布セットを生成中", detail: "AI（自動処理）が URL と QR を生成し、配布できる状態へ整えています。" };
  if (pct < 100) return { title: "最終チェック中", detail: "AI（自動処理）が Excel 雛形のリネームや整合性チェックを実行しています。" };
  return { title: "リンク表示", detail: "想定時間に到達しました。フォームURLとQRを表示します。" };
}

export default function BuildStatus({ startedAt, user, requestedBldg, token, finalUrl, traceId, error }: Props) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(timer);
  }, [startedAt]);

  const elapsedSec = useMemo(() => Math.max(0, (now - startedAt) / 1000), [now, startedAt]);

  const pct = useMemo(() => {
    const raw = Math.round((elapsedSec / TOTAL_SECONDS) * 100);
    return Math.max(1, Math.min(100, raw));
  }, [elapsedSec]);

  const msg = useMemo(() => aiFolderCreateMessage(pct), [pct]);
  const showLinks = pct >= 100 && !error;

  const origin = getOrigin();

  const bestUrl = useMemo(() => {
    if (!origin || !user) return "";
    return getBestFinalUrl(origin, user, requestedBldg, token, finalUrl);
  }, [origin, user, requestedBldg, token, finalUrl]);

  const qrUrl = useMemo(() => {
    if (!bestUrl) return "";
    const size = "220x220";
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}&data=${encodeURIComponent(bestUrl)}`;
  }, [bestUrl]);

  return (
    <div className="mt-4 space-y-4">
      <div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: error ? "#dc2626" : pct >= 100 ? "#16a34a" : "#2563eb",
            }}
          />
        </div>
        <div className="mt-1 text-xs text-slate-600 text-right">進捗 {pct}%</div>
      </div>

      {error ? (
        <div className="space-y-1">
          <div className="form-title text-base">作成に失敗しました</div>
          <div className="text-xs text-red-600 whitespace-pre-wrap">{error}</div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="form-title text-base">{pct >= 100 ? "作成完了（表示準備）" : msg.title}</div>
          <p className="form-text text-sm" style={{ opacity: 0.9 }}>
            {pct >= 100 ? "フォームURLとQRを表示します。" : msg.detail}
          </p>
        </div>
      )}

      {showLinks && (
        <div className="space-y-3 border-t border-slate-200 pt-3">
          <div className="form-title">フォームURL / QR</div>

          {bestUrl ? (
            <div className="space-y-2">
              <a href={bestUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline break-all">
                フォームを開く
              </a>

              <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(bestUrl);
                    } catch {
                      window.prompt("コピーしてください", bestUrl);
                    }
                  }}
                >
                  URLをコピー
                </button>

                {qrUrl ? (
                  <a className="btn-secondary" href={qrUrl} target="_blank" rel="noreferrer">
                    QRを別タブで開く
                  </a>
                ) : null}
              </div>

              {qrUrl ? (
                <div className="flex items-start gap-4" style={{ flexWrap: "wrap" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR" width={220} height={220} style={{ borderRadius: 12, background: "#fff" }} />
                  <div className="text-xs text-slate-500" style={{ maxWidth: 420 }}>
                    ※URLが開けない場合は、フォルダ作成は完了していても反映が遅れている可能性があります。数秒待って再アクセスしてください。
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-xs text-yellow-700">
              finalUrl を生成できませんでした（Flow 応答に finalUrl/token が無い可能性）。Flow の CreateFormFolder の Response を確認してください。
            </div>
          )}
        </div>
      )}

      <details className="border border-slate-200 rounded-md bg-white px-3 py-2">
        <summary className="cursor-pointer text-xs text-slate-500">詳細（必要な時だけ）</summary>
        <div className="text-xs mt-2 space-y-1">
          <div>
            入力建物名: <span className="font-mono">{requestedBldg || "（なし）"}</span>
          </div>
          {token ? (
            <div>
              token: <span className="font-mono">{token}</span>
            </div>
          ) : null}
          {finalUrl ? (
            <div>
              finalUrl: <span className="font-mono break-all">{finalUrl}</span>
            </div>
          ) : null}
          {traceId ? (
            <div>
              traceId: <span className="font-mono">{traceId}</span>
            </div>
          ) : null}
        </div>
      </details>
    </div>
  );
}
