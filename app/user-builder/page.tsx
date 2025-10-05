"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useBuilderStore } from "@/store/builder";
import { usePublishStore } from "@/store/publish";
import { slugify } from "@/utils/slug";

type Excludes = { pages:string[]; fields:string[] };

export default function UserBuilderPage(){
  const builder = useBuilderStore();
  const publish = usePublishStore();
  const [baseLoaded,setBaseLoaded]=useState(false);

  const [tenant,setTenant]=useState("default");
  const [name,setName]=useState("");

  const [excludedPages, setExcludedPages] = useState<Set<string>>(new Set());
  const [excludedFields, setExcludedFields] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState("");

  useEffect(()=>{ builder.initOnce(); publish.initOnce(); },[]);
  useEffect(()=>{
    const raw = localStorage.getItem("cv_form_base_v049");
    if(raw){
      try{ const obj=JSON.parse(raw); builder.hydrateFrom(obj); setBaseLoaded(true); }catch{}
    }
  },[builder.hydrateFrom]);

  const meta = builder.meta;
  const pages = builder.pages;
  const fields = builder.fields;

  const sectionPages = useMemo(()=> pages.filter(p=>p.type==="section"), [pages]);
  const fieldsByPage = useMemo(()=>{
    const m:Record<string, typeof fields> = {};
    for(const p of sectionPages){ m[p.id]=[]; }
    for(const f of fields){ if(m[f.pageId]) m[f.pageId].push(f); }
    return m;
  },[fields, sectionPages]);

  async function importBase(){
    const input=document.createElement("input");
    input.type="file"; input.accept="application/json";
    const file = await new Promise<File>(res=>{ input.onchange=()=>res(input.files![0]); input.click(); });
    const text = await file.text();
    localStorage.setItem("cv_form_base_v049", text);
    try{
      const obj = JSON.parse(text);
      builder.hydrateFrom(obj);
      setBaseLoaded(true);
      alert("ベースを読み込みました。フォーム情報と対象外設定を編集して発行できます。");
    }catch(e:any){ alert("読み込み失敗: "+e.message); }
  }

  function togglePage(id:string, checked:boolean){
    setExcludedPages(prev=>{
      const s = new Set(prev);
      if(checked) s.add(id); else s.delete(id);
      // ページ全体を対象外にしたら、その配下の部品も対象外へ
      const fs = fieldsByPage[id]||[];
      setExcludedFields(prevF=>{
        const t = new Set(prevF);
        for(const f of fs){ if(checked) t.add(f.id); else t.delete(f.id); }
        return t;
      });
      return s;
    });
  }

  function toggleField(id:string, checked:boolean){
    setExcludedFields(prev=>{
      const s = new Set(prev);
      if(checked) s.add(id); else s.delete(id);
      return s;
    });
  }

  function bulkExcludeByKeyword(){
    const k = keyword.trim();
    if(!k){ alert("キーワードを入力してください（例：給水、消防など）"); return; }
    const lower = k.toLowerCase();
    const pHits = sectionPages.filter(p=>(p.title||"").toLowerCase().includes(lower)).map(p=>p.id);
    const fHits = fields.filter(f=>(f.label||"").toLowerCase().includes(lower)).map(f=>f.id);
    setExcludedPages(prev=> new Set([...Array.from(prev), ...pHits]));
    setExcludedFields(prev=> new Set([...Array.from(prev), ...fHits]));
  }

  function publishForm(){
    if(!baseLoaded){ alert("ベースが読み込まれていません。まず卸し用ベースをインポートしてください。"); return; }
    if(!name.trim()){ alert("保存名（建物名/会社名）を入力してください。"); return; }
    const schema = { meta, pages, fields };
    const tenantSlug = slugify(tenant||"default");
    const nameSlug = slugify(name);
    const excludes:Excludes = { pages:Array.from(excludedPages), fields:Array.from(excludedFields) };
    const item = publish.publish(tenantSlug, nameSlug, schema, excludes);
    const url = `${location.origin}${item.urlPath}`;
    navigator.clipboard.writeText(url).catch(()=>{});
    alert(`発行しました。\nURLをクリップボードにコピーしました：\n${url}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="form-title">ユーザー用ビルダー（フォーム情報＋対象外設定）</div>
        <div className="gap-2">
          <button className="btn-secondary" onClick={importBase}>卸し用ベースを読み込む</button>
        </div>
      </div>

      {!baseLoaded && (
        <div className="card">
          <div className="form-title mb-1">まだベースが読み込まれていません。</div>
          <p className="form-text">社内ビルダー（/builder）で「卸し用ベースを書き出し」→ この画面で読み込んでください。</p>
        </div>
      )}

      <div className="card">
        <div className="form-title mb-2">フォーム設定（卸し先が編集できる範囲）</div>
        <div className="grid-2">
          <div>
            <label className="label">題名</label>
            <input className="input" value={meta.title} onChange={e=>builder.setMeta({title:e.target.value})}/>
          </div>
          <div>
            <label className="label">内容背景色</label>
            <div className="flex items-center gap-2">
              <input type="color" value={meta.contentBg||"#0b0f1a"} onChange={e=>builder.setMeta({contentBg:e.target.value})}/>
              <input className="input" value={meta.contentBg||"#0b0f1a"} onChange={e=>builder.setMeta({contentBg:e.target.value})}/>
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label className="label">説明（最大10）</label>
          {(meta.descriptions||[]).map((d,i)=>(
            <div key={i} className="flex items-center gap-2 mt-2">
              <textarea className="input" style={{height:80}} value={d} onChange={e=>{
                const arr=[...(meta.descriptions||[])]; arr[i]=e.target.value; builder.setMeta({descriptions:arr});
              }}/>
              <button className="btn-secondary" onClick={()=>{
                const arr=[...(meta.descriptions||[])]; arr.splice(i,1); builder.setMeta({descriptions:arr});
              }}>削除</button>
            </div>
          ))}
          {(meta.descriptions?.length||0)<10 && (
            <button className="btn mt-2" onClick={()=>{
              const arr=[...(meta.descriptions||[])]; arr.push(""); builder.setMeta({descriptions:arr});
            }}>＋ 説明を追加</button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="form-title mb-2">対象外（非適用）設定</div>
        <div className="flex items-center gap-2">
          <input className="input" placeholder="例：給水、消防、貯湯" value={keyword} onChange={e=>setKeyword(e.target.value)}/>
          <button className="btn-secondary" onClick={bulkExcludeByKeyword}>キーワードで対象外にする</button>
        </div>

        <div className="mt-3 space-y-4">
          {sectionPages.map((p)=>{
            const pChecked = excludedPages.has(p.id);
            const fs = fieldsByPage[p.id] || [];
            const allFChecked = fs.length>0 && fs.every(f=>excludedFields.has(f.id));
            return (
              <div key={p.id} className="card">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={pChecked || allFChecked} onChange={e=>togglePage(p.id, e.target.checked)} />
                  <span className="form-text"><strong>{p.title || "セクション"}</strong></span>
                  <span className="badge">部品 {fs.length}</span>
                </label>
                {fs.length>0 && (
                  <div className="mt-2">
                    {fs.map(f=>{
                      const fChecked = excludedFields.has(f.id);
                      return (
                        <label key={f.id} className="flex items-center gap-2 mt-1">
                          <input type="checkbox" checked={fChecked} onChange={e=>toggleField(f.id, e.target.checked)} />
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
        <div className="form-text mt-2" style={{opacity:.75}}>※ 「対象外」にしたセクション/部品は、公開フォームから除外されます。Excel マッピングでも対象外扱いにできます。</div>
      </div>

      <div className="card">
        <div className="form-title mb-2">保存先の論理名</div>
        <div className="grid-2">
          <div>
            <label className="label">テナントキー（URLに使用・半角）</label>
            <input className="input" value={tenant} onChange={e=>setTenant(e.target.value)} placeholder="例: firstservice"/>
          </div>
          <div>
            <label className="label">保存名（建物名/会社名）</label>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="例: 〇〇ビル_ファーストサービス"/>
          </div>
        </div>
        <div className="form-text mt-1" style={{opacity:.7}}>※ 発行後のURLは <code>/u/テナントキー/ID</code> になります。</div>
        <div className="text-right mt-3">
          <button className="btn" onClick={publishForm}>フォームを発行（URL作成）</button>
        </div>
      </div>
    </div>
  );
}
