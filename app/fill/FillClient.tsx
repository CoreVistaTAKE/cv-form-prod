// app/fill/FillClient.tsx
"use client";
import React from "react";
import { Wizard } from "@/components/Wizard";
import { useBuilderStore } from "@/store/builder";

type Props = { user?: string; bldg?: string; host?: string };

export default function FillClient({ user, bldg, host }: Props) {
  const builder = useBuilderStore();
  const [ready, setReady] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // ===== 直指定（/fill?user=&bldg=）なら、先にスキーマを読み込む =====
  React.useEffect(() => {
    let cancelled = false;

    async function boot() {
      // 直指定なし → 旧UI（建物選択UI）へフォールバック
      if (!user || !bldg) {
        setReady(true);
        return;
      }
      setErr(null);
      setReady(false);
      try {
        // forms/read に POST（Flow に依存しないローカルAPI）
        const res = await fetch("/api/forms/read", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ varUser: user, varBldg: bldg, varHost: host || "" }),
          cache: "no-store",
        });
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`forms/read HTTP ${res.status} ${txt}`);
        }
        const data = await res.json().catch(() => ({}));
        const schema = data?.schema || data; // {meta,pages,fields} 直下/入れ子の両対応
        if (!schema?.meta || !schema?.pages || !schema?.fields) {
          throw new Error("フォーム定義が不完全です（meta/pages/fields が不足）");
        }

        // 固定値の注入（建物名など）
        try {
          schema.meta = schema.meta || {};
          if (bldg && !schema.meta.fixedBuilding) schema.meta.fixedBuilding = bldg;
          if (schema.meta.fixedCompany === undefined) schema.meta.fixedCompany = "";
        } catch {}

        if (cancelled) return;
        builder.hydrateFrom(schema);
        setReady(true);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || String(e));
      }
    }

    boot();
    return () => {
      cancelled = true;
    };
  }, [user, bldg, host, builder]);

  // ===== 直指定が無いときは従来の建物選択UI =====
  if (!user || !bldg) {
    const [pickedBldg, setPickedBldg] = React.useState("");
    const [formUrl, setFormUrl] = React.useState("");

    const options = React.useMemo<string[]>(() => {
      try { return JSON.parse(localStorage.getItem("cv_building_options") || "[]") || []; }
      catch { return []; }
    }, []);

    const urlMap = React.useMemo<Record<string, string>>(() => {
      try { return JSON.parse(localStorage.getItem("cv_form_urls") || "{}") || {}; }
      catch { return {}; }
    }, []);

    React.useEffect(() => {
      try {
        const last = localStorage.getItem("cv_last_building") || "";
        const init = last || (options.length ? options[0] : "");
        setPickedBldg(init);
        setFormUrl(init ? urlMap[init] || "" : "");
      } catch {}
    }, [options, urlMap]);

    React.useEffect(() => {
      setFormUrl(pickedBldg ? urlMap[pickedBldg] || "" : "");
    }, [pickedBldg, urlMap]);

    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label>
            建物：
            <select
              value={pickedBldg}
              onChange={(e) => setPickedBldg(e.target.value)}
              style={{ marginLeft: 8, padding: "6px 10px", border: "1px solid #E5E7EB", borderRadius: 6 }}
            >
              {options.length === 0 ? <option value="">（建物がありません）</option>
                : options.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </label>
          {formUrl && (
            <a className="btn" href={formUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              この建物のフォームを新しいタブで開く
            </a>
          )}
        </div>
        {formUrl ? (
          <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden", height: "70vh" }}>
            <iframe src={formUrl} style={{ width: "100%", height: "100%", border: 0 }} title="building-form" />
          </div>
        ) : (
          <div style={{ padding: 8, border: "1px dashed #CBD5E1", borderRadius: 8, color: "#334155" }}>
            直近の建物が見つかりません。「ユーザー用ビルダー → 建物フォルダ作成」実行後、
            「プレビュー」で完成フォームがあることを確認してください。
          </div>
        )}
      </div>
    );
  }

  // ===== 直指定モード：読み込み中／エラー／OK =====
  if (err) {
    return <div className="card"><div className="form-text" style={{color:"#b91c1c"}}>読み込み失敗: {err}</div></div>;
  }
  if (!ready) {
    return <div className="card"><div className="form-text">フォームを読み込んでいます…</div></div>;
  }
  return <Wizard />;
}
