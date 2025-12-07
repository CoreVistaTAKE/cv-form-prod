// app/user-builder/_components/BuildStatus.client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  startedAt: number; // Date.now()
  finalUrl?: string;
  qrUrl?: string;
  traceId?: string;
  error?: string;
};

const TOTAL_MS = 40_000;

// 15% 30% 45% 65% 85% の段階メッセージ
function phaseByPercent(pct: number) {
  if (pct < 15) {
    return { title: "受付中", detail: "作成要求を受け取り、処理を開始しています。" };
  }
  if (pct < 30) {
    return { title: "テンプレートをコピー中", detail: "BaseSystem を建物フォルダへ複製しています。" };
  }
  if (pct < 45) {
    return { title: "フォルダ構成を初期化中", detail: "form / originals の初期ファイルを準備しています。" };
  }
  if (pct < 65) {
    return { title: "フォーム設定を生成中", detail: "対象外(非適用)・テーマ設定をフォームJSONへ反映しています。" };
  }
  if (pct < 85) {
    return { title: "URL / QR を生成中", detail: "配布用リンクと QR を作成しています。" };
  }
  if (pct < 100) {
    return { title: "最終チェック中", detail: "保存状態の確認と仕上げ処理をしています。" };
  }
  return { title: "完了", detail: "建物フォルダ作成が完了しました。配布できます。" };
}

export default function BuildStatus({ startedAt, finalUrl, qrUrl, traceId, error }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, []);

  const pct = useMemo(() => {
    if (error) return 100;
    const elapsed = Math.max(0, now - startedAt);
    const p = Math.round((elapsed / TOTAL_MS) * 100);
    if (p <= 0) return 1; // 1〜100
    if (p >= 100) return 100;
    return p;
  }, [now, startedAt, error]);

  const phase = useMemo(() => phaseByPercent(pct), [pct]);
  const done = pct >= 100;

  return (
    <div className="card space-y-4">
      <div>
        <div className="form-title mb-1">建物フォルダを作成しています</div>
        <p className="form-text text-sm" style={{ opacity: 0.85 }}>
          ブラウザを閉じずに、そのままお待ちください。
        </p>
      </div>

      <div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: done ? "#16a34a" : "#2563eb",
            }}
          />
        </div>
        <div className="mt-1 text-xs text-slate-600 text-right">進捗 {pct}%</div>
      </div>

      <div>
        <div className="form-title text-base mb-1">{error ? "エラー" : phase.title}</div>
        <p className="form-text text-sm" style={{ opacity: 0.9 }}>
          {error ? error : phase.detail}
        </p>
      </div>

      {/* ★40秒到達でリンクを出す（要求どおり） */}
      {done && !error && (
        <div className="mt-2 space-y-2 border-t border-slate-200 pt-3">
          {finalUrl ? (
            <a href={finalUrl} target="_blank" rel="noreferrer" className="btn">
              フォームを開く
            </a>
          ) : (
            <div className="text-sm text-yellow-700">
              完了しましたが、フォームURLが取得できていません（Flow の finalUrl を確認してください）。
            </div>
          )}

          {qrUrl ? (
            <a href={qrUrl} target="_blank" rel="noreferrer" className="btn-secondary">
              QRを開く
            </a>
          ) : null}

          {traceId ? (
            <div className="text-[11px] text-slate-400">
              traceId: <span className="font-mono">{traceId}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
