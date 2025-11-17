"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useBuilderStore } from "@/store/builder";
import { applyTheme } from "@/utils/theme";
import BuildingFolderPanel from "../_components/BuildingFolderPanel";

export default function UserBuilderPage(){
  const builder = useBuilderStore();
  const [baseLoaded, setBaseLoaded] = useState(false);

  // 既存の初期化とテーマ適用
  useEffect(()=>{ builder.initOnce(); },[]);
  useEffect(()=>{
    try{
      const raw = localStorage.getItem("cv_form_base_v049");
      if(raw){ const obj = JSON.parse(raw); builder.hydrateFrom(obj); setBaseLoaded(true); }
    }catch{}
  },[builder.hydrateFrom]);
  useEffect(()=>{ applyTheme(builder.meta.theme); },[builder.meta.theme]);

  // 対象外(非適用)UIのための準備
  const pages = builder.pages;
  const fields = builder.fields;
  const sectionPages = useMemo(()=> pages.filter(p=>p.type==="section"), [pages]);
  const fieldsByPage = useMemo(()=>{
    const m = {};
    for(const p of sectionPages){ m[p.id] = []; }
    for(const f of fields){ if(m[f.pageId]) m[f.pageId].push(f); }
    return m;
  },[fields, sectionPages]);

  const [excludedPages, setExcludedPages] = useState(new Set());
  const [excludedFields, setExcludedFields] = useState(new Set());

  // ユーザー用ベース読み込み（既存動作）
  async function handleLoadUserBase(){
    const input = document.createElement("input");
    input.type = "file"; input.accept = "application/json";
    const file = await new Promise(res => { input.onchange = ()=> res(input.files[0]); input.click(); });
    const text = await file.text();
    localStorage.setItem("cv_form_base_v049", text);
    try{
      const obj = JSON.parse(text);
      builder.hydrateFrom(obj); setBaseLoaded(true);
      alert("ベースを読み込みました。");
    }catch(e){ alert("読み込み失敗: " + (e && e.message ? e.message : e)); }
  }

  // カラー選択
  const themeItems = [
    {k:"white", name:"白", bg:"#ffffff", fg:"#111111", border:"#d9dfec"},
    {k:"black", name:"黒", bg:"#141d3d", fg:"#eef3ff", border:"#2b3a6f"},
    {k:"red",   name:"赤", bg:"#fc8b9b", fg:"#2a151a", border:"#4b2a32"},
    {k:"blue",  name:"青", bg:"#7fb5ff", fg:"#112449", border:"#254072"},
    {k:"yellow",name:"黄", bg:"#ffd75a", fg:"#332f12", border:"#4d4622"},
    {k:"green", name:"緑", bg:"#5ce0b1", fg:"#0f241e", border:"#234739"}
  ];

  return (
    <div className="space-y-6">
      {/* 上部：枠なし（左=タイトル、右=読み込みボタン） */}
      <div className="flex items-center justify-between">
        <div className="form-title">ユーザー用ビルダー（フォーム設定・対象外・テーマ）</div>
        <div className="gap-2">
          <button className="btn-secondary" onClick={handleLoadUserBase}>ユーザー用ベースを読み込む</button>
        </div>
      </div>

      {/* 1) フォームカラー設定（フォームに反映） */}
      <section id="color" className="card">
        <div className="form-title mb-2">フォームカラー設定（フォームに反映）</div>
        <div className="flex items-center" style={{gap:8, flexWrap:"wrap"}}>
          {themeItems.map(t=>(
            <button
              key={t.k}
              className="btn"
              style={{background:t.bg, color:t.fg, border:`1px solid ${t.border}`}}
              onClick={()=>{ builder.setMeta({theme:t.k}); localStorage.setItem("cv_theme", t.k); applyTheme(t.k); }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </section>

      {/* 2) 対象外(非適用)設定（既存UI踏襲） */}
      <section id="exclude" className="card">
        <div className="form-title mb-2">対象外(非適用)設定</div>
        <div className="space-y-4">
          {sectionPages.map((p)=>{
            const pChecked = excludedPages.has(p.id);
            const fs = fieldsByPage[p.id] || [];
            const allFChecked = fs.length>0 && fs.every(f=>excludedFields.has(f.id));
            return (
              <div key={p.id} className="card">
                <div className="flex items-center justify-between">
                  <div style={{fontSize:16, fontWeight:700}}>{p.title || "セクション"}</div>
                  <label className="form-text" style={{display:"inline-flex", alignItems:"center", gap:6}}>
                    使用しない{" "}
                    <input
                      type="checkbox"
                      checked={pChecked || allFChecked}
                      onChange={e=>{
                        const checked = e.target.checked;
                        setExcludedPages(prev=>{ const s=new Set(prev); if(checked) s.add(p.id); else s.delete(p.id); return s; });
                        const t = new Set(excludedFields);
                        for(const f of fs){ if(checked) t.add(f.id); else t.delete(f.id); }
                        setExcludedFields(t);
                      }}
                    />
                  </label>
                </div>
                {fs.length>0 && (
                  <div className="mt-2">
                    {fs.map(f=>{
                      const fChecked = excludedFields.has(f.id);
                      return (
                        <label key={f.id} className="flex items-center" style={{gap:6, marginTop:6}}>
                          <input
                            type="checkbox"
                            checked={fChecked}
                            onChange={e=>{
                              const checked = e.target.checked;
                              setExcludedFields(prev=>{ const s=new Set(prev); if(checked) s.add(f.id); else s.delete(f.id); return s; });
                            }}
                          />
                          <span className="form-text">{f.label}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3) 建物フォルダ作成とURL発行（既存のコンポーネントをそのまま使用） */}
      <section id="folder" className="card">
        <div className="form-title mb-2">建物フォルダ作成とURL発行</div>
        <BuildingFolderPanel />
      </section>
    </div>
  );
}