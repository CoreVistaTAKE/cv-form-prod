// app/fill/FillClient.tsx
"use client";
import React from "react";

type Props = { user?: string; bldg?: string; host?: string };

type ResolveResp = { ok?: boolean; url?: string; reason?: string };

export default function FillClient({ user, bldg, host }: Props) {
  const [pickedBldg, setPickedBldg] = React.useState("");
  const [formUrl, setFormUrl] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  // 直指定：/api/forms/resolve で最終URLを解決し iframe で表示
  React.useEffect(() => {
    if (!user || !bldg) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch("/api/forms/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ varUser: user, varBldg: bldg, varHost: host }),
          cache: "no-store",
        });
        const json = (await res.json().catch(() => ({}))) as ResolveResp;
        if (!res.ok || !json?.url) {
          throw new Error(json?.reason || `resolve failed: ${res.status}`);
        }
        if (!cancelled) setFormUrl(json.url);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, bldg, host]);

  // ===== 直指定が無いとき：ローカル選択UI =====
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
    if (user && bldg) return; // 直指定モードは使わない
    try {
      const last = localStorage.getItem("cv_last_building") || "";
      const init = last || (options.length ? options[0] : "");
      setPickedBldg(init);
      setFormUrl(init ? urlMap[init] || "" : "");
    } catch {}
  }, [user, bldg, options, urlMap]);

  React.useEffect(() => {
    if (user && bldg) return;
    setFormUrl(pickedBldg ? urlMap[pickedBldg] || "" : "");
  }, [user, bldg, pickedBldg, urlMap]);

  // ===== UI =====
  // 直指定：ローディング／エラー／iframe
  if (user && bldg) {
    return (
      <div>
        <div className="card">
          <div className="form-title">入力フォーム（{user} / {bldg}）</div>
        </div>
        {loading && <div className="card">フォームURLを解決中…</div>}
        {err && <div className="card" style={{color:"#b91c1c"}}>解決失敗：{err}</div>}
        {!loading && !err && formUrl && (
          <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden", height: "70vh" }}>
            <iframe src={formUrl} style={{ width: "100%", height: "100%", border: 0 }} title="building-form" />
          </div>
        )}
      </div>
    );
  }

  // クエリ無し：ローカル選択＋埋め込み
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
          直近の建物が見つかりません。まず「ユーザー用ビルダー → 建物フォルダ作成」で建物を作成し、
          「プレビュー」で完成フォームがあることを確認してください。
        </div>
      )}
    </div>
  );
}
