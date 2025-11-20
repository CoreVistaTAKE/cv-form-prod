"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useBuilderStore } from "@/store/builder";
import { applyTheme } from "@/utils/theme";
import BuildStatus from "../_components/BuildStatus.client";

type Props = {
  createUrl: string;
  statusUrl: string;
  defaultUser?: string | null;
  defaultHost?: string | null;
};

type LookupItem = {
  bldg: string;        // 建物名
  token?: string;      // user_seq_bldg
  statusPath?: string; // /drive/root:.../form/status.json
  schemaPath?: string; // /drive/root:.../form_base_*.json or form_ready.json
};

export default function UserBuilderPanels({
  createUrl,
  statusUrl,
  defaultUser,
  defaultHost,
}: Props) {
  const builder = useBuilderStore();

  // ===== 初期化 =====
  useEffect(() => { builder.initOnce(); }, []);
  useEffect(() => { applyTheme(builder.meta.theme); }, [builder.meta.theme]);

  const user = (defaultUser || process.env.NEXT_PUBLIC_DEFAULT_USER || "form_PJ1").toString();

  // ===== 建物一覧の取得（Registry） =====
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<LookupItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const loadBuildings = async () => {
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/registry/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ varUser: user }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`lookup HTTP ${res.status} ${t}`);
      }
      const json = await res.json();
      const arr: LookupItem[] = Array.isArray(json?.items) ? json.items : [];
      // BaseSystem を除外
      const filtered = arr.filter((x) => (x?.bldg || "").toLowerCase() !== "basesystem");
      setItems(filtered);
    } catch (e:any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBuildings(); /* 初回自動 */ }, []);

  // ===== 建物を選択 → JSON 読込 → ストア反映 =====
  const [picked, setPicked] = useState<string>("");
  const pickedInfo = useMemo(() => items.find(x => x.bldg === picked), [items, picked]);
  const [statusPath, setStatusPath] = useState<string | undefined>();

  const onLoadFormJson = async () => {
    if (!picked) return;
    setErr(null);
    try {
      // schemaPath が無い場合でも {varUser,varBldg} で /api/forms/read が最適解を返す想定
      const res = await fetch("/api/forms/read", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          varUser: user,
          varBldg: picked,
          schemaPath: pickedInfo?.schemaPath || undefined,
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`read HTTP ${res.status} ${t}`);
      }
      const json = await res.json();
      // { meta, pages, fields } をストアへ流し込む
      if (!json?.meta || !Array.isArray(json?.pages) || !Array.isArray(json?.fields)) {
        throw new Error("フォーム JSON の形式が不正です（meta/pages/fields が不足）");
      }
      builder.hydrateFrom(json);
      // ステータスの path を保持（表示パネルに渡す）
      const st = pickedInfo?.statusPath || json?.statusPath;
      if (st) setStatusPath(st);
      alert(`「${picked}」のフォームを読み込みました。`);
    } catch (e:any) {
      setErr(e?.message || String(e));
    }
  };

  return (
    <div className="space-y-6">
      {/* 1) 建物選択＋読込 */}
      <section className="card">
        <div className="form-title mb-2">建物用フォームを読み込む（サーバ上の JSON）</div>
        <div className="flex items-center gap-2" style={{flexWrap:"wrap"}}>
          <select
            className="input"
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            style={{minWidth:220}}
            disabled={loading}
          >
            <option value="">{loading ? "読み込み中..." : "建物を選択"}</option>
            {items.map((x) => (
              <option key={x.bldg} value={x.bldg}>{x.bldg}</option>
            ))}
          </select>
          <button className="btn" onClick={onLoadFormJson} disabled={!picked || loading}>読込</button>
          <button className="btn-secondary" onClick={loadBuildings} disabled={loading}>再取得</button>
          {err && <span className="text-red-500 text-xs whitespace-pre-wrap">{err}</span>}
        </div>
      </section>

      {/* 2) ステータス（進捗バー＋URL/QR） */}
      <section className="card">
        <div className="form-title mb-2">ステータス</div>
        <BuildStatus
          user={user}
          bldg={picked || undefined}
          statusPath={statusPath}
          statusUrl={statusUrl}
          justTriggered={false}
        />
      </section>
    </div>
  );
}
