"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useBuilderStore } from "@/store/builder";
import { applyTheme, type Theme } from "@/utils/theme";
import BuildingFolderPanel from "../_components/BuildingFolderPanel";
import BuildStatus from "../_components/BuildStatus.client";

function SectionCard({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <section id={id} className="card">
      <div className="form-title mb-2">{title}</div>
      {children}
    </section>
  );
}

type RegistryItem = {
  token: string; // FirstService_001_テストビルA
  seq?: string;
  bldg?: string;
  statusPath?: string;
  formFolderRel?: string;
  schemaPath?: string;
  urlPath?: string;
  qrPath?: string;
};

type StatusInfo = {
  user?: string;
  bldg?: string;
  statusPath?: string;
  token?: string;
};

const ENV_DEFAULT_USER = process.env.NEXT_PUBLIC_DEFAULT_USER || "FirstService";

function safeArrayOfString(v: any): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim());
}

/**
 * scoped exclude
 * key: cv_exclude_v1::${user}::${folderToken}
 */
const EXCLUDE_SCOPE_PREFIX = "cv_exclude_v1";
type ScopedExclude = { excludePages: string[]; excludeFields: string[] };

function excludeScopeKey(user: string, folderToken: string) {
  return `${EXCLUDE_SCOPE_PREFIX}::${user}::${folderToken}`;
}

function loadScopedExclude(user?: string, folderToken?: string): ScopedExclude | null {
  if (!user || !folderToken) return null;
  try {
    const raw = localStorage.getItem(excludeScopeKey(user, folderToken));
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const excludePages = safeArrayOfString(obj?.excludePages);
    const excludeFields = safeArrayOfString(obj?.excludeFields);
    if (!excludePages.length && !excludeFields.length) return null;
    return { excludePages, excludeFields };
  } catch {
    return null;
  }
}

function saveScopedExclude(
  user?: string,
  folderToken?: string,
  excludePages?: string[],
  excludeFields?: string[],
) {
  if (!user || !folderToken) return;
  try {
    localStorage.setItem(
      excludeScopeKey(user, folderToken),
      JSON.stringify({
        excludePages: Array.isArray(excludePages) ? excludePages : [],
        excludeFields: Array.isArray(excludeFields) ? excludeFields : [],
      }),
    );
  } catch {
    // ignore
  }
}

