// app/user-builder/panels/UserBuilderPanels.tsx
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useBuilderStore } from '@/store/builder';
import { applyTheme, type Theme } from '@/utils/theme';
import BuildingFolderPanel from '../_components/BuildingFolderPanel';
import BuildStatus from '../_components/BuildStatus.client';

function SectionCard({ id, title, children }: { id?:string; title:string; children?:React.ReactNode; }){
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

  // ===== 初期化 =====
  useEffect(()=>{ builder.initOnce(); },[]);
  useEffect(()=>{ try {
    const raw = localStorage.getItem('cv_form_base_v049');
    if (raw) builder.hydrateFrom(JSON.parse(raw));
  } catch {} },[builder.hydrateFrom]);
  useEffect(()=>{ applyTheme(builder.meta.theme); },[builder.meta.theme]);

  // ===== Intake（サーバ上の JSON を読み込む）=====
  const [lookUser] = useState<string>(defaultUser || process.env.NEXT_PUBLIC_DEFAULT_USER || 'form_PJ1');
  const [buildings, setBuildings] = useState<string[]>([]);
  const [picked, setPicked] = useState<string>('');
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [intakeMsg, setIntakeMsg] = useState<string>('');

  async function reloadBuildings(){
    setIntakeMsg(''); setIntakeBusy(true);
    try{
      const r = await fetch('/api/registry/lookup', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ varUser: lookUser }) });
      const t = await r.text(); if(!r.ok) throw new Error(`lookup HTTP ${r.status} ${t}`);
      const j = JSON.parse(t);
      const opts: string[] = Array.isArray(j?.options)? j.options : [];
      setBuildings(opts); setPicked(prev=> prev && opts.includes(prev)? prev : (opts[0]||''));
      setIntakeMsg('');
    }catch(e:any){ setIntakeMsg(e?.message||String(e)); }
    finally{ setIntakeBusy(false); }
  }

  async function loadSelected(){
    if(!picked) return;
    setIntakeMsg(''); setIntakeBusy(true);
    try{
      const r = await fetch('/api/forms/read', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ varUser: lookUser, varBldg: picked }) });
      const t = await r.text(); if(!r.ok) throw new Error(`read HTTP ${r.status} ${t}`);
      const j = JSON.parse(t);
      if(!j?.schema) throw new Error('schema が空です');
      localStorage.setItem('cv_form_base_v049', JSON.stringify(j.schema));
      builder.hydrateFrom(j.schema);
      alert(`読込完了: ${picked}`);
    }catch(e:any){ setIntakeMsg(e?.message||String(e)); }
    finally{ setIntakeBusy(false); }
  }

  // ===== カラー設定 =====
  const themeItems: { k: Theme; name: string; bg: string; fg: string; border: string }[] = [
    { k: 'white',  name: '白', bg: '#ffffff', fg: '#111111', border: '#d9dfec' },
    { k: 'black',  name: '黒', bg: '#141d3d', fg: '#eef3ff', border: '#2b3a6f' },
    { k: 'red',    name: '赤', bg: '#fc8b9b', fg: '#2a151a', border: '#4b2a32' },
    { k: 'blue',   name: '青', bg: '#7fb5ff', fg: '#112449', border: '#254072' },
    { k: 'yellow', name: '黄', bg: '#ffd75a', fg: '#332f12', border: '#4d4622' },
    { k: 'green',  name: '緑', bg: '#5ce0b1', fg: '#0f241e', border: '#234739' },
  ];

  // ===== 対象外(非適用) UI（現行コードのまま） =====
  const pages = builder.pages as any[]; const fields = builder.fields as any[];
  const sectionPages = useMemo(()=>pages.filter(p=>p.type==='section'),[pages]);
  const fieldsByPage = useMemo(()=>{ const m:Record<string,any[]> = {}; for(const f of fields){ const pid=f.pageId??''; (m[pid]=m[pid]||[]).push(f); } return m; },[fields]);
  const [excludedPages,setExcludedPages] = useState<Set<string>>(()=>new Set());
  const [excludedFields,setExcludedFields] = useState<Set<string>>(()=>new Set());
  useEffect(()=>{ localStorage.setItem('cv_excluded_pages', JSON.stringify(Array.from(excludedPages))); localStorage.setItem('cv_excluded_fields', JSON.stringify(Array.from(excludedFields))); },[excludedPages,excludedFields]);
  const toggleSectionExclude=(pageId:string, fieldIds:string[])=>{
    setExcludedPages(prev=>{ const next=new Set(prev); next.has(pageId)?next.delete(pageId):next.add(pageId); return next;});
    setExcludedFields(prev=>{ const next=new Set(prev); const nowExcluded = excludedPages.has(pageId); if(nowExcluded){ fieldIds.forEach(id=>next.delete(id)); } else { fieldIds.forEach(id=>next.add(id)); } return next;});
  };
  const toggleFieldExclude=(fid:string)=>{ setExcludedFields(prev=>{ const next=new Set(prev); next.has(fid)?next.delete(fid):next.add(fid); return next; }); };

  return (
    <div className="space-y-6">
      {/* Intake（サーバ読込） */}
      <SectionCard id="intake" title="建物用フォームを読み込む（サーバ上の JSON）">
        <div className="flex items-center gap-2" style={{flexWrap:'wrap'}}>
          <select className="input" style={{minWidth:320}} value={picked} onChange={e=>setPicked(e.target.value)}>
            {buildings.length===0 ? <option value="">（建物がありません）</option> : buildings.map(x=><option key={x} value={x}>{x}</option>)}
          </select>
          <button className="btn" onClick={loadSelected} disabled={!picked||intakeBusy}>読込</button>
          <button className="btn-secondary" onClick={reloadBuildings} disabled={intakeBusy}>再取得</button>
          {intakeMsg && <span className="text-red-500 text-xs whitespace-pre-wrap">{intakeMsg}</span>}
        </div>
      </SectionCard>

      {/* フォームカラー設定 */}
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

      {/* 対象外(非適用)設定 */}
      <SectionCard id="exclude" title="対象外(非適用)設定">
        <div className="text-xs text-slate-500 mb-2">セクション単位・項目単位で「対象外」にできます。緑＝表示中、赤＝非表示。</div>
        <div className="space-y-3">
          {sectionPages.map(p=>{
            const fs = (fieldsByPage[p.id] ?? []) as any[];
            const fids = fs.map((f:any,idx:number)=>(f.id??f.label??`f-${idx}`) as string).filter(Boolean);
            const pageExcluded = excludedPages.has(p.id);
            const allFieldExcluded = fids.length>0 && fids.every(id => excludedFields.has(id));
            const sectionExcluded = pageExcluded || allFieldExcluded;
            return (
              <details key={p.id} className="border border-slate-300 rounded-md bg-white shadow-sm">
                <summary className="cursor-pointer flex items-center justify-between px-3 py-2">
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{p.title || 'セクション'}</div>
                    {p.description && <div style={{ fontSize: 14, color: '#6B7280', marginTop: 2 }}>{p.description}</div>}
                  </div>
                  <button type="button" onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); toggleSectionExclude(p.id, fids); }}
                    style={{ fontSize:12,padding:'4px 10px',borderRadius:9999,border:`1px solid ${sectionExcluded?'#fecaca':'#bbf7d0'}`,backgroundColor:sectionExcluded?'#fee2e2':'#dcfce7',color:sectionExcluded?'#b91c1c':'#166534',fontWeight:600,minWidth:68,textAlign:'center' }}>
                    {sectionExcluded ? '非表示' : '表示中'}
                  </button>
                </summary>
                <div className="px-3 pb-3 pt-2 border-t border-dashed border-slate-200">
                  {fs.length===0 ? (<div style={{ fontSize:12,color:'#D1D5DB',marginTop:4 }}>（項目なし）</div>) : (
                    <div className="mt-2 space-y-1">
                      {fs.map((f:any,idx:number)=>{
                        const fid=(f.id??f.label??`f-${idx}`) as string;
                        const label=(f.label??'(ラベル未設定)') as string;
                        const fExcluded = excludedFields.has(fid);
                        return (
                          <label key={fid} className="flex items-center justify-between" style={{ fontSize:14 }}>
                            <span>{label}</span>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                              <span style={{ fontSize:11,padding:'2px 6px',borderRadius:9999,backgroundColor:fExcluded?'#fee2e2':'#dcfce7',color:fExcluded?'#b91c1c':'#166534',border:`1px solid ${fExcluded?'#fecaca':'#bbf7d0'}` }}>
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

      {/* 建物フォルダ作成とURL発行（既存のまま） */}
      <SectionCard id="folder" title="建物フォルダ作成とURL発行">
        <BuildingFolderPanel createUrl={createUrl} statusUrl={statusUrl} defaultUser={defaultUser} defaultHost={defaultHost} />
      </SectionCard>

      {/* ステータス */}
      <SectionCard id="status" title="ステータス">
        <BuildStatus user={'form_PJ1'} bldg={'テストビルA'} justTriggered={false} statusUrl={statusUrl} />
      </SectionCard>
    </div>
  );
}
