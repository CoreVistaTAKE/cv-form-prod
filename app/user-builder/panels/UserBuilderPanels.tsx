// app/user-builder/panels/UserBuilderPanels.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useBuilderStore } from "@/store/builder";
import { applyTheme } from "@/utils/theme";
import BuildingFolderPanel from "../_components/BuildingFolderPanel";
import BuildStatus from "../_components/BuildStatus.client";

type Option = {
  user: string; token: string; bldg: string; seq: string;
  statusPath: string; schemaPath: string; label: string;
};

function SectionCard({ id, title, children }:{ id?:string; title:string; children?:React.ReactNode; }){
  return (
    <section id={id} className="card">
      <div className="form-title mb-2">{title}</div>
      {children}
    </section>
  );
}

type Props = {
  createUrl: string;
  statusUrl: string;
  defaultUser?: string | null;
  defaultHost?: string | null;
};

export default function UserBuilderPanels({
  createUrl, statusUrl, defaultUser, defaultHost,
}: Props) {
  const builder = useBuilderStore();
  const [baseLoaded, setBaseLoaded] = useState(false);

  useEffect(()=>{ builder.initOnce(); },[]);                    // ストア初期化
  useEffect(()=>{ applyTheme(builder.meta.theme); },[builder.meta.theme]); // テーマ反映

  // ======== 1) 建物用フォームを読み込む（サーバ上の JSON） ========
  const [options, setOptions] = useState<Option[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [lookupMsg, setLookupMsg] = useState<string>("");

  const effectiveUser = (defaultUser || process.env.NEXT_PUBLIC_DEFAULT_USER || "form_PJ1").toString();

  const doLookup = async ()=>{
    setLookupMsg("lookup 実行中…");
    try{
      const res = await fetch("/api/registry/lookup", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ user: effectiveUser }),
      });
      if(!res.ok){ const t = await res.text().catch(()=> ""); throw new Error(`lookup HTTP ${res.status} ${t}`); }
      const j = await res.json();
      const items = (j?.items||[]) as Option[];
      setOptions(items);
      setLookupMsg(items.length ? `取得 ${items.length} 件` : "0 件");
    }catch(e:any){
      setLookupMsg(e?.message || String(e));
    }
  };

  const doRead = async ()=>{
    const item = options.find(o=>o.token===selected);
    if(!item){ alert("建物を選択してください"); return; }
    try{
      // 読み込み API（form_ready / base の JSON を返す）
      const res = await fetch("/api/forms/read", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ schemaPath: item.schemaPath, token: item.token }),
      });
      if(!res.ok){ const t = await res.text().catch(()=> ""); throw new Error(`read HTTP ${res.status} ${t}`); }
      const j = await res.json();
      if(!j?.meta || !Array.isArray(j?.pages) || !Array.isArray(j?.fields)){
        throw new Error("読み込んだ JSON に meta/pages/fields が見つかりません");
      }
      builder.hydrateFrom({ meta:j.meta, pages:j.pages, fields:j.fields });
      setBaseLoaded(true);
      // ステータス連動のため lastBuild を更新
      localStorage.setItem("cv:lastBuild", JSON.stringify({
        user: item.user, bldg: item.bldg, statusPath: item.statusPath
      }));
      alert(`読み込み完了：${item.bldg} / ${item.seq}`);
    }catch(e:any){
      alert(e?.message || String(e));
    }
  };

  // ======== 2) フォームカラー（フォームへ反映） ========
  const themeItems = [
    {k:"white" as const,  name:"白",    bg:"#ffffff", fg:"#111111", border:"#d9dfec"},
    {k:"black" as const,  name:"黒",    bg:"#141d3d", fg:"#eef3ff", border:"#2b3a6f"},
    {k:"red"   as const,  name:"赤",    bg:"#fc8b9b", fg:"#2a151a", border:"#4b2a32"},
    {k:"blue"  as const,  name:"青",    bg:"#7fb5ff", fg:"#112449", border:"#254072"},
    {k:"yellow"as const,  name:"黄",    bg:"#ffd75a", fg:"#332f12", border:"#4d4622"},
    {k:"green" as const,  name:"緑",    bg:"#5ce0b1", fg:"#0f241e", border:"#234739"},
  ];

  // ======== 3) 既存のセクション/フィールド一覧（対象外メモ用：UIのみ） ========
  const pages  = builder.pages  as any[];
  const fields = builder.fields as any[];
  const sectionPages = useMemo(()=> pages.filter(p=>p.type==="section"), [pages]);
  const fieldsByPage = useMemo(()=>{
    const m:Record<string, any[]> = {};
    for(const f of fields){ const pid=f.pageId??""; (m[pid]=m[pid]||[]).push(f); }
    return m;
  },[fields]);
  const [excludedPages, setExcludedPages]   = useState<Set<string>>(()=>new Set());
  const [excludedFields, setExcludedFields] = useState<Set<string>>(()=>new Set());

  const toggleSectionExclude = (pageId:string, fieldIds:string[])=>{
    setExcludedPages(prev=>{
      const next = new Set(prev);
      next.has(pageId)? next.delete(pageId): next.add(pageId);
      return next;
    });
    setExcludedFields(prev=>{
      const next = new Set(prev);
      const nowExcluded = excludedPages.has(pageId);
      if(nowExcluded){ fieldIds.forEach(id=>next.delete(id)); }
      else{ fieldIds.forEach(id=>next.add(id)); }
      return next;
    });
  };
  const toggleFieldExclude = (fieldId:string)=>{
    setExcludedFields(prev=>{
      const next = new Set(prev);
      next.has(fieldId)? next.delete(fieldId): next.add(fieldId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* 読み込み（lookup → read） */}
      <SectionCard id="intake" title="建物用フォームを読み込む（サーバ上の JSON）">
        <div className="flex items-center gap-2">
          <select className="input" style={{minWidth:260}}
            value={selected} onChange={e=>setSelected(e.target.value)}>
            <option value="">建物を選択</option>
            {options.map(o=>(
              <option key={o.token} value={o.token}>{o.label}</option>
            ))}
          </select>
          <button className="btn" onClick={doRead}>読込</button>
          <button className="btn-secondary" onClick={doLookup}>再取得</button>
          <span className="text-xs text-slate-400">{lookupMsg}</span>
        </div>
      </SectionCard>

      {/* フォームカラー設定 */}
      <SectionCard id="color" title="フォームカラー設定（フォームに反映）">
        <div className="flex items-center" style={{gap:8,flexWrap:"wrap"}}>
          {themeItems.map(t=>(
            <button key={t.k} className="btn"
              style={{background:t.bg,color:t.fg,border:`1px solid ${t.border}`}}
              onClick={()=>{ builder.setMeta({theme:t.k as any}); localStorage.setItem("cv_theme", t.k); applyTheme(t.k as any); }}>
              {t.name}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* 対象外(非適用) 設定（画面上のメモ） */}
      <SectionCard id="exclude" title="対象外(非適用)設定">
        <div className="text-xs text-slate-500 mb-2">セクション／項目ごとに「非表示候補」をマークできます（schemaへの自動反映は行いません）。</div>
        <div className="space-y-3">
          {sectionPages.map(p=>{
            const pageId = p.id as string;
            const fs = (fieldsByPage[pageId]??[]) as any[];
            const fids = fs.map((f:any,i:number)=>(f.id||f.label||`f-${i}`) as string).filter(Boolean);
            const sectionExcluded = excludedPages.has(pageId) || (fids.length>0 && fids.every(id=>excludedFields.has(id)));
            return (
              <details key={pageId} className="border border-slate-300 rounded-md bg-white shadow-sm">
                <summary className="cursor-pointer flex items-center justify-between px-3 py-2">
                  <div>
                    <div style={{fontSize:16,fontWeight:700}}>{p.title||"セクション"}</div>
                    {p.description&&(<div style={{fontSize:14,color:"#6B7280",marginTop:2}}>{p.description}</div>)}
                  </div>
                  <button type="button" onClick={(e)=>{e.preventDefault(); e.stopPropagation(); toggleSectionExclude(pageId,fids);}}
                    style={{
                      fontSize:12,padding:"4px 10px",borderRadius:9999,
                      border:`1px solid ${sectionExcluded?'#fecaca':'#bbf7d0'}`,
                      backgroundColor: sectionExcluded?'#fee2e2':'#dcfce7',
                      color: sectionExcluded?'#b91c1c':'#166534', fontWeight:600, minWidth:68, textAlign:"center"
                    }}>
                    {sectionExcluded? "非表示":"表示中"}
                  </button>
                </summary>
                <div className="px-3 pb-3 pt-2 border-t border-dashed border-slate-200">
                  {fs.length===0?(
                    <div style={{fontSize:12,color:"#D1D5DB",marginTop:4}}>（項目なし）</div>
                  ):(
                    <div className="mt-2 space-y-1">
                      {fs.map((f:any,i:number)=>{
                        const fid = (f.id||f.label||`f-${i}`) as string;
                        const fExcluded = excludedFields.has(fid);
                        return (
                          <label key={fid} className="flex items-center justify-between" style={{fontSize:14}}>
                            <span>{f.label||"(ラベル未設定)"}</span>
                            <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
                              <span style={{
                                fontSize:11,padding:"2px 6px",borderRadius:9999,
                                backgroundColor: fExcluded?'#fee2e2':'#dcfce7',
                                color:         fExcluded?'#b91c1c':'#166534',
                                border:`1px solid ${fExcluded?'#fecaca':'#bbf7d0'}`
                              }}>{fExcluded? "非表示":"表示中"}</span>
                              <input type="checkbox" checked={fExcluded} onChange={()=>toggleFieldExclude(fid)} />
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

      {/* 建物フォルダ作成＋URL発行（既存） */}
      <SectionCard id="folder" title="建物フォルダ作成とURL発行">
        <BuildingFolderPanel
          createUrl={createUrl} statusUrl={statusUrl}
          defaultUser={defaultUser} defaultHost={defaultHost}
        />
      </SectionCard>

      {/* ステータス（lastBuild or 読み込み選択に追随） */}
      <SectionCard id="status" title="ステータス">
        <BuildStatus statusUrl={statusUrl} />
      </SectionCard>
    </div>
  );
}