export default function UserBuilderPanels() {
  const builder = useBuilderStore();

  // ===== 初期化 =====
  useEffect(() => {
    builder.initOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cv_form_base_v049");
      if (raw) builder.hydrateFrom(JSON.parse(raw));
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builder.hydrateFrom]);

  useEffect(() => {
    applyTheme(builder.meta.theme);
  }, [builder.meta.theme]);

  // ===== registry（OneDrive由来）=====
  const [lookUser] = useState<string>(ENV_DEFAULT_USER);
  const [registryItems, setRegistryItems] = useState<RegistryItem[]>([]);
  const [picked, setPicked] = useState<string>("");
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [intakeMsg, setIntakeMsg] = useState("");

  // 「いま画面にロードされているschema」がどの token のものか（exclude scope）
  const [loadedFolderToken, setLoadedFolderToken] = useState<string>("");

  // 下段ステータス（URL/QR）
  const [statusInfo, setStatusInfo] = useState<StatusInfo | null>(null);

  async function reloadBuildings() {
    setIntakeMsg("");
    setIntakeBusy(true);
    try {
      const r = await fetch("/api/registry/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ varUser: lookUser }),
      });
      const t = await r.text();
      if (!r.ok) throw new Error(`lookup HTTP ${r.status} ${t}`);
      const j = JSON.parse(t);

      const items: RegistryItem[] = Array.isArray(j?.items) ? j.items : [];
      setRegistryItems(items);

      const options = items.map((x) => x.token).filter(Boolean);
      setPicked((prev) => (prev && options.includes(prev) ? prev : options[0] || ""));
      setIntakeMsg("");
    } catch (e: any) {
      setIntakeMsg(e?.message || String(e));
    } finally {
      setIntakeBusy(false);
    }
  }

  // 初回に一覧を取る（UX向上。localStorage依存は削除）
  useEffect(() => {
    void reloadBuildings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSelected() {
    if (!picked) return;
    setIntakeMsg("");
    setIntakeBusy(true);
    try {
      const r = await fetch("/api/forms/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ varUser: lookUser, varBldg: picked }),
      });

      const t = await r.text();
      if (!r.ok) throw new Error(`read HTTP ${r.status} ${t}`);
      const j = JSON.parse(t);
      if (!j?.schema) throw new Error("schema が空です");

      localStorage.setItem("cv_form_base_v049", JSON.stringify(j.schema));
      builder.hydrateFrom(j.schema);

      setLoadedFolderToken(picked);

      // exclude適用（優先：schema.meta → scoped localStorage）
      try {
        const schemaMeta: any = j.schema?.meta || {};
        const schemaExcludePages = safeArrayOfString(schemaMeta?.excludePages);
        const schemaExcludeFields = safeArrayOfString(schemaMeta?.excludeFields);

        if (schemaExcludePages.length || schemaExcludeFields.length) {
          saveScopedExclude(lookUser, picked, schemaExcludePages, schemaExcludeFields);
          builder.setMeta({ excludePages: schemaExcludePages, excludeFields: schemaExcludeFields });
        } else {
          const scoped = loadScopedExclude(lookUser, picked);
          if (scoped) builder.setMeta({ excludePages: scoped.excludePages, excludeFields: scoped.excludeFields });
        }
      } catch {
        // ignore
      }

      // ★重要：statusPath は registryItems（=OneDrive正）から引く。localStorageに依存しない。
      const hit = registryItems.find((x) => x.token === picked);
      if (hit?.statusPath) {
        setStatusInfo({ user: lookUser, bldg: hit.bldg || "", statusPath: hit.statusPath, token: hit.token });
      } else {
        setStatusInfo(null);
      }

      alert(`読込完了: ${picked}`);
    } catch (e: any) {
      setIntakeMsg(e?.message || String(e));
    } finally {
      setIntakeBusy(false);
    }
  }

  async function resetToBase() {
    setIntakeMsg("");
    setIntakeBusy(true);
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

      localStorage.setItem("cv_form_base_v049", JSON.stringify(j.schema));
      builder.hydrateFrom(j.schema);

      setLoadedFolderToken("BaseSystem");
      setStatusInfo(null);

      // BaseSystem でも scoped を拾う（暫定）
      try {
        const schemaMeta: any = j.schema?.meta || {};
        const schemaExcludePages = safeArrayOfString(schemaMeta?.excludePages);
        const schemaExcludeFields = safeArrayOfString(schemaMeta?.excludeFields);

        if (schemaExcludePages.length || schemaExcludeFields.length) {
          saveScopedExclude(lookUser, "BaseSystem", schemaExcludePages, schemaExcludeFields);
          builder.setMeta({ excludePages: schemaExcludePages, excludeFields: schemaExcludeFields });
        } else {
          const scoped = loadScopedExclude(lookUser, "BaseSystem");
          if (scoped) builder.setMeta({ excludePages: scoped.excludePages, excludeFields: scoped.excludeFields });
        }
      } catch {
        // ignore
      }

      alert("BaseSystem（標準フォーム）を読み込みました。");
    } catch (e: any) {
      setIntakeMsg(e?.message || String(e));
    } finally {
      setIntakeBusy(false);
    }
  }

  // ===== カラー設定 =====
  const themeItems: { k: Theme; name: string; bg: string; fg: string; border: string }[] = [
    { k: "white", name: "白", bg: "#ffffff", fg: "#111111", border: "#d9dfec" },
    { k: "black", name: "黒", bg: "#141d3d", fg: "#eef3ff", border: "#2b3a6f" },
    { k: "red", name: "赤", bg: "#fc8b9b", fg: "#2a151a", border: "#4b2a32" },
    { k: "blue", name: "青", bg: "#7fb5ff", fg: "#112449", border: "#254072" },
    { k: "yellow", name: "黄", bg: "#ffd75a", fg: "#332f12", border: "#4d4622" },
    { k: "green", name: "緑", bg: "#5ce0b1", fg: "#0f241e", border: "#234739" },
  ];

  // ===== 対象外(非適用) UI =====
  const pages = builder.pages as any[];
  const fields = builder.fields as any[];

  const sectionPages = useMemo(() => pages.filter((p) => p.type === "section"), [pages]);

  const fieldsByPage = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const f of fields) {
      const pid = f.pageId ?? "";
      (m[pid] = m[pid] || []).push(f);
    }
    return m;
  }, [fields]);

  const excludedPages = useMemo(
    () => new Set<string>(Array.isArray(builder.meta.excludePages) ? builder.meta.excludePages : []),
    [builder.meta.excludePages],
  );
  const excludedFields = useMemo(
    () => new Set<string>(Array.isArray(builder.meta.excludeFields) ? builder.meta.excludeFields : []),
    [builder.meta.excludeFields],
  );

  const commitExclude = (nextPages: Set<string>, nextFields: Set<string>) => {
    const excludePagesArr = Array.from(nextPages);
    const excludeFieldsArr = Array.from(nextFields);

    builder.setMeta({ excludePages: excludePagesArr, excludeFields: excludeFieldsArr });

    // legacy互換（残す）
    try {
      localStorage.setItem("cv_excluded_pages", JSON.stringify(excludePagesArr));
      localStorage.setItem("cv_excluded_fields", JSON.stringify(excludeFieldsArr));
    } catch {
      // ignore
    }

    const tokenForScope = (loadedFolderToken || picked || "BaseSystem").trim();
    saveScopedExclude(lookUser, tokenForScope, excludePagesArr, excludeFieldsArr);
  };

  const toggleSectionExclude = (pageId: string, fieldIds: string[]) => {
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
    const nextPages = new Set(excludedPages);
    const nextFields = new Set(excludedFields);

    if (nextFields.has(fid)) nextFields.delete(fid);
    else nextFields.add(fid);

    commitExclude(nextPages, nextFields);
  };

  return (
    <div className="space-y-6">
      {/* Intake */}
      <SectionCard id="intake" title="建物用フォームを読み込む（OneDrive一覧＝Flow由来）">
        <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
          <select
            className="input"
            style={{ minWidth: 320 }}
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
          >
            {registryItems.length === 0 ? (
              <option value="">（建物がありません）</option>
            ) : (
              registryItems.map((x) => (
                <option key={x.token} value={x.token}>
                  {x.token}
                </option>
              ))
            )}
          </select>
          <button className="btn" onClick={loadSelected} disabled={!picked || intakeBusy}>
            読込
          </button>
          <button className="btn-secondary" onClick={reloadBuildings} disabled={intakeBusy}>
            再取得
          </button>
          <button className="btn-secondary" onClick={resetToBase} disabled={intakeBusy}>
            リセット（BaseSystem）
          </button>
          {intakeMsg && (
            <span className="text-red-500 text-xs whitespace-pre-wrap">{intakeMsg}</span>
          )}
        </div>
      </SectionCard>

      {/* フォームカラー */}
      <SectionCard id="color" title="フォームカラー設定（フォームに反映）">
        <div className="flex items-center" style={{ gap: 8, flexWrap: "wrap" }}>
          {themeItems.map((t) => (
            <button
              key={t.k}
              className="btn"
              style={{ background: t.bg, color: t.fg, border: `1px solid ${t.border}` }}
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
      </SectionCard>

      {/* 対象外 */}
      <SectionCard id="exclude" title="対象外(非適用)設定">
        <div className="text-xs text-slate-500 mb-2">
          セクション単位・項目単位で「対象外」にできます。緑＝表示中、赤＝非表示。
          <br />
          ※この設定は schema.meta（excludePages / excludeFields）に反映します。
          端末内では建物フォルダごとにも保存します（暫定）。
        </div>

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
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{p.title || "セクション"}</div>
                    {p.description && (
                      <div style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>{p.description}</div>
                    )}
                  </div>
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
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
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
      </SectionCard>

      {/* 建物フォルダ作成 */}
      <SectionCard id="folder" title="建物フォルダ作成とURL発行（Flowはサーバ経由）">
        <BuildingFolderPanel
          defaultUser={lookUser}
          onBuilt={(info) => {
            // create後は status を即表示
            setStatusInfo({ user: info.user, bldg: info.bldg, statusPath: info.statusPath, token: info.token });
            // 一覧も更新して選択肢に反映
            void reloadBuildings();
            // 新規フォルダを選択状態にする（UX）
            setPicked(info.token);
            setLoadedFolderToken(info.token);
          }}
        />
      </SectionCard>

      {/* ステータス */}
      <SectionCard id="status" title="ステータス（URL/QR）">
        {statusInfo?.statusPath ? (
          <BuildStatus user={statusInfo.user} bldg={statusInfo.bldg} statusPath={statusInfo.statusPath} justTriggered={false} />
        ) : (
          <div className="text-xs text-slate-500">
            建物用フォームを読み込む、または「建物フォルダ作成 + URL発行」を実行すると、ここに URL / QR が表示されます。
            <br />
            ※statusPath は OneDrive一覧（Flow）由来なので、端末差は出ません。
          </div>
        )}
      </SectionCard>
    </div>
  );
}
