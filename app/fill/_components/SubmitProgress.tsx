// app/fill/_components/SubmitProgress.tsx
"use client";

import React, { useEffect, useState } from "react";

type Props = {
  /** Flow から返ってくる報告書(Excel)のURL。なければ undefined のまま */
  reportUrl?: string;
};

// 疑似進捗の全体時間（秒）
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

  // フェーズ別メッセージ（2〜4秒おきに変化）
  let statusTitle = "";
  let statusDetail = "";

  if (elapsed < 4) {
    statusTitle = "送信中";
    statusDetail = "点検内容をサーバーに送信しています。";
  } else if (elapsed < 8) {
    statusTitle = "入力内容を整理しています";
    statusDetail = "日付・建物名・点検者名などの基本情報を整理しています。";
  } else if (elapsed < 12) {
    statusTitle = "AI が点検内容を解析中";
    statusDetail = "各項目の入力内容から、重要なポイントを抽出しています。";
  } else if (elapsed < 16) {
    statusTitle = "報告書の構成を組み立てています";
    statusDetail = "報告書の章立てと、どの項目をどこに載せるかを決めています。";
  } else if (elapsed < 20) {
    statusTitle = "各セクションの文章を生成中";
    statusDetail = "異常箇所や所見の文章を自動で整えています。";
  } else if (elapsed < 24) {
    statusTitle = "表やレイアウトを調整中";
    statusDetail = "Excel シートの表やレイアウトを整えています。";
  } else if (elapsed < 28) {
    statusTitle = "最終チェック中";
    statusDetail = "入力漏れや不整合がないかを確認しています。";
  } else if (elapsed < 32) {
    statusTitle = "Excel ファイルを書き込み中";
    statusDetail = "生成した内容を報告書ファイルに反映しています。";
  } else if (elapsed < 37) {
    statusTitle = "報告書を発行しています";
    statusDetail = "OneDrive 上に報告書ファイルを保存しています。";
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
