"use client";

import React from "react";
import { useBuilderStore } from "@/store/builder";
import BuildingFolderPanel from "../_components/BuildingFolderPanel";
import BuildStatus from "../_components/BuildStatus.client";

type Props = {
  createUrl: string;
  statusUrl: string;
  defaultUser?: string | null;
  defaultHost?: string | null;
};

export default function UserBuilderPanels({
  createUrl,
  statusUrl,
  defaultUser,
  defaultHost,
}: Props) {
  const builder = useBuilderStore();

  // 元データ
  const pages = builder.pages || [];
  const fields = builder.fields || [];

  // セクションページのみ
  const sectionPages = React.useMemo(
    () => pages.filter((p: any) => p?.type === "section"),
    [pages]
  );

  // pageId ごとにフィールド配列をまとめる
  const fieldsByPage = React.useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const f of fields as any[]) {
      const pid = f?.pageId ?? "";
      if (!map[pid]) map[pid] = [];
      map[pid].push(f);
    }
    return map;
  }, [fields]);

  // 対象外のローカル管理（※今は保存しない）
  const [excludedPages, setExcludedPages] = React.useState<Set<string>>(
    () => new Set()
  );
  const [excludedFields, setExcludedFields] = React.useState<Set<string>>(
    () => new Set()
  );

  const toggleSection = (pageId: string, fieldIds: string[]) => {
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

  const toggleField = (fid: string) => {
    setExcludedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fid)) next.delete(fid);
      else next.add(fid);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* 1) 対象外(非適用)設定 */}
      <section id="exclude" className="card">
        <div className="form-title mb-2">対象外(非適用)設定</div>
        <div className="text-xs text-slate-500 mb-2">
          セクション単位／項目単位で切替可能です。緑＝表示中、赤＝非表示。
        </div>

        <div className="space-y-3">
          {sectionPages.map((p: any) => {
            const pageId = p.id as string;
            const fs = (fieldsByPage[pageId] ?? []) as any[];

            const fieldIds = fs
              .map((f: any, idx: number) => (f.id ?? f.label ?? `f-${idx}`) as string)
              .filter(Boolean);

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
                    {/* 大項目名：太字＋やや大きめ */}
                    <div style={{ fontSize: 16, fontWeight: 700 }}>
                      {p.title || "セクション"}
                    </div>
                    {p.description && (
                      <div style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>
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
                      toggleSection(pageId, fieldIds);
                    }}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 9999,
                      border: `1px solid ${sectionExcluded ? "#fecaca" : "#bbf7d0"}`,
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
                    <div style={{ fontSize: 12, color: "#D1D5DB", marginTop: 4 }}>
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
                            style={{ fontSize: 14 }}
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
                                  backgroundColor: fExcluded ? "#fee2e2" : "#dcfce7",
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
                                onChange={() => toggleField(fid)}
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

      {/* 2) 建物フォルダ作成とURL発行 */}
      <section id="folder" className="card">
        <div className="form-title mb-2">建物フォルダ作成とURL発行</div>
        <BuildingFolderPanel
          createUrl={createUrl}
          statusUrl={statusUrl}
          defaultUser={defaultUser}
          defaultHost={defaultHost}
        />
      </section>

      {/* 3) ステータス（進捗バーと QR 表示は BuildStatus 側に委譲） */}
      <section id="status" className="card">
        <div className="form-title mb-2">ステータス</div>
        <BuildStatus
          user={defaultUser || "form_PJ1"}
          bldg={"テストビルA"}
          justTriggered={false}
          statusUrl={statusUrl}
        />
      </section>
    </div>
  );
}
