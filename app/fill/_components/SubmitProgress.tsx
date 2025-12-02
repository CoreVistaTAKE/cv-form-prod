// app/fill/_components/SubmitProgress.tsx
"use client";

import React, { useEffect, useState } from "react";

type Props = {
  /** Flow から返ってくる報告書(Excel)のURL。なければ undefined のまま */
  reportUrl?: string;
};

// 疑似進捗の総時間（秒）
const TOTAL_SECONDS = 37;

export default function SubmitProgress({ reportUrl }: Props) {
  const [elapsed, setElapsed] = useState(0); // 経過秒数（0〜TOTAL_SECONDS）

  // 0〜TOTAL_SECONDS秒のタイマー
  useEffect(() => {
    const start = Date.now();
    const timer = window.setInterval(() => {
      const sec = (Date.now() - start) / 1000;
      if (sec >= TOTAL_SECONDS) {
        setElapsed(TOTAL_SECONDS);
        window.clearInterval(timer);
      } else {
        setElapsed(sec);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, []);

  // 進捗率（0〜100%）
  const pct = Math.min(100, Math.round((elapsed / TOTAL_SECONDS) * 100));

  // フェーズ別メッセージ
  let statusTitle = "";
  let statusDetail = "";

  if (elapsed < 3) {
    statusTitle = "送信中";
    statusDetail = "点検内容をサーバーに送信しています。";
  } else if (elapsed < 7) {
    statusTitle = "入力内容を解析中";
    statusDetail = "AI が点検項目と回答内容を読み取り、整理しています。";
  } else if (elapsed < 11) {
    statusTitle = "異常・着目点を抽出中";
    statusDetail = "必要に応じてコメントや注意点をピックアップしています。";
  } else if (elapsed < 15) {
    statusTitle = "報告書の下書きを生成中";
    statusDetail = "報告書の文章と数値を自動で埋め込んでいます。";
  } else if (elapsed < 19) {
    statusTitle = "レイアウトを整えています";
    statusDetail = "セル配置や見出しの体裁を整えています。";
  } else if (elapsed < 23) {
    statusTitle = "最終チェック中";
    statusDetail = "入力漏れや不整合がないかを確認しています。";
  } else if (elapsed < 31) {
    statusTitle = "OneDrive に保存中";
    statusDetail = "完成した報告書ファイルを OneDrive に保存しています。";
  } else if (elapsed < TOTAL_SECONDS) {
    statusTitle = "共有リンクを発行中";
    statusDetail = "報告書（Excel）を開くためのリンクを作成しています。";
  } else {
    statusTitle = "報告書が発行されました";
    statusDetail = "下記のリンクから報告書（Excel）を開いて内容をご確認ください。";
  }

  const isCompleted = elapsed >= TOTAL_SECONDS;

  return (
    <div className="card space-y-4">
      {/* 見出し */}
      <div>
        <div className="form-title mb-1">報告書を作成しています</div>
        <p className="form-text text-sm" style={{ opacity: 0.85 }}>
          ブラウザを閉じずに、そのままお待ちください。
        </p>
      </div>

      {/* 進捗ゲージ */}
      <div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: pct >= 100 ? "#16a34a" : "#2563eb",
            }}
          />
        </div>
        <div className="mt-1 text-xs text-slate-600 text-right">
          進捗 {pct}%
        </div>
      </div>

      {/* 現在ステータス */}
      <div>
        <div className="form-title text-base mb-1">{statusTitle}</div>
        <p className="form-text text-sm" style={{ opacity: 0.9 }}>
          {statusDetail}
        </p>
      </div>

      {/* 完了後の表示（TOTAL_SECONDS 経過後） */}
      {isCompleted && (
        <div className="mt-2 space-y-2 border-t border-slate-200 pt-3">
          {reportUrl ? (
            <div className="space-y-1">
              <a
                href={reportUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 underline break-all"
              >
                報告書（Excel）を開く
              </a>
              <p className="text-xs text-slate-600">
                ※報告書を確認していただき、修正が必要な場合は、
                Excel ファイルを開いて直接修正することができます。
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-yellow-700">
                報告書の発行は完了しましたが、ファイルのリンクを取得できませんでした。
              </p>
              <p className="text-xs text-slate-600">
                OneDrive 上の「reports」フォルダに作成された最新の報告書ファイルをご確認ください。
              </p>
            </div>
          )}
          <p className="text-m text-slate-100 mt-4">
            点検作業、本当にお疲れさまでした。<br />
            現場での丁寧な記録が、この報告書の品質そのものにつながっています。<br />
            どうぞ安全にお帰りください。
          </p>
        </div>
      )}
    </div>
  );
}
