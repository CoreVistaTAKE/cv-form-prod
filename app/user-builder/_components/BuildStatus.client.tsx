"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  startedAt: number; // ボタン押下時刻(ms)
  user: string; // tenant
  requestedBldg: string; // 入力した建物名（元の値）
  token?: string; // Flowが返す最終フォルダ名（例: FirstService_001_テストビル）
  traceId?: string;
  error?: string;
};

const TOTAL_SECONDS = 40;

// 例："/u/{tenant}/{formId}"
const FORM_PATH_TEMPLATE =
  process.env.NEXT_PUBLIC_FORM_PUBLIC_PATH_TEMPLATE || "/u/{tenant}/{formId}";

const QR_SIZE = "220x220";

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

function buildPath(template: string, tenant: string, formId: string) {
  const t = encodeURIComponent(tenant);
  const f = encodeURIComponent(formId);
  const path = template
    .replaceAll("{tenant}", t)
    .replaceAll("{formId}", f);
  return path.startsWith("/") ? path : `/${path}`;
}

function aiFolderCreateMessage(pct: number) {
  if (pct < 15) {
    return {
      title: "受付・準備中",
      detail: "AI（自動処理）が入力値を検証し、フォルダ作成ジョブを起票しています。",
    };
  }
  if (pct < 30) {
    return {
      title: "テンプレートをコピー中",
      detail: "AI（自動処理）が BaseSystem をコピーして、建物フォルダの土台を作っています。",
    };
  }
  if (pct < 45) {
    return {
      title: "フォルダ構成を生成中",
      detail: "AI（自動処理）が form / originals の構成を作成し、命名ルールを適用しています。",
    };
  }
  if (pct < 65) {
    return {
      title: "フォーム定義を反映中",
      detail: "AI（自動処理）が テーマ・対象外(非適用) をフォームJSONへ反映して保存しています。",
    };
  }
  if (pct < 85) {
    return {
      title: "配布セットを生成中",
      detail: "AI（自動処理）が URL と QR を生成し、配布できる状態へ整えています。",
    };
  }
  if (pct < 100) {
    return {
      title: "最終チェック中",
      detail: "AI（自動処理）が Excel 雛形のリネームや整合性チェックを実行しています。",
    };
  }
  return {
    title: "リンク表示",
    detail: "想定時間に到達しました。フォームURLとQRを表示します。",
  };
}

export default function BuildStatus({
  startedAt,
  user,
  requestedBldg,
  token,
  traceId,
  error,
}: Props) {
  const [now, setNow] = useState(() => Date.now());

  // startedAt が変わったらタイマーをリセット
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

  const formId = (token || requestedBldg || "").trim();
  const origin = getOrigin();

  const formUrl = useMemo(() => {
    if (!origin || !user || !formId) return "";
    const path = buildPath(FORM_PATH_TEMPLATE, user, formId);
    return `${origin}${path}`;
  }, [origin, user, formId]);

  const qrUrl = useMemo(() => {
    if (!formUrl) return "";
    return `https://api.qrserver.com/v1/create-qr-code/?size=${QR_SIZE}&data=${encodeURIComponent(formUrl)}`;
  }, [formUrl]);

  return (
    <div className="mt-4 space-y-4">
      {/* 進捗バー */}
      <div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, backgroundColor: error ? "#dc2626" : pct >= 100 ? "#16a34a" : "#2563eb" }}
          />
        </div>
        <div className="mt-1 text-xs text-slate-600 text-right">進捗 {pct}%</div>
      </div>

      {/* 状態文言 */}
      {error ? (
        <div className="space-y-1">
          <div className="form-title text-base">作成に失敗しました</div>
          <div className="text-xs text-red-600 whitespace-pre-wrap">{error}</div>
        </div>
      ) : (
        <div className="space-y-1">
          <div className="form-title text-base">{msg.title}</div>
          <p className="form-text text-sm" style={{ opacity: 0.9 }}>
            {msg.detail}
          </p>
        </div>
      )}

      {/* 40秒到達時にリンク/QR表示（statusPath不要） */}
      {showLinks && (
        <div className="space-y-3 border-t border-slate-200 pt-3">
          <div className="form-title">配布リンク</div>

          {formUrl ? (
            <div className="space-y-2">
              <a href={formUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline break-all">
                フォームを開く
              </a>

              <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(formUrl);
                    } catch {
                      // clipboard が使えないブラウザ向け
                      window.prompt("コピーしてください", formUrl);
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
                  <div className="text-xs text-slate-500" style={{ maxWidth: 360 }}>
                    ※このQRは表示時点のフォームURLから自動生成しています（statusPathは使いません）。
                    <br />
                    ※リンク先がまだ準備中の場合は、数秒待って再度お試しください。
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-xs text-yellow-700">
              URL を作れません（token 未取得の可能性）。Flow の応答を確認してください。
            </div>
          )}
        </div>
      )}

      {/* 必要な時だけ見える情報 */}
      <details className="border border-slate-200 rounded-md bg-white px-3 py-2">
        <summary className="cursor-pointer text-xs text-slate-500">詳細（必要な時だけ）</summary>
        <div className="text-xs mt-2 space-y-1">
          <div>
            入力名: <span className="font-mono">{requestedBldg || "（なし）"}</span>
          </div>
          {token ? (
            <div>
              token: <span className="font-mono">{token}</span>
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
