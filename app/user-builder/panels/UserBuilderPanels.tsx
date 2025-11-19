// app/user-builder/panels/UserBuilderPanels.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useBuilderStore } from "@/store/builder";
import { applyTheme, type Theme } from "@/utils/theme";
import BuildingFolderPanel from "../_components/BuildingFolderPanel";
import BuildStatus from "../_components/BuildStatus.client";

function SectionCard({ id, title, children }:{ id?:string; title:string; children?:React.ReactNode; }){
  return (<section id={id} className="card"><div className="form-title mb-2">{title}</div>{children}</section>);
}

type Props = {
  createUrl: string;
  statusUrl: string;
  defaultUser?: string | null;
  defaultHost?: string | null;
};

export default function UserBuilderPanels({ createUrl, statusUrl, defaultUser, defaultHost }: Props) {
  const builder = useBuilderStore();

  // ===== 初期化 & テーマ適用 =====
  useEffect(()=>{ builder.initOnce(); },[]); // 既存ベースがあれば読み込み
  useEffect(()=>{ applyTheme(builder.meta.theme); },[builder.meta.theme]);

  // ===== フォームカラー設定 =====
  const themeItems: { k: Theme; name: string; bg: string; fg: string; border: string }[] = [
    { k: 'white', name:'白'   , bg:'#ffffff', fg:'#111111', border:'#d9dfec' },
    { k: 'black', name:'黒'   , bg:'#141d3d', fg:'#eef3ff', border:'#2b3a6f' },
    { k: 'red',   name:'赤'   , bg:'#fc8b9b', fg:'#2a151a', border:'#4b2a32' },
    { k: 'blue',  name:'青'   , bg:'#7fb5ff', fg:'#112449', border:'#254072' },
    { k: 'yellow',name:'黄'   , bg:'#ffd75a', fg:'#332f12', border:'#4d4622' },
    { k: 'green', name:'緑'   , bg:'#5ce0b1', fg:'#0f241e', border:'#234739' },
  ];

  // ===== 建物選択 → サーバから JSON 読込 =====
  const [pickedBldg, setPickedBldg] = useState<string>("");
  const buildingOptions = useMemo<string[]>(() => {
    try {
      const raw = localStorage.getItem("cv_building_options") || "[]";
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? (arr as string[]) : [];
    } catch { return []; }
  }, []);

  const loadFormFromServer = async (b: string) => {
    if (!b) return;
    try{
      const user = defaultUser || process.env.NEXT_PUBLIC_DEFAULT_USER || "";
      const host = defaultHost || process.env.NEXT_PUBLIC_DEFAULT_HOST || "";
      const res = await fetch("/api/forms/read", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ varUser: user, varBldg: b, varHost: host })
      });
      if(!res.ok) throw new Error(`read failed: ${res.status} ${await res.text()}`);
      const json = await res.json(); // { meta,pages,fields } or { schema:{...} }
      const schema = json.schema || json; // 両対応
      builder.hydrateFrom(schema);
      // 色適用
      if(schema?.meta?.theme){ applyTheme(schema.meta.theme as Theme); }
      alert(`『${b}』のフォーム定義を読み込みました。`);
      // ステータス用：最後のビルドも拾えるよう lastBuild を利用
      try{
        const last = JSON.parse(localStorage.getItem("cv:lastBuild")||"{}");
        if(!last?.bldg){ localStorage.setItem("cv:lastBuild", JSON.stringify({ user, bldg:b, statusPath: last?.statusPath||"" })); }
      }catch{}
    }catch(e:any){
      alert(`フォーム読込失敗: ${e?.message||String(e)}`);
    }
  };

  // ===== 対象外（非表示）UI：ローカルに保持（Flowへは BuildingFolderPanel から渡す） =====
  const pages = builder.pages as any[];
  const fields = builder.fields as any[];
  const sectionPages = useMemo(()=> pages.filter(p=>p.type==="section"),[pages]);
  const fieldsByPage = useMemo(()=>{
    const m:Record<string, any[]> = {};
    for(const f of fields){ (m[f.pageId] = m[f.pageId] || []).push(f); }
    return m;
  },[fields]);

  const [excludedPages, setExcludedPages]   = useState<Set<string>>(()=>new Set());
  const [excludedFields, setExcludedFields] = useState<Set<string>>(()=>new Set());

  useEffect(()=>{
    localStorage.setItem("cv_excluded_pages" , JSON.stringify(Array.from(excludedPages)));
    localStorage.setItem("cv_excluded_fields", JSON.stringify(Array.from(excludedFields)));
  },[excludedPages, excludedFields]);

  const toggleSectionExclude = (pageId:string, fieldIds:string[])=>{
    setExcludedPages(prev=>{
      const next=new Set(prev);
      if(next.has(pageId)) next.delete(pageId); else next.add(pageId);
      return next;
    });
    setExcludedFields(prev=>{
      const next=new Set(prev);
      const wasExcluded = excludedPages.has(pageId);
      if(wasExcluded){ fieldIds.forEach(id=>next.delete(id)); }
      else{ fieldIds.forEach(id=>next.add(id)); }
      return next;
    });
  };
  const toggleFieldExclude = (fieldId:string)=>{
    setExcludedFields(prev=>{
      const next=new Set(prev);
      if(next.has(fieldId)) next.delete(fieldId); else next.add(fieldId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* 1) フォームカラー設定 */}
      <SectionCard id="color" title="フォームカラー設定（フォームに反映）">
        <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
          {themeItems.map(t=>(
            <button key={t.k} className="btn" style={{background:t.bg,color:t.fg,border:`1px solid ${t.border}`}}
              onClick={()=>{ builder.setMeta({ theme: t.k }); localStorage.setItem('cv_theme', t.k); applyTheme(t.k); }}>
              {t.name}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* 2) 建物選択 → サーバからフォーム定義を読み込む */}
      <SectionCard id="load" title="建物用フォームを読み込む（サーバ上の JSON）">
        <div className="flex items-center" style={{ gap: 8, flexWrap: "wrap" }}>
          <select className="input" value={pickedBldg} onChange={e=>setPickedBldg(e.target.value)} style={{minWidth:260}}>
            <option value="">建物を選択</option>
            {buildingOptions.map(x=><option key={x} value={x}>{x}</option>)}
          </select>
          <button className="btn" disabled={!pickedBldg} onClick={()=>loadFormFromServer(pickedBldg)}>読込</button>
        </div>
      </SectionCard>

      {/* 3) 対象外(非適用)設定（ローカルメモ→Flowに渡すのは下の作成ボタン） */}
      <SectionCard id="exclude" title="対象外(非適用)設定">
        <div className="text-xs text-slate-500 mb-2">セクション単位・項目単位で「対象外」にできます。緑＝表示中、赤＝非表示。</div>
        <div className="space-y-3">
          {sectionPages.map(p=>{
            const pid=p.id as string;
            const fs = (fieldsByPage[pid]||[]) as any[];
            const fids = fs.map((f:any,idx:number)=>(f.id||f.label||`f-${idx}`) as string).filter(Boolean);
            const pageExcluded = excludedPages.has(pid);
            const allExcluded = fids.length>0 && fids.every(id=>excludedFields.has(id));
            const sectionExcluded = pageExcluded || allExcluded;
            return (
              <details key={pid} className="border border-slate-300 rounded-md bg-white shadow-sm">
                <summary className="cursor-pointer flex items-center justify-between px-3 py-2">
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{p.title || "セクション"}</div>
                    {p.description && <div style={{ fontSize: 14, color: '#6B7280', marginTop: 2 }}>{p.description}</div>}
                  </div>
                  <button type="button" onClick={(e)=>{e.preventDefault();e.stopPropagation();toggleSectionExclude(pid,fids);}}
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 9999,
                      border: `1px solid ${sectionExcluded ? '#fecaca' : '#bbf7d0'}`,
                      backgroundColor: sectionExcluded ? '#fee2e2' : '#dcfce7',
                      color: sectionExcluded ? '#b91c1c' : '#166534', fontWeight: 600, minWidth: 68 }}>
                    {sectionExcluded ? '非表示' : '表示中'}
                  </button>
                </summary>
                <div className="px-3 pb-3 pt-2 border-t border-dashed border-slate-200">
                  {fs.length===0 ? (<div style={{ fontSize: 12, color: '#D1D5DB', marginTop: 4 }}>（項目なし）</div>) : (
                    <div className="mt-2 space-y-1">
                      {fs.map((f:any, idx:number)=>{
                        const fid = (f.id||f.label||`f-${idx}`) as string;
                        const label = (f.label || "(ラベル未設定)") as string;
                        const fExcluded = excludedFields.has(fid);
                        return (
                          <label key={fid} className="flex items-center justify-between" style={{ fontSize: 14 }}>
                            <span>{label}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 9999,
                                backgroundColor: fExcluded ? '#fee2e2' : '#dcfce7',
                                color: fExcluded ? '#b91c1c' : '#166534',
                                border: `1px solid ${fExcluded ? '#fecaca' : '#bbf7d0'}` }}>
                                {fExcluded ? '非表示' : '表示中'}
                              </span>
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

      {/* 4) 建物フォルダ作成 + URL発行（Flowへ除外/テーマも渡す） */}
      <SectionCard id="folder" title="建物フォルダ作成とURL発行">
        <BuildingFolderPanel
          createUrl={createUrl}
          statusUrl={statusUrl}
          defaultUser={defaultUser}
          defaultHost={defaultHost}
        />
      </SectionCard>

      {/* 5) ステータス表示（cv:lastBuild を見て自動対象） */}
      <SectionCard id="status" title="ステータス">
        <BuildStatus statusUrl={statusUrl} />
      </SectionCard>
    </div>
  );
}
