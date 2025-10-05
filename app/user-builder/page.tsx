"use client";
import React, { useEffect } from "react";
import { useBuilderStore } from "@/store/builder";
import { usePublishStore } from "@/store/publish";

export default function UserBuilderPage() {
  // init（selector化でLint安定）
  const initBuilder = useBuilderStore((s) => s.initOnce);
  const meta        = useBuilderStore((s) => s.meta);
  const setMeta     = useBuilderStore((s) => s.setMeta);
  const saveSchema  = useBuilderStore((s) => s.save);

  const initPublish = usePublishStore((s) => s.initOnce);

  useEffect(() => {
    initPublish();
    initBuilder();
  }, [initPublish, initBuilder]);

  return (
    <div className="container mx-auto max-w-3xl p-4">
      <div className="card">
        <h1 className="text-xl font-semibold mb-3">ユーザー用ビルダー（簡易）</h1>
        <p className="text-sm opacity-80 mb-4">
          ここでは、フォームの基本情報のみを調整します（構造の追加・並べ替えは社内で管理）。
        </p>

        <div className="space-y-4">
          <div>
            <label className="label">フォームタイトル</label>
            <input
              className="input w-full"
              value={meta.title || ""}
              onChange={(e) => setMeta({ title: e.target.value })}
              placeholder="無題のフォーム"
            />
          </div>

          <div>
            <label className="label">会社名（固定）</label>
            <input
              className="input w-full"
              value={meta.fixedCompany || ""}
              onChange={(e) => setMeta({ fixedCompany: e.target.value })}
              placeholder="（任意）"
            />
          </div>

          <div>
            <label className="label">建物名（固定）</label>
            <input
              className="input w-full"
              value={meta.fixedBuilding || ""}
              onChange={(e) => setMeta({ fixedBuilding: e.target.value })}
              placeholder="（任意）"
            />
          </div>

          <div>
            <label className="label">テーマ（data-theme）</label>
            <select
              className="input"
              value={meta.theme || "black"}
              onChange={(e) => setMeta({ theme: e.target.value as any })}
            >
              <option value="black">black</option>
              <option value="white">white</option>
              <option value="pastel">pastel</option>
            </select>
            <p className="text-xs opacity-70 mt-1">
              最小コントラスト（4.5:1）を満たす色を選択。白テーマの薄色ボタンは文字 #111 固定。
            </p>
          </div>

          <div className="flex gap-2">
            <button className="btn" onClick={() => saveSchema()}>保存（LocalStorage）</button>
          </div>
        </div>

        <hr className="my-6" />
        <p className="text-sm opacity-80">
          前回データの表示は「発行済みフォーム」から確認できます（/u/[tenant]/[formId]）。
        </p>
      </div>
    </div>
  );
}
