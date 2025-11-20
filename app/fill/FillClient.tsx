"use client";
import React from "react";
import { Wizard } from "@/components/Wizard";

type Props = { user?: string; bldg?: string; host?: string };

export default function FillClient({ user, bldg, host }: Props) {
  // 直指定は最短で Wizard を描画（Flow には戻らない）
  if (user && bldg) {
    return <Wizard {...({ user, bldg, host } as any)} />;
  }

  // ===== 以下はクエリ無し時の埋め込みUI（既存どおり） =====
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
          直近の建物が見つかりません。まず「ユーザー用ビルダー → 建物フォルダ作成」で建物を作成し、URL/QR を発行してください。
        </div>
      )}
    </div>
  );
}
