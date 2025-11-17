'use client';
import React, { useEffect, useMemo, useState } from "react";
import { useBuilderStore } from "@/store/builder";
import { applyTheme } from "@/utils/theme";
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

  // カラー選択
  const themeItems = [
    { k: "white", name: "白", bg: "#ffffff", fg: "#111111", border: "#d9dfec" },
    { k: "black", name: "黒", bg: "#141d3d", fg: "#eef3ff", border: "#2b3a6f" },
    { k: "red", name: "赤", bg: "#fc8b9b", fg: "#2a151a", border: "#4b2a32" },
    { k: "blue", name: "青", bg: "#7fb5ff", fg: "#112449", border: "#254072" },
    {
      k: "yellow",
      name: "黄",
      bg: "#ffd75a",
      fg: "#332f12",
      border: "#4d4622",
    },
    { k: "green", name: "緑", bg: "#5ce0b1", fg: "#0f241e", border: "#234739" },
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
                builder.setMeta({ theme: t.k });
                localStorage.setItem("cv_theme", t.k);
                applyTheme(t.k);
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </section>

      {/* 2) 対象外(非適用)設定 */}
      <section id="exclude" className="card">
        <div className="form-title mb-2">対象外(非適用)設定</div>
        <div className="text-xs text-slate-500 mb-2">
          セクション単位・項目単位で「対象外」にできます。
          <br />
          緑のボタンは「表示中」、赤のボタンは「非表示」です。
        </div>

        <div className="space-y-3">
          {sectionPages.map((p: any) => {
            const pageId = p.id as string;
            const fs = (fieldsByPage[pageId] ?? []) as any[];

            const fieldIds = fs
              .map((f: any, idx: number) => (f.id ?? f.label ?? `f-${idx}`) as string)
              .filter((id: string) => !!id);

            const pageExcluded = excludedPages.has(pageId);
            const allFieldExcluded =
              fieldIds.length > 0 &&
              fieldIds.every((id) => excludedFields.has(id));

            const sectionExcluded = pageExcluded || allFieldExcluded;

            return (
              <details
                key={pageId}
                className="border border-slate-300 rounded-md bg-white shadow-sm"
              >
                <summary className="cursor-pointer flex items-center justify-between px-3 py-2">
                  <div>
                    {/* 大項目名：太字＋少し大きめ */}
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {p.title || "セクション"}
                    </div>
                    {p.description && (
                      <div
                        style={{
                          fontSize: 14, // タイトルより小さめ
                          color: "#6B7280",
                          marginTop: 2,
                        }}
                      >
                        {p.description}
                      </div>
                    )}
                  </div>
                  {/* 状態ボタン：緑=表示中 / 赤=非表示 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleSectionExclude(pageId, fieldIds);
                    }}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 9999,
                      border: `1px solid ${
                        sectionExcluded ? "#fecaca" : "#bbf7d0"
                      }`,
                      backgroundColor: sectionExcluded ? "#fee2e2" : "#dcfce7",
                      color: sectionExcluded ? "#b91c1c" : "#166534",
                      fontWeight: 600,
                      minWidth: 68,
                      textAlign: "center",
                    }}
                  >
                    {sectionExcluded ? "非表示" : "表示中"}
                  </button>
                </summary>

                {/* 折り畳み内：個別項目 */}
                <div className="px-3 pb-3 pt-2 border-t border-dashed border-slate-200">
                  {fs.length === 0 ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#D1D5DB",
                        marginTop: 4,
                      }}
                    >
                      （項目なし）
                    </div>
                  ) : (
                    <div className="mt-2 space-y-1">
                      {fs.map((f: any, idx: number) => {
                        const fid = (f.id ?? f.label ?? `f-${idx}`) as string;
                        const label = (f.label ?? "(ラベル未設定)") as string;
                        const fExcluded = excludedFields.has(fid);
                        return (
                          <label
                            key={fid}
                            className="flex items-center justify-between"
                            style={{ fontSize: 14 }} // タイトルより小さい
                          >
                            <span>{label}</span>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  padding: "2px 6px",
                                  borderRadius: 9999,
                                  backgroundColor: fExcluded
                                    ? "#fee2e2"
                                    : "#dcfce7",
                                  color: fExcluded ? "#b91c1c" : "#166534",
                                  border: `1px solid ${
                                    fExcluded ? "#fecaca" : "#bbf7d0"
                                  }`,
                                }}
                              >
                                {fExcluded ? "非表示" : "表示中"}
                              </span>
                              <input
                                type="checkbox"
                                checked={fExcluded}
                                onChange={() => toggleFieldExclude(fid)}
                              />
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* 3) 建物フォルダ作成とURL発行（コンポーネント） */}
      <section id="folder" className="card">
        <div className="form-title mb-2">建物フォルダ作成とURL発行</div>
        <BuildingFolderPanel
          createUrl={createUrl}
          statusUrl={statusUrl}
          defaultUser={defaultUser}
          defaultHost={defaultHost}
        />
      </section>

      {/* 4) 実行状況（％やURL/QRの最終反映は BuildStatus 側で） */}
      <section id="status" className="card">
        <div className="form-title mb-2">ステータス</div>
        {/* ここでは初期値は固定。BuildStatus 側で localStorage('cv:lastBuild') を購読して反映する前提 */}
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
