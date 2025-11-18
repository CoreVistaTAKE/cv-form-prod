'use client';
import React, { useEffect, useMemo, useState } from "react";
import { useBuilderStore } from "@/store/builder";
import { applyTheme } from "@/utils/theme";
import type { Theme } from "@/utils/theme";               // ★ 追加：Theme型を明示
import BuildingFolderPanel from "./_components/BuildingFolderPanel";
import BuildStatus from "./_components/BuildStatus.client";

type Props = {
  createUrl: string;
  statusUrl: string;
  defaultUser?: string | null;
  defaultHost?: string | null;
};

export default function UserBuilderClient({
  createUrl,
  statusUrl,
  defaultUser,
  defaultHost,
}: Props) {
  const builder = useBuilderStore();
  const [baseLoaded, setBaseLoaded] = useState(false);

  // 初期化とテーマ適用
  useEffect(() => {
    builder.initOnce();
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cv_form_base_v049");
      if (raw) {
        const obj = JSON.parse(raw);
        builder.hydrateFrom(obj);
        setBaseLoaded(true);
      }
    } catch {
      // 読み込み失敗時は無視
    }
  }, [builder.hydrateFrom]);
  useEffect(() => {
    applyTheme(builder.meta.theme);
  }, [builder.meta.theme]);

  // 対象外(非適用)UIのための準備
  const pages = builder.pages;
  const fields = builder.fields;

  const sectionPages = useMemo(
    () => pages.filter((p: any) => p.type === "section"),
    [pages]
  );

  const fieldsByPage = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const f of fields as any[]) {
      const pid = (f as any).pageId ?? "";
      if (!map[pid]) map[pid] = [];
      map[pid].push(f);
    }
    return map;
  }, [fields]);

  const [excludedPages, setExcludedPages] = useState<Set<string>>(
    () => new Set()
  );
  const [excludedFields, setExcludedFields] = useState<Set<string>>(
    () => new Set()
  );

  // 対象外情報を meta に格納（フォーム本体側で利用する前提）
  useEffect(() => {
    try {
      builder.setMeta({
        excludePages: Array.from(excludedPages),
        excludeFields: Array.from(excludedFields),
      });
    } catch {
      // setMeta 未対応でも UI は動く
    }
  }, [excludedPages, excludedFields, builder]);

  const handleLoadUserBase = async () => {
    try {
      const picked = window.prompt(
        "ユーザー用ベースJSONをペーストしてください",
        ""
      );
      if (!picked) {
        return;
      }
      const obj = JSON.parse(picked);
      localStorage.setItem("cv_form_base_v049", JSON.stringify(obj));
      builder.hydrateFrom(obj);
      setBaseLoaded(true);
      alert("ベースを読み込みました。");
    } catch (e: any) {
      alert("読み込み失敗: " + (e?.message ?? String(e)));
    }
  };

  const handleLoadUserBaseFromFile = async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
    const file: File = await new Promise((res) => {
        input.onchange = () => res(input.files![0]);
        input.click();
      });
      const text = await file.text();
      localStorage.setItem("cv_form_base_v049", text);
      try {
        const obj = JSON.parse(text);
        builder.hydrateFrom(obj);
        setBaseLoaded(true);
        alert("ベースを読み込みました。");
      } catch (e: any) {
        alert("読み込み失敗: " + (e?.message ?? String(e)));
      }
    } catch (e: any) {
      alert("ファイル選択に失敗しました: " + (e?.message ?? String(e)));
    }
  };

  // カラー選択（★ k に Theme 型を付与）
  const themeItems: Array<{ k: Theme; name: string; bg: string; fg: string; border: string }> = [
    { k: "white",  name: "白", bg: "#ffffff", fg: "#111111", border: "#d9dfec" },
    { k: "black",  name: "黒", bg: "#141d3d", fg: "#eef3ff", border: "#2b3a6f" },
    { k: "red",    name: "赤", bg: "#fc8b9b", fg: "#2a151a", border: "#4b2a32" },
    { k: "blue",   name: "青", bg: "#7fb5ff", fg: "#112449", border: "#254072" },
    { k: "yellow", name: "黄", bg: "#ffd75a", fg: "#332f12", border: "#4d4622" },
    { k: "green",  name: "緑", bg: "#5ce0b1", fg: "#0f241e", border: "#234739" },
  ];

  // セクション一括トグル
  const toggleSectionExclude = (pageId: string, fieldIds: string[]) => {
    setExcludedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
    setExcludedFields((prev) => {
      const next = new Set(prev);
      const nowExcluded = excludedPages.has(pageId);
      if (nowExcluded) {
        fieldIds.forEach((id) => next.delete(id));
      } else {
        fieldIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  // 個別項目トグル
  const toggleFieldExclude = (fieldId: string) => {
    setExcludedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* 上部：枠なし（左=タイトル、右=読み込みボタン） */}
      <div className="flex items-center justify-between">
        <div className="form-title">
          ユーザー用ビルダー（フォーム設定・対象外・テーマ）
        </div>
        <div className="gap-2 flex">
          <button className="btn-secondary" onClick={handleLoadUserBase}>
            ユーザー用ベースを読み込む（ペースト）
          </button>
          <button
            className="btn-secondary"
            onClick={handleLoadUserBaseFromFile}
          >
            ユーザー用ベースを読み込む（ファイル）
          </button>
        </div>
      </div>

      {/* 1) フォームカラー設定（フォームに反映） */}
      <section id="color" className="card">
        <div className="form-title mb-2">
          フォームカラー設定（フォームに反映）
        </div>
        <div
          className="flex items-center"
          style={{ gap: 8, flexWrap: "wrap" }}
        >
          {themeItems.map((t) => (
            <button
              key={t.k}
              className="btn"
              style={{
                background: t.bg,
                color: t.fg,
                border: `1px solid ${t.border}`,
              }}
              onClick={() => {
                builder.setMeta({ theme: t.k });     // ★ ここでもう string ではなく Theme と推論される
                localStorage.setItem("cv_theme", t.k);
                applyTheme(t.k);
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </section>

      {/* 2) 対象外(非適用)設定 — ここはあなたの最新版のままでOK */}

      {/* 3) 建物フォルダ作成とURL発行 */}
      <section id="folder" className="card">
        <div className="form-title mb-2">建物フォルダ作成とURL発行</div>
        <BuildingFolderPanel
          createUrl={createUrl}
          statusUrl={statusUrl}
          defaultUser={defaultUser}
          defaultHost={defaultHost}
        />
      </section>

      {/* 4) ステータス */}
      <section id="status" className="card">
        <div className="form-title mb-2">ステータス</div>
        <BuildStatus
          user={"form_PJ1"}
          bldg={"テストビルA"}
          justTriggered={false}
          statusUrl={statusUrl}
        />
      </section>
    </div>
  );
}
