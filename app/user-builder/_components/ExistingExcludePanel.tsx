"use client";

import * as React from "react";
import { useBuilderStore } from "@/store/builder";

const APP_VER = process.env.NEXT_PUBLIC_APP_VERSION || "";

type Page = {
  id: string;
  title?: string;
  description?: string;
  type?: string;
};

type Field = {
  id?: string;
  pageId?: string;
  label?: string;
};

function closeDetails(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget as HTMLElement;
  const d = el.closest("details") as HTMLDetailsElement | null;
  if (d && d.hasAttribute("open")) {
    d.removeAttribute("open");
  }
}

/**
 * 対象外(非適用)設定パネル
 * - セクション（ページ）ごとの一括トグル
 * - フィールドごとの個別トグル
 * いまはUI上のメモ用途（schemaへは自動反映しない）
 */
export default function ExistingExcludePanel() {
  const builder = useBuilderStore();

  const pages: Page[] = builder.pages || [];
  const fields: Field[] = builder.fields || [];

  // type==="section" だけ対象
  const sectionPages = React.useMemo(
    () => pages.filter((p) => p.type === "section"),
    [pages]
  );

  // pageId ごとにフィールドを束ねる
  const fieldsByPage = React.useMemo(() => {
    const map: Record<string, Field[]> = {};
    for (const f of fields) {
      const pid = f.pageId ?? "";
      if (!map[pid]) map[pid] = [];
      map[pid].push(f);
    }
    return map;
  }, [fields]);

  // ローカル状態で「対象外候補」を管理
  const [excludedPages, setExcludedPages] = React.useState<Set<string>>(
    () => new Set()
  );
  const [excludedFieldIds, setExcludedFieldIds] = React.useState<Set<string>>(
    () => new Set()
  );

  const togglePageExclude = (pageId: string, fieldsOfPage: Field[]) => {
    setExcludedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) next.delete(pageId);
      else next.add(pageId);
      return next;
    });
    // ページ一括 → 配下のフィールドもまとめてON/OFF
    setExcludedFieldIds((prev) => {
      const next = new Set(prev);
      const ids = fieldsOfPage
        .map((f) => f.id || f.label || "")
        .filter((id) => !!id);

      const nowExcluded = excludedPages.has(pageId);
      if (nowExcluded) {
        // 解除
        for (const id of ids) next.delete(id);
      } else {
        // 追加
        for (const id of ids) next.add(id);
      }
      return next;
    });
  };

  const toggleFieldExclude = (_pageId: string, field: Field) => {
    const id = field.id || field.label || "";
    if (!id) return;
    setExcludedFieldIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      style={{
        padding: 8,
        border: "1px dashed #CBD5E1",
        borderRadius: 6,
        fontSize: 12,
        color: "#334155",
        background: "#F9FAFB",
      }}
    >
      <div
        style={{
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div>対象外(非適用)設定パネル</div>
        <div style={{ fontSize: 10, color: "#9CA3AF" }}>
          Version: {APP_VER || "-"}
        </div>
      </div>

      <div
        style={{
          marginBottom: 8,
          fontSize: 11,
          color: "#6B7280",
          lineHeight: 1.5,
        }}
      >
        セクション単位・項目単位で「対象外候補」としてマークできます。
        <br />
        ※ 現時点ではフォーム本体には自動反映せず、「どれを除外したいか」を確認するための設定です。
      </div>

      {sectionPages.length === 0 && (
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>
          セクションページがありません。フォームベースを読み込んでからご利用ください。
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sectionPages.map((p) => {
          const fieldsOfPage = fieldsByPage[p.id] ?? [];
          const pageExcluded = excludedPages.has(p.id);
          return (
            <details
              key={p.id}
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: 6,
                padding: 8,
                background: "#FFFFFF",
              }}
            >
              <summary
                style={{
                  listStyle: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {p.title || "セクション"}
                    {pageExcluded && (
                      <span
                        style={{
                          fontSize: 10,
                          padding: "2px 6px",
                          borderRadius: 9999,
                          background: "#F97316",
                          color: "#FFF7ED",
                        }}
                      >
                        このセクションを対象外にする
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        marginTop: 2,
                      }}
                    >
                      {p.description}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    togglePageExclude(p.id, fieldsOfPage);
                  }}
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: "1px solid #CBD5E1",
                    background: pageExcluded ? "#FEE2E2" : "#EFF6FF",
                    color: pageExcluded ? "#B91C1C" : "#1D4ED8",
                    cursor: "pointer",
                  }}
                >
                  セクションを一括で{pageExcluded ? "対象に戻す" : "対象外にする"}
                </button>
              </summary>

              {/* フィールド一覧 */}
              <div
                style={{
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: "1px dashed #E5E7EB",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {fieldsOfPage.length === 0 && (
                  <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                    このセクションにはフィールドがありません。
                  </div>
                )}

                {fieldsOfPage.map((f, idx) => {
                  const fid = f.id || f.label || `f-${idx}`;
                  const checked = excludedFieldIds.has(fid);
                  return (
                    <label
                      key={fid}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        fontSize: 12,
                      }}
                    >
                      <span>
                        {f.label || "(ラベル未設定)"}
                        {f.id && (
                          <span
                            style={{
                              marginLeft: 4,
                              fontSize: 10,
                              color: "#9CA3AF",
                            }}
                          >
                            ({f.id})
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          color: "#6B7280",
                        }}
                      >
                        <span>対象外にする</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleFieldExclude(p.id, f)}
                        />
                      </span>
                    </label>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: 6,
                  textAlign: "right",
                  fontSize: 11,
                }}
              >
                <button
                  type="button"
                  onClick={closeDetails}
                  style={{
                    border: "none",
                    background: "none",
                    color: "#6B7280",
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 11,
                  }}
                >
                  閉じる
                </button>
              </div>
            </details>
          );
        })}
      </div>

      <div style={{ marginTop: 8, fontSize: 11, color: "#9CA3AF" }}>
        <a href="/help" style={{ color: "#2563EB", textDecoration: "underline" }}>
          対象外設定についてのヘルプ
        </a>
      </div>
    </div>
  );
}
