// app/fill/FillClient.tsx  ← 全文
"use client";
import React from "react";
import { Wizard } from "@/components/Wizard";
import { useBuilderStore } from "@/store/builder";

type Props = { user?: string; bldg?: string; host?: string };

export default function FillClient({ user, bldg, host }: Props) {
  // 直指定（URLクエリ）の場合は、まず schema をロードしてから Wizard を表示する
  const builder = useBuilderStore();
  const [phase, setPhase] = React.useState<"idle"|"loading"|"done"|"error">("idle");
  const [err, setErr] = React.useState<string>("");

  React.useEffect(() => {
    let cancelled = false;

    async function loadSchemaDirect(u: string, b: string, h: string) {
      // 1) /api/forms/read を優先で叩く（varUser/varBldg 形式と user/bldg 形式の両対応）
      async function tryRead(body: any) {
        const r = await fetch("/api/forms/read", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(body),
        });
        if (!r.ok) throw new Error(`/api/forms/read ${r.status} ${await r.text().catch(()=> "")}`);
        const j = await r.json().catch(()=> ({}));
        return j;
      }

      function pickSchema(payload: any) {
        const s = payload?.schema || payload?.body?.schema || (payload?.meta && payload?.pages && payload?.fields ? payload : null);
        return s || null;
      }

      // まず /api/forms/read に 2パターンで挑戦
      let schema: any = null;
      try {
        const j1 = await tryRead({ varUser: u, varBldg: b, varHost: h });
        schema = pickSchema(j1);
      } catch {}
      if (!schema) {
        try {
          const j2 = await tryRead({ user: u, bldg: b, host: h });
          schema = pickSchema(j2);
        } catch {}
      }

      // だめなら /api/forms/resolve → schemaPath → /api/forms/read で最終取得
      if (!schema) {
        const r1 = await fetch("/api/forms/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ varUser: u, varBldg: b, varHost: h }),
        });
        if (!r1.ok) throw new Error(`/api/forms/resolve ${r1.status} ${await r1.text().catch(()=> "")}`);
        const j1 = await r1.json().catch(()=> ({}));
        const schemaPath =
          j1?.schemaPath || j1?.body?.schemaPath || j1?.result?.schemaPath;
        if (!schemaPath) throw new Error("schemaPath が取得できませんでした。");

        const r2 = await fetch("/api/forms/read", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ schemaPath }),
        });
        if (!r2.ok) throw new Error(`/api/forms/read (by schemaPath) ${r2.status} ${await r2.text().catch(()=> "")}`);
        const j2 = await r2.json().catch(()=> ({}));
        schema = pickSchema(j2);
      }

      if (!schema) throw new Error("フォーム定義（meta/pages/fields）が空です。");

      // ストアに流し込み（既存パターンに合わせる）
      try { builder.resetAll?.(); } catch {}
      builder.hydrateFrom?.(schema);
      if (!schema?.meta?.fixedBuilding && builder.setMeta) {
        builder.setMeta({ fixedBuilding: b });
      }
    }

    (async () => {
      if (user && bldg) {
        setPhase("loading");
        setErr("");
        try {
          await loadSchemaDirect(user, bldg, host || "");
          if (!cancelled) setPhase("done");
        } catch (e: any) {
          if (!cancelled) { setPhase("error"); setErr(e?.message || String(e)); }
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user, bldg, host, builder]);

  // 直指定は最短表示（ロード→Wizard）。それ以外は既存UI。
  if (user && bldg) {
    if (phase === "loading") return <div className="card">フォーム定義を読込中…</div>;
    if (phase === "error")   return <div className="card text-red-600 whitespace-pre-wrap">読み込み失敗: {err}</div>;
    if (phase === "done")    return <Wizard />;
  }

  // ===== 直指定が無い時の既存UI（localStorageで建物選択→iframe） =====
  const [pickedBldg, setPickedBldg] = React.useState("");
  const [formUrl, setFormUrl] = React.useState("");

  const options = React.useMemo<string[]>(() => {
    try {
      const raw = localStorage.getItem("cv_building_options") || "[]";
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? (arr as string[]) : [];
    } catch { return []; }
  }, []);

  const urlMap = React.useMemo<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem("cv_form_urls") || "{}";
      const obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? (obj as Record<string, string>) : {};
    } catch { return {}; }
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
            {options.length === 0 ? (
              <option value="">（建物がありません）</option>
            ) : (
              options.map((x) => <option key={x} value={x}>{x}</option>)
            )}
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
          直近の建物が見つかりません。まず「ユーザー用ビルダー → 建物フォルダ作成」で建物を作成し、「プレビュー」で完成フォームがあることを確認してください。
        </div>
      )}
    </div>
  );
}
