// app/fill/FillClient.tsx
"use client";
import React from "react";
import { Wizard } from "@/components/Wizard";
import { useBuilderStore } from "@/store/builder";

type Props = { user?: string; bldg?: string; host?: string };

export default function FillClient({ user, bldg }: Props) {
  const builder = useBuilderStore();
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // 直指定：JSON を読み込んでから Wizard
  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user || !bldg) return;
      setError(null); setReady(false);
      try {
        // 1) 建物一覧から該当 token を特定（最新優先）
        const r = await fetch("/api/registry/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ varUser: user }),
        });
        if (!r.ok) throw new Error(`/api/registry/lookup 失敗: ${r.status}`);
        const j = await r.json();
        const items: any[] = Array.isArray(j?.buildings) ? j.buildings : [];
        // bldg 名一致を上から探す
        const hit = items.find(x => (x?.bldg||"") === bldg);
        if (!hit?.schemaPath) throw new Error(`建物「${bldg}」の schemaPath が見つかりません。`);

        // 2) JSON 本体を取得
        const rr = await fetch("/api/forms/read", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ formPath: hit.schemaPath }),
        });
        if (!rr.ok) throw new Error(`/api/forms/read 失敗: ${rr.status}`);
        const jj = await rr.json();
        const schema = jj?.json;
        if (!schema || typeof schema !== "object") throw new Error("JSON が空、または不正です。");

        // 3) Builder を初期化
        builder.hydrateFrom(schema);
        if (!cancelled) setReady(true);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, bldg]);

  if (user && bldg) {
    if (error) return <div className="card"><div className="form-text text-red-600">{error}</div></div>;
    if (!ready) return <div className="card"><div className="form-text">フォームを読み込んでいます…</div></div>;
    return <Wizard />;
  }

  // ===== クエリ無し：従来のローカル選択 UI =====
  const [pickedBldg, setPickedBldg] = React.useState("");
  const [formUrl, setFormUrl] = React.useState("");
  const options = React.useMemo<string[]>(() => {
    try { const raw = localStorage.getItem("cv_building_options") || "[]"; const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
  }, []);
  const urlMap = React.useMemo<Record<string, string>>(() => {
    try { const raw = localStorage.getItem("cv_form_urls") || "{}"; const obj = JSON.parse(raw); return obj && typeof obj === "object" ? obj : {}; } catch { return {}; }
  }, []);
  React.useEffect(() => {
    try { const last = localStorage.getItem("cv_last_building") || "";
      const init = last || (options.length ? options[0] : "");
      setPickedBldg(init); setFormUrl(init ? urlMap[init] || "" : ""); } catch {}
  }, [options, urlMap]);
  React.useEffect(() => { setFormUrl(pickedBldg ? urlMap[pickedBldg] || "" : ""); }, [pickedBldg, urlMap]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          建物：
          <select value={pickedBldg} onChange={(e)=>setPickedBldg(e.target.value)}
            style={{ marginLeft: 8, padding: "6px 10px", border: "1px solid #E5E7EB", borderRadius: 6 }}>
            {options.length === 0 ? <option value="">（建物がありません）</option> : options.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        {formUrl && <a className="btn" href={formUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
          この建物のフォームを新しいタブで開く
        </a>}
      </div>
      {formUrl ? (
        <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden", height: "70vh" }}>
          <iframe src={formUrl} style={{ width: "100%", height: "100%", border: 0 }} title="building-form" />
        </div>
      ) : (
        <div className="card"><div className="form-text">まず「ユーザー用ビルダー → 建物フォルダ作成」で建物を作成してください。</div></div>
      )}
    </div>
  );
}
