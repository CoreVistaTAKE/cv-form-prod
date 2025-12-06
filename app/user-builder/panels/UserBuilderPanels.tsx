// app/user-builder/panels/UserBuilderPanels.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useBuilderStore } from "@/store/builder";
import { applyTheme, type Theme } from "@/utils/theme";
import BuildingFolderPanel from "../_components/BuildingFolderPanel";

function SectionCard({
  id,
  title,
  right,
  children,
}: {
  id?: string;
  title: string;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section id={id} className="card">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="form-title">{title}</div>
        {right}
      </div>
      {children}
    </section>
  );
}

type BuiltInfo = {
  user: string;
  bldg: string;
  /** Flow が必ず返すはずだが、型としては欠けても落ちないように optional にする */
  token?: string;
  statusPath?: string;
  traceId?: string;
};

const ENV_DEFAULT_USER = process.env.NEXT_PUBLIC_DEFAULT_USER || "FirstService";

function safeArrayOfString(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string" && x.trim())
    .map((x) => x.trim());
}

function normalizeMeta(maybeMeta: any) {
  const excludePages = safeArrayOfString(maybeMeta?.excludePages);
  const excludeFields = safeArrayOfString(maybeMeta?.excludeFields);
  const theme = typeof maybeMeta?.theme === "string" ? (maybeMeta.theme as Theme) : undefined;
  return { excludePages, excludeFields, theme };
}

