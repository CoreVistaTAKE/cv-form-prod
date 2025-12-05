"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useBuilderStore } from "@/store/builder";
import { applyTheme, type Theme } from "@/utils/theme";
import BuildingFolderPanel from "../_components/BuildingFolderPanel";
import BuildStatus from "../_components/BuildStatus.client";

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
  const builder = useBuilderStore();

  // ===== 初期化（ローカルは補助。真実はサーバ） =====
  useEffect(() => {
    builder.initOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== registry（OneDrive一覧＝Flow由来）=====
  const [lookUser] = useState<string>(ENV_DEFAULT_USER);
  const [registryItems, setRegistryItems] = useState<RegistryItem[]>([]);
  const [picked, setPicked] = useState<string>(""); // token を選択
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [intakeMsg, setIntakeMsg] = useState("");

  // 現在 builder にロード済みの token
  const [loadedToken, setLoadedToken] = useState<string>(""); // "BaseSystem" or token
  const isBaseMode = loadedToken === "BaseSystem";

  // 下段ステータス（URL/QR）
  const [statusInfo, setStatusInfo] = useState<StatusInfo | null>(null);

  // ===== BaseSystem をサーバから読む（localStorageを真実にしない）=====
  const loadBaseSilently = useCallback(async () => {
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

      builder.hydrateFrom(j.schema);

      // meta 正規化（空配列もそのまま正）
      const n = normalizeMeta(j.schema?.meta);
      builder.setMeta({
        excludePages: n.excludePages,
        excludeFields: n.excludeFields,
        ...(n.theme ? { theme: n.theme } : {}),
      });

      setLoadedToken("BaseSystem");
      setStatusInfo(null);

      // プレビュー用にテーマ適用（運用AでもUX的に必要）
      applyTheme(n.theme || builder.meta.theme);
    } catch (e: any) {
      setIntakeMsg(e?.message || String(e));
    } finally {
      setIntakeBusy(false);
    }
  }, [builder, lookUser]);

  // 初回に base をロード
  useEffect(() => {
    void loadBaseSilently();
  }, [loadBaseSilently]);

  // ===== 一覧取得 =====
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

  useEffect(() => {
    void reloadBuildings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 建物（既存）を読み込む：運用Aなので “閲覧専用” =====
  async function loadSelected() {
    if (!picked) return;
    setIntakeMsg("");
    setIntakeBusy(true);
    try {
      const r = await fetch("/api/forms/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ varUser: lookUser, varBldg: picked }), // varBldg=token（既存API互換）
      });

      const t = await r.text();
      if (!r.ok) throw new Error(`read HTTP ${r.status} ${t}`);
      const j = JSON.parse(t);
      if (!j?.schema) throw new Error("schema が空です");

      builder.hydrateFrom(j.schema);

      // meta 正規化して builder.meta に反映（ただし運用Aなので保存はしない）
      const n = normalizeMeta(j.schema?.meta);
      builder.setMeta({
        excludePages: n.excludePages,
        excludeFields: n.excludeFields,
        ...(n.theme ? { theme: n.theme } : {}),
      });

      setLoadedToken(picked);

      // statusPath は registryItems（OneDrive正）から引く
      const hit = registryItems.find((x) => x.token === picked);
      if (hit?.statusPath) {
        setStatusInfo({
          user: lookUser,
          bldg: hit.bldg || "",
          statusPath: hit.statusPath,
          token: hit.token,
        });
      } else {
        setStatusInfo(null);
      }

      // 表示テーマを適用
      applyTheme(n.theme || builder.meta.theme);

      alert(`読込完了（閲覧専用）: ${picked}`);
    } catch (e: any) {
      setIntakeMsg(e?.message || String(e));
    } finally {
      setIntakeBusy(false);
    }
  }

  async function resetToBase() {
    await loadBaseSilently();
    alert("BaseSystem（標準フォーム）を読み込みました。");
  }

  // ===== カラー（運用A：BaseSystem（作成用）でのみ変更可） =====
  const themeItems: { k: Theme; name: string; bg: string; fg: string; border: string }[] = [
    { k: "white", name: "白", bg: "#ffffff", fg: "#111111", border: "#d9dfec" },
    { k: "black", name: "黒", bg: "#141d3d", fg: "#eef3ff", border: "#2b3a6f" },
    { k: "red", name: "赤", bg: "#fc8b9b", fg: "#2a151a", border: "#4b2a32" },
    { k: "blue", name: "青", bg: "#7fb5ff", fg: "#112449", border: "#254072" },
    { k: "yellow", name: "黄", bg: "#ffd75a", fg: "#332f12", border: "#4d4622" },
    { k: "green", name: "緑", bg: "#5ce0b1", fg: "#0f241e", border: "#234739" },
  ];

  // ===== 対象外(非適用) UI（運用A：BaseSystem（作成用）でのみ変更可） =====
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
    () => new Set<string>(safeArrayOfString(builder.meta.excludePages)),
    [builder.meta.excludePages],
  );
  const excludedFields = useMemo(
    () => new Set<string>(safeArrayOfString(builder.meta.excludeFields)),
    [builder.meta.excludeFields],
  );

  const commitExclude = (nextPages: Set<string>, nextFields: Set<string>) => {
    if (!isBaseMode) return; // ★運用A：既存フォームは編集不可
    builder.setMeta({
      excludePages: Array.from(nextPages),
      excludeFields: Array.from(nextFields),
    });
  };

  const toggleSectionExclude = (pageId: string, fieldIds: string[]) => {
    if (!isBaseMode) return; // ★運用A
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
    if (!isBaseMode) return; // ★運用A
    const nextPages = new Set(excludedPages);
    const nextFields = new Set(excludedFields);

    if (nextFields.has(fid)) nextFields.delete(fid);
    else nextFields.add(fid);

    commitExclude(nextPages, nextFields);
  };

  // ===== Create 用に渡す meta（空配列でも必ず渡す）=====
  const metaForCreate = useMemo(() => {
    const excludePages = safeArrayOfString(builder.meta.excludePages);
    const excludeFields = safeArrayOfString(builder.meta.excludeFields);
    const theme = typeof builder.meta.theme === "string" ? builder.meta.theme : undefined;
    return { excludePages, excludeFields, theme };
  }, [builder.meta.excludePages, builder.meta.excludeFields, builder.meta.theme]);

  const modeBadge = useMemo(() => {
    if (!loadedToken) return <span className="text-xs text-slate-500">モード: 初期化中</span>;
    if (loadedToken === "BaseSystem") return <span className="text-xs text-green-700">モード: 新規作成（編集可）</span>;
    return <span className="text-xs text-red-600">モード: 既存フォーム閲覧（編集不可）</span>;
  }, [loadedToken]);

  return (
    <div className="space-y-6">
      {/* Intake */}
      <SectionCard
        id="intake"
        title="建物用フォームを読み込む（OneDrive一覧＝Flow由来）"
        right={<div className="flex items-center gap-2">{modeBadge}</div>}
      >
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
            読込（閲覧）
          </button>
          <button className="btn-secondary" onClick={reloadBuildings} disabled={intakeBusy}>
            再取得
          </button>
          <button className="btn-secondary" onClick={resetToBase} disabled={intakeBusy}>
            作成モードへ戻す（BaseSystem）
          </button>

          {intakeMsg && <span className="text-red-500 text-xs whitespace-pre-wrap">{intakeMsg}</span>}
        </div>

        {!isBaseMode && (
          <div className="text-xs text-slate-500 mt-2">
            ※運用A：既存フォームは閲覧専用です。テーマ／対象外設定は編集できません（作成時に確定）。
          </div>
        )}
      </SectionCard>

      {/* フォームカラー */}
      <SectionCard id="color" title="フォームカラー設定（作成時にだけ反映）">
        <div className="text-xs text-slate-500 mb-2">
          運用A：この画面で設定した theme は <b>新規フォルダ作成時の form JSON にだけ書き込み</b>ます。
          既存フォルダ（既存フォーム）の theme は変更できません。
        </div>

        <div className="flex items-center" style={{ gap: 8, flexWrap: "wrap" }}>
          {themeItems.map((t) => (
            <button
              key={t.k}
              className="btn"
              style={{ background: t.bg, color: t.fg, border: `1px solid ${t.border}`, opacity: isBaseMode ? 1 : 0.5 }}
              disabled={!isBaseMode}
              onClick={() => {
                if (!isBaseMode) return;
                builder.setMeta({ theme: t.k });
                applyTheme(t.k);
              }}
              title={isBaseMode ? "作成時の theme を設定" : "既存フォームは変更不可（運用A）"}
            >
              {t.name}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* 対象外 */}
      <SectionCard id="exclude" title="対象外(非適用)設定（作成時にだけ反映）">
        <div className="text-xs text-slate-500 mb-2">
          運用A：この設定は <b>新規作成時にだけ form JSON（schema.meta.excludePages / excludeFields）へ書き込み</b>ます。
          <br />
          既存フォームに対して後から反映する “保存導線（update）” は存在しません（＝固定）。
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
                    disabled={!isBaseMode}
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
                      opacity: isBaseMode ? 1 : 0.5,
                    }}
                    title={isBaseMode ? "作成時の exclude を設定" : "既存フォームは変更不可（運用A）"}
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
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  padding: "2px 6px",
                                  borderRadius: 9999,
                                  backgroundColor: fExcluded ? "#fee2e2" : "#dcfce7",
                                  color: fExcluded ? "#b91c1c" : "#166534",
                                  border: `1px solid ${fExcluded ? "#fecaca" : "#bbf7d0"}`,
                                  opacity: isBaseMode ? 1 : 0.5,
                                }}
                              >
                                {fExcluded ? "非表示" : "表示中"}
                              </span>
                              <input
                                type="checkbox"
                                checked={fExcluded}
                                disabled={!isBaseMode}
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
      </SectionCard>

      {/* 建物フォルダ作成 */}
      <SectionCard id="folder" title="建物フォルダ作成（作成時に meta を確定）">
        {!isBaseMode ? (
          <div className="text-xs text-slate-500">
            既存フォーム閲覧モードでは作成を行いません（事故防止）。
            <br />
            「作成モードへ戻す（BaseSystem）」を押してから新規作成してください。
          </div>
        ) : (
          <BuildingFolderPanel
            defaultUser={lookUser}
            excludePages={metaForCreate.excludePages}
            excludeFields={metaForCreate.excludeFields}
            theme={metaForCreate.theme as Theme | undefined}
            onBuilt={(info) => {
              // create後は status を即表示
              setStatusInfo({
                user: info.user,
                bldg: info.bldg,
                statusPath: info.statusPath,
                token: info.token,
              });

              // 一覧も更新して選択肢に反映
              void reloadBuildings();

              // UX：作ったtokenを選択状態にしておく（ただし読むのは手動）
              setPicked(info.token || "");
            }}
          />
        )}
      </SectionCard>

      {/* ステータス */}
      <SectionCard id="status" title="ステータス（URL/QR）">
        {statusInfo?.statusPath ? (
          <BuildStatus
            user={statusInfo.user}
            bldg={statusInfo.bldg}
            statusPath={statusInfo.statusPath}
            justTriggered={false}
          />
        ) : (
          <div className="text-xs text-slate-500">
            「建物フォルダ作成」を実行すると、ここに status が表示されます。
          </div>
        )}
      </SectionCard>
    </div>
  );
}
