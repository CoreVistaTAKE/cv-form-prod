"use client";
import React from "react";

/** 建物フォーム読込UI（LocalStorage: cv_building_options / cv_form_urls / cv_last_building） */
export default function FillClient(): JSX.Element {
  const [bldg, setBldg]   = React.useState<string>("");
  const [formUrl, setUrl] = React.useState<string>("");

  const options = React.useMemo<string[]>(()=>{
    try {
      const raw = localStorage.getItem("cv_building_options") || "[]";
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr as string[] : [];
    } catch { return []; }
  },[]);

  const urlMap = React.useMemo<Record<string,string>>(()=>{
    try {
      const raw = localStorage.getItem("cv_form_urls") || "{}";
      const obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? obj as Record<string,string> : {};
    } catch { return {}; }
  },[]);

  React.useEffect(()=>{
    try {
      const last = localStorage.getItem("cv_last_building") || "";
      const init = last || (options.length ? options[0] : "");
      setBldg(init);
      setUrl(init ? (urlMap[init] || "") : "");
    } catch {}
  },[options, urlMap]);

  React.useEffect(()=>{
    setUrl(bldg ? (urlMap[bldg] || "") : "");
  },[bldg, urlMap]);

  return (
    <div style={{display:"grid", gap:12}}>
      <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
        <label>建物：
          <select value={bldg} onChange={e=>setBldg(e.target.value)}
            style={{marginLeft:8,padding:"6px 10px",border:"1px solid #E5E7EB",borderRadius:6}}>
            {options.length===0
              ? <option value="">（建物がありません）</option>
              : options.map(x=><option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        {formUrl && (
          <a href={formUrl} target="_blank" rel="noopener" className="btn" style={{textDecoration:"none"}}>
            この建物のフォームを新しいタブで開く
          </a>
        )}
      </div>

      {formUrl ? (
        <div style={{border:"1px solid #E5E7EB", borderRadius:8, overflow:"hidden", height:"70vh"}}>
          <iframe src={formUrl} style={{width:"100%",height:"100%",border:"0"}} title="building-form"></iframe>
        </div>
      ) : (
        <div style={{padding:8, border:"1px dashed #CBD5E1", borderRadius:8, color:"#334155"}}>
          直近の建物が見つかりません。まず「ユーザー用ビルダー → 建物フォルダ作成」で建物を作成し、
          「プレビュー」で完成フォームがあることを確認してください。
        </div>
      )}
    </div>
  );
}