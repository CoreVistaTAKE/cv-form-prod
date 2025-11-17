"use client";
import UBHeader from '../_components/UBHeader';
import UserBuilderPanels from './_components/UserBuilderPanels';

import React, { useEffect, useMemo, useState } from "react";
import { useBuilderStore } from "@/store/builder";
import { usePublishStore } from "@/store/publish";
import { slugify } from "@/utils/slug";
import { applyTheme } from "@/utils/theme";

type Excludes = { pages:string[]; fields:string[] };

export default function UserBuilderPage(){
  const builder = useBuilderStore();
  const publish = usePublishStore();
  const [baseLoaded,setBaseLoaded]=useState(false);

  const [tenant,setTenant]=useState("default");

  // 対象外（非適用）保持：既存UIのまま
  const pages = builder.pages;
  const fields = builder.fields;
  const sectionPages = useMemo(()=> pages.filter(p=>p.type==="section"), [pages]);

  const [excludedPages, setExcludedPages] = useState<Set<string>>(new Set());
  const [excludedFields, setExcludedFields] = useState<Set<string>>(new Set());

  useEffect(()=>{ builder.initOnce(); publish.initOnce(); },[]);
  useEffect(()=>{
    const raw = localStorage.getItem("cv_form_base_v049");
    if(raw){
      try{ const obj=JSON.parse(raw); builder.hydrateFrom(obj); setBaseLoaded(true); }catch{}
    }
  },[builder.hydrateFrom]);
  useEffect(()=>{ applyTheme(builder.meta.theme); },[builder.meta.theme]);

  // 保存名＝建物名_会社名（表示用、slugは URL 用に変換）
  const baseNameHuman = useMemo(()=>{
    const b=(builder.meta.fixedBuilding||"").trim();
    const c=(builder.meta.fixedCompany||"").trim();
    return (b||c)? `${b}_${c}` : "";
  },[builder.meta.fixedBuilding, builder.meta.fixedCompany]);
  const tenantSlug = useMemo(()=> slugify(tenant||"default"), [tenant]);
  const baseSlug = useMemo(()=> slugify(baseNameHuman||""), [baseNameHuman]);
  const uniqueNameSlug = useMemo(()=> publish.ensureUniqueNameSlug(tenantSlug, baseSlug), [publish.list, tenantSlug, baseSlug]);

  // 対象外UI用
  const fieldsByPage = useMemo(()=>{
    const m:Record<string, typeof fields> = {};
    for(const p of sectionPages){ m[p.id]=[]; }
    for(const f of fields){ if(m[f.pageId]) m[f.pageId].push(f); }
    return m;
  },[fields, sectionPages]);

  function togglePage(id:string, checked:boolean){
    setExcludedPages(prev=>{
      const s = new Set(prev);
      const fs = fieldsByPage[id]||[];
      if(checked){ s.add(id); setExcludedFields(new Set([...excludedFields, ...fs.map(f=>f.id)])); }
      else { s.delete(id); setExcludedFields(new Set([...excludedFields].filter(x=>!fs.some(f=>f.id===x)))); }
      return s;
    });
  }
  function toggleField(id:string, checked:boolean){
    setExcludedFields(prev=>{ const s=new Set(prev); if(checked) s.add(id); else s.delete(id); return s; });
  }

  async function downloadMemoAndQR(url:string){
    const ymd = new Date().toISOString().slice(0,10).replace(/-/g,"");
    const bld = (builder.meta.fixedBuilding||"").trim();
    const comp= (builder.meta.fixedCompany||"").trim();
    const lines = [
      "CoreVista Form URL",
      `発行日: ${new Date().toLocaleString("ja-JP")}`,
      `建物名: ${bld}`,
      `会社名: ${comp}`,
      `URL: ${url}`
    ].join("\r\n");
    const memoBlob = new Blob([lines], {type:"text/plain"});
    const a1 = document.createElement("a"); a1.href = URL.createObjectURL(memoBlob); a1.download = "FORM_URL.txt"; a1.click(); setTimeout(()=>URL.revokeObjectURL(a1.href),500);

    try{
      const mod = await import("qrcode");
      const dataUrl = await mod.toDataURL(url, { width: 480, margin: 1, color: {dark:"#000000", light:"#ffffff"}});
      const img = new Image(); img.src = dataUrl; await new Promise(res=>{ img.onload=res; });
      const canvas = document.createElement("canvas"); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext("2d")!; ctx.fillStyle="#ffffff"; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0);
      ctx.fillStyle="#000000"; ctx.font="16px sans-serif";
      const note = `${ymd} ${bld} ${comp}`;
      ctx.fillText(note, 8, canvas.height - 8);
      const jpg = canvas.toDataURL("image/jpeg", 0.92);
      const a2 = document.createElement("a"); a2.href = jpg;
      const safe=(s:string)=>s.replace(/[\\/:*?"<>|]+/g,"_");
      a2.download = `QR_${ymd}_${safe(bld)}_${safe(comp)}.jpg`;
      a2.click();
    }catch{}
  }

  function publishForm(){
    if(!baseLoaded){ alert("ユーザー用ベースが読み込まれていません。『ユーザー用ベースを読み込む』を先に実行してください。"); return; }
    if(!baseNameHuman){ alert("フォーム設定の『建物名』『会社名』を入力してください。"); return; }

    const schema = { meta: builder.meta, pages: builder.pages, fields: builder.fields };
    const excludes:Excludes = { pages: Array.from(excludedPages), fields: Array.from(excludedFields) };
    const unique = publish.ensureUniqueNameSlug(tenantSlug, baseSlug);
    const item = publish.publish(tenantSlug, unique, schema, excludes);
    const url = `${location.origin}${item.urlPath}`;
    navigator.clipboard.writeText(url).catch(()=>{});
    alert(`発行しました。URLをクリップボードにコピーしました。\n保存ダイアログで {建物名_会社名}/form/ に保存してください。`);
    downloadMemoAndQR(url);
  }

  const themeItems = [
    {k:"white" as const, name:"白", bg:"#ffffff", fg:"#111111", border:"#d9dfec"},
    {k:"black" as const, name:"黒", bg:"#141d3d", fg:"#eef3ff", border:"#2b3a6f"},
    {k:"red"   as const, name:"赤", bg:"#fc8b9b", fg:"#2a151a", border:"#4b2a32"},
    {k:"blue"  as const, name:"青", bg:"#7fb5ff", fg:"#112449", border:"#254072"},
    {k:"yellow"as const, name:"黄", bg:"#ffd75a", fg:"#332f12", border:"#4d4622"},
    {k:"green" as const, name:"緑", bg:"#5ce0b1", fg:"#0f241e", border:"#234739"},
  ];

  return (
    <div className="space-y-6">
      <UBHeader />
      <UserBuilderPanels />

      <div className="flex items-center justify-between">
        <div className="form-title">ユーザー用ビルダー（フォーム設定・対象外・テーマ）</div>
        <div className="gap-2">
          <button className="btn-secondary" onClick={async()=>{
            const input=document.createElement("input"); input.type="file"; input.accept="application/json";
            const file = await new Promise<File>(res=>{ input.onchange=()=>res(input.files![0]); input.click(); });
            const text = await file.text();
            localStorage.setItem("cv_form_base_v049", text);
            try{ const obj = JSON.parse(text); builder.hydrateFrom(obj); setBaseLoaded(true); alert("ベースを読み込みました。"); }catch(e:any){ alert("読み込み失敗: "+e.message); }
          }}>ユーザー用ベースを読み込む</button>
        </div>
      </div>

      <div className="card">
        <div className="form-title mb-2">URL と 保存名</div>
        <div className="grid-2">
          <div>
            <label className="label">URLで使う短い名前（英数字）</label>
            <input className="input" value={tenant} onChange={e=>setTenant(e.target.value)} placeholder="例: firstservice"/>
          </div>
          <div>
            <label className="label">フォームの保存名（自動）</label>
            <input className="input" value={baseNameHuman ? `${baseNameHuman} → ${uniqueNameSlug}` : ""} readOnly placeholder="建物名_会社名（自動）"/>
          </div>
        </div>
        <div className="text-right mt-2">
          <button className="btn" onClick={publishForm}>フォームを保存する</button>
        </div>
      </div>

      <div className="card">
        <div className="form-title mb-2">フォームカラー設定（ユーザー側）</div>
        <div className="flex items-center" style={{gap:8, flexWrap:"wrap"}}>
          {themeItems.map(t=>(
            <button key={t.k} className="btn" style={{background:t.bg,color:t.fg,border:`1px solid ${t.border}`}}
              onClick={()=>{ builder.setMeta({theme:t.k as any}); localStorage.setItem("cv_theme", t.k); applyTheme(t.k as any); }}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="form-title mb-2">フォーム設定（建物名・会社名）</div>
        <div className="grid-2">
          <div>
            <label className="label">建物名（固定）</label>
            <input className="input" value={builder.meta.fixedBuilding||""} onChange={e=>builder.setMeta({fixedBuilding:e.target.value})}/>
          </div>
          <div>
            <label className="label">会社名（固定）</label>
            <input className="input" value={builder.meta.fixedCompany||""} onChange={e=>builder.setMeta({fixedCompany:e.target.value})}/>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="form-title mb-2">対象外（非適用）設定</div>
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
                    使用しない <input type="checkbox" checked={pChecked || allFChecked} onChange={e=>{
                      const checked = e.target.checked;
                      setExcludedPages(prev=>{ const s=new Set(prev); if(checked) s.add(p.id); else s.delete(p.id); return s; });
                      const t = new Set(excludedFields);
                      for(const f of fs){ if(checked) t.add(f.id); else t.delete(f.id); }
                      setExcludedFields(t);
                    }} />
                  </label>
                </div>
                {fs.length>0 && (
                  <div className="mt-2">
                    {fs.map(f=>{
                      const fChecked = excludedFields.has(f.id);
                      return (
                        <label key={f.id} className="flex items-center" style={{gap:6, marginTop:6}}>
                          <input type="checkbox" checked={fChecked} onChange={e=>{
                            const checked=e.target.checked;
                            setExcludedFields(prev=>{ const s=new Set(prev); if(checked) s.add(f.id); else s.delete(f.id); return s; });
                          }} />
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
      </div>
    </div>
  );
}