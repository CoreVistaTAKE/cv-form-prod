"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useBuilderStore } from "@/store/builder";

const PAGE_LABEL: Record<string,string> = {
  info:"フォーム情報", revise:"修正ページ", basic:"基本情報",
  previous:"前回点検時の状況", section:"セクション", review:"最終確認", complete:"完了"
};
const TYPE_LABEL: Record<string,string> = {
  forminfo:"フォーム設定", text:"短文", textarea:"段落", number:"数値", date:"日付", time:"時刻",
  select:"選択", radio:"ラジオ", checkbox:"チェックボックス", file:"ファイル/写真"
};

export default function PreviewPage(){
  const { initOnce, meta, pages, fields } = useBuilderStore();
  useEffect(()=>{ initOnce(); },[initOnce]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  useEffect(()=>{ const m:Record<string,boolean>={}; pages.forEach(p=>m[p.id]=true); setExpanded(m); },[pages]);
  const toggleAll=(open:boolean)=>{ const m:Record<string,boolean>={}; pages.forEach(p=>m[p.id]=open); setExpanded(m); };

  const issues = useMemo(()=>{
    const labels = fields.map(f=>(f.label||"").trim()).filter(Boolean);
    const dupSet = new Set(labels.filter((l, i)=> labels.indexOf(l)!==i));
    const duplicates = Array.from(dupSet);
    const empties = fields.filter(f=>!f.label || !String(f.label).trim()).map(f=>f.key);
    const tooManyOptions = fields.filter(f=>Array.isArray(f.options) && f.options.length>10).map(f=>f.label||f.key);
    return { duplicates, empties, tooManyOptions };
  },[fields]);

  const byPageId = useMemo(()=>{
    const m:Record<string, typeof fields> = {};
    for(const p of pages) m[p.id] = [];
    for(const f of fields) { (m[f.pageId] = m[f.pageId] || []).push(f); }
    return m;
  },[pages,fields]);

  const downloadJson=()=>{
    const data = localStorage.getItem("cv_form_schema_v049") || JSON.stringify({meta,pages,fields},null,2);
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));
    a.download="form_schema_v049.json";
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="form-title">フォーム プレビュー</div>
        <div className="gap-2">
          <button className="btn-secondary" onClick={()=>toggleAll(true)}>すべて展開</button>
          <button className="btn-secondary" onClick={()=>toggleAll(false)}>すべて折りたたみ</button>
          <button className="btn-secondary" onClick={()=>window.print()}>印刷 / PDF保存</button>
          <button className="btn" onClick={downloadJson}>スキーマJSON</button>
        </div>
      </div>

      <div className="card">
  <div style={{display:"flex", justifyContent:"flex-end", marginBottom:12}}>
    <a href="/finalize" className="btn" style={{textDecoration:"none"}}>完成フォームを更新</a>
  </div>
        <div className="form-title mb-1">{meta.title||"無題のフォーム"}</div>
        {(meta.descriptions||[]).filter(Boolean).map((d,i)=>(<p key={i} className="form-text">{d}</p>))}
      </div>

      {(issues.duplicates.length>0 || issues.empties.length>0 || issues.tooManyOptions.length>0) && (
        <div className="card">
          <div className="form-title">注意点（ビルダーで修正推奨）</div>
          {issues.duplicates.length>0 && (<div className="form-text">重複ラベル: {issues.duplicates.join(", ")}</div>)}
          {issues.empties.length>0 && (<div className="form-text">ラベル未設定: {issues.empties.length} 件</div>)}
          {issues.tooManyOptions.length>0 && (<div className="form-text">選択肢が10件超: {issues.tooManyOptions.join(", ")}</div>)}
        </div>
      )}

      {pages.map((p,idx)=>{
        const showFields = ["basic","section"].includes(p.type);
        const myFields = byPageId[p.id] || [];
        const open = expanded[p.id];
        return (
          <div key={p.id} className="card">
            <div className="flex items-center justify-between">
              <button onClick={()=>setExpanded(s=>({...s,[p.id]:!s[p.id]}))} className="btn-secondary">
                {open? "−":"＋"} {idx+1}. {p.title || (PAGE_LABEL[p.type] || p.type)}
              </button>
              <div className="badge">{p.type}</div>
            </div>
            {open && showFields && (
              <div className="space-y-2 mt-2">
                {myFields.length===0 && <div className="form-text" style={{opacity:.7}}>部品はありません。</div>}
                {myFields.map(f=>(
                  <div key={f.id} className="card">
                    <div className="flex items-center justify-between">
                      <div className="form-text"><strong>{f.label||"(ラベル未設定)"}</strong> {f.required && <span style={{color:"#f99"}}>＊必須</span>}</div>
                      <div className="badge">{TYPE_LABEL[f.type]||f.type}</div>
                    </div>
                    {!!f.description && <div className="form-text mt-1" style={{opacity:.85}}>{f.description}</div>}
                  </div>
                ))}
              </div>
            )}
            {open && !showFields && <div className="form-text mt-2" style={{opacity:.7}}>※ システムページ</div>}
          </div>
        );
      })}

      <div>
        <hr style={{borderColor:"var(--border)"}}/>
        <div className="text-right mt-3">
          <Link href="/finalize" className="btn">完成フォームを作成する</Link>
        </div>
      </div>
    </div>
  );
}