export default function UserBuilderPanels() {
  // Zustand は「全state購読」だとループの火種になるので selector で必要分のみ
  const initOnce = useBuilderStore((s) => s.initOnce);
  const hydrateFrom = useBuilderStore((s) => s.hydrateFrom);
  const setMeta = useBuilderStore((s) => s.setMeta);

  const pages = useBuilderStore((s) => s.pages) as any[];
  const fields = useBuilderStore((s) => s.fields) as any[];
  const metaTheme = useBuilderStore((s) => s.meta.theme) as Theme | undefined;
  const metaExcludePages = useBuilderStore((s) => s.meta.excludePages);
  const metaExcludeFields = useBuilderStore((s) => s.meta.excludeFields);

  const [lookUser] = useState<string>(ENV_DEFAULT_USER);

  // 作成結果（ステータス表示用に最小限保持）
  const [built, setBuilt] = useState<BuiltInfo | null>(null);

  // BaseSystem ロード状態（運用A：作成時のみ編集可）
  const [baseReady, setBaseReady] = useState(false);
  const [bootErr, setBootErr] = useState<string>("");

  useEffect(() => {
    initOnce();
  }, [initOnce]);

  // テーマ適用（meta.theme 変更時）
  useEffect(() => {
    applyTheme((metaTheme as Theme) || "black");
  }, [metaTheme]);

  // BaseSystem を読む（作成の前提）
  const loadBaseOnce = useCallback(async () => {
    setBootErr("");
    try {
      const r = await fetch("/api/forms/read-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ varUser: lookUser }),
      });
      const t = await r.text();
      if (!r.ok) throw new Error(`read-base HTTP ${r.status} ${t}`);

      const j = JSON.parse(t);
      if (!j?.schema) throw new Error("schema が空です");

      hydrateFrom(j.schema);

      const n = normalizeMeta(j.schema?.meta);
      setMeta({
        excludePages: n.excludePages,
        excludeFields: n.excludeFields,
        ...(n.theme ? { theme: n.theme } : {}),
      });

      setBaseReady(true);
    } catch (e: any) {
      setBootErr(e?.message || String(e));
      setBaseReady(false);
    }
  }, [hydrateFrom, setMeta, lookUser]);

  useEffect(() => {
    void loadBaseOnce();
  }, [loadBaseOnce]);

  // ===== フォームカラー（作成時のみ） =====
  const themeItems: { k: Theme; name: string; bg: string; fg: string; border: string }[] = [
    { k: "white", name: "白", bg: "#ffffff", fg: "#111111", border: "#d9dfec" },
    { k: "black", name: "黒", bg: "#141d3d", fg: "#eef3ff", border: "#2b3a6f" },
    { k: "red", name: "赤", bg: "#fc8b9b", fg: "#2a151a", border: "#4b2a32" },
    { k: "blue", name: "青", bg: "#7fb5ff", fg: "#112449", border: "#254072" },
    { k: "yellow", name: "黄", bg: "#ffd75a", fg: "#332f12", border: "#4d4622" },
    { k: "green", name: "緑", bg: "#5ce0b1", fg: "#0f241e", border: "#234739" },
  ];

  // ===== 対象外(非適用) UI =====
  const sectionPages = useMemo(() => pages.filter((p) => p.type === "section"), [pages]);

  const fieldsByPage = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const f of fields) {
      const pid = f.pageId ?? "";
      (m[pid] = m[pid] || []).push(f);
    }
    return m;
  }, [fields]);

  const excludedPages = useMemo(() => new Set<string>(safeArrayOfString(metaExcludePages)), [metaExcludePages]);
  const excludedFields = useMemo(() => new Set<string>(safeArrayOfString(metaExcludeFields)), [metaExcludeFields]);

  const commitExclude = (nextPages: Set<string>, nextFields: Set<string>) => {
    if (!baseReady) return;
    setMeta({
      excludePages: Array.from(nextPages),
      excludeFields: Array.from(nextFields),
    });
  };

  const toggleSectionExclude = (pageId: string, fieldIds: string[]) => {
    if (!baseReady) return;
    const nextPages = new Set(excludedPages);
    const nextFields = new Set(excludedFields);

    const wasExcluded = nextPages.has(pageId);
    if (wasExcluded) {
      nextPages.delete(pageId);
      fieldIds.forEach((id) => nextFields.delete(id));
    } else {
      nextPages.add(pageId);
      fieldIds.forEach((id) => nextFields.add(id));
    }
    commitExclude(nextPages, nextFields);
  };

  const toggleFieldExclude = (fid: string) => {
    if (!baseReady) return;
    const nextPages = new Set(excludedPages);
    const nextFields = new Set(excludedFields);

    if (nextFields.has(fid)) nextFields.delete(fid);
    else nextFields.add(fid);

    commitExclude(nextPages, nextFields);
  };

  // ===== Create 用に渡す meta =====
  const metaForCreate = useMemo(() => {
    const excludePages = safeArrayOfString(metaExcludePages);
    const excludeFields = safeArrayOfString(metaExcludeFields);
    const theme = typeof metaTheme === "string" ? metaTheme : undefined;
    return { excludePages, excludeFields, theme };
  }, [metaExcludePages, metaExcludeFields, metaTheme]);

  return (
    <div className="space-y-6">
      {bootErr && (
        <section className="card">
          <div className="text-red-600 text-sm whitespace-pre-wrap">{bootErr}</div>
          <button className="btn-secondary mt-3" onClick={() => void loadBaseOnce()}>
            BaseSystem を再読込
          </button>
        </section>
      )}

      {/* 建物フォルダを作成する */}
      <SectionCard id="folder" title="建物フォルダを作成する">
        {!baseReady ? (
          <div className="text-xs text-slate-500">BaseSystem を読み込み中です…</div>
        ) : (
          <BuildingFolderPanel
            defaultUser={lookUser}
            excludePages={metaForCreate.excludePages}
            excludeFields={metaForCreate.excludeFields}
            theme={metaForCreate.theme as Theme | undefined}
            onBuilt={(info) => {
              // ★ここがビルドエラー原因だった：info.token が string|undefined
              setBuilt({
                user: info.user,
                bldg: info.bldg,
                token: info.token,
                statusPath: info.statusPath,
                traceId: (info as any)?.traceId,
              });
            }}
          />
        )}
      </SectionCard>

      {/* 対象外(非適用)の設定 */}
      <SectionCard id="exclude" title="対象外(非適用)の設定">
        {!baseReady ? (
          <div className="text-xs text-slate-500">BaseSystem 読み込み後に設定できます。</div>
        ) : (
          <div className="space-y-3">
            {sectionPages.map((p) => {
              const fs = (fieldsByPage[p.id] ?? []) as any[];
              const fids = fs
                .map((f: any, idx: number) => (f.id ?? f.label ?? `f-${idx}`) as string)
                .filter(Boolean);

              const pageExcluded = excludedPages.has(p.id);
              const allFieldExcluded = fids.length > 0 && fids.every((id) => excludedFields.has(id));
              const sectionExcluded = pageExcluded || allFieldExcluded;

              return (
                <details key={p.id} className="border border-slate-300 rounded-md bg-white shadow-sm">
                  <summary className="cursor-pointer flex items-center justify-between px-3 py-2">
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{p.title || "セクション"}</div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleSectionExclude(p.id, fids);
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

                  <div className="px-3 pb-3 pt-2 border-t border-dashed border-slate-200">
                    {fs.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#D1D5DB", marginTop: 4 }}>（項目なし）</div>
                    ) : (
                      <div className="mt-2 space-y-1">
                        {fs.map((f: any, idx: number) => {
                          const fid = (f.id ?? f.label ?? `f-${idx}`) as string;
                          const label = (f.label ?? "(ラベル未設定)") as string;
                          const fExcluded = excludedFields.has(fid);

                          return (
                            <label key={fid} className="flex items-center justify-between" style={{ fontSize: 14 }}>
                              <span>{label}</span>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    padding: "2px 6px",
                                    borderRadius: 9999,
                                    backgroundColor: fExcluded ? "#fee2e2" : "#dcfce7",
                                    color: fExcluded ? "#b91c1c" : "#166534",
                                    border: `1px solid ${fExcluded ? "#fecaca" : "#bbf7d0"}`,
                                  }}
                                >
                                  {fExcluded ? "非表示" : "表示中"}
                                </span>
                                <input type="checkbox" checked={fExcluded} onChange={() => toggleFieldExclude(fid)} />
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
        )}
      </SectionCard>

      {/* フォームカラーの設定 */}
      <SectionCard id="color" title="フォームカラーの設定">
        {!baseReady ? (
          <div className="text-xs text-slate-500">BaseSystem 読み込み後に設定できます。</div>
        ) : (
          <div className="flex items-center" style={{ gap: 8, flexWrap: "wrap" }}>
            {themeItems.map((t) => (
              <button
                key={t.k}
                className="btn"
                style={{ background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}
                onClick={() => {
                  setMeta({ theme: t.k });
                  applyTheme(t.k);
                }}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      {/* 作成後の最小ステータス表示（簡素） */}
      {built ? (
        <section className="card">
          <div className="form-title">作成結果</div>
          <div className="text-sm mt-2 space-y-1">
            <div>
              token: <b>{built.token || "（未取得）"}</b>
            </div>
            <div>
              statusPath: <code>{built.statusPath || "（未取得）"}</code>
            </div>
            {built.traceId ? (
              <div>
                traceId: <code>{built.traceId}</code>
              </div>
            ) : null}
          </div>

          <div className="text-xs text-slate-500 mt-2">
            ※URL/QR/進捗の詳細表示は BuildStatus コンポーネントで表示してください（statusPath が取得できている場合のみ）。
          </div>
        </section>
      ) : null}
    </div>
  );
}
