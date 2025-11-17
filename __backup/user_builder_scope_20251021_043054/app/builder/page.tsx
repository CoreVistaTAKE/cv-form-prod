"use client";

import { useEffect } from "react";
import { useBuilderStore } from "@/store/builder";
import { PagesSidebar } from "@/components/PagesSidebar";
import { PageCanvas } from "@/components/PageCanvas";
import { applyTheme } from "@/utils/theme";

function BuilderOps(){
  const { resetAll } = useBuilderStore();
  const exportSchema=()=>{ const data=localStorage.getItem("cv_form_schema_v049")||JSON.stringify({}); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([data],{type:"application/json"})); a.download="form_schema_v049.json"; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500); };
  const importSchema=async()=>{ const input=document.createElement("input"); input.type="file"; input.accept="application/json"; const file=await new Promise<File>(res=>{ input.onchange=()=>res(input.files![0]); input.click(); }); const text=await file.text(); localStorage.setItem("cv_form_schema_v049", text); alert("読み込みました。ページを再読み込みします。"); location.reload(); };
  const exportUserBase=()=>{ const raw = localStorage.getItem("cv_form_schema_v049")||"{}"; try{ const obj=JSON.parse(raw); if(obj?.meta){ obj.meta.fixedCompany = ""; obj.meta.fixedBuilding = ""; } const data = JSON.stringify(obj); localStorage.setItem("cv_form_base_v049", data); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([data],{type:"application/json"})); a.download="form_base_v049.json"; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),500);}catch(e){ alert("エクスポート失敗: "+(e as Error).message); } };
  return (
    <div className="card">
      <div className="form-title mb-2">ビルダー操作</div>
      <div className="flex items-center" style={{gap:8, flexWrap:"wrap"}}>
        <button className="btn-secondary" onClick={importSchema}>インポート</button>
        <button className="btn-secondary" onClick={exportSchema}>エクスポート</button>
        <button className="btn-secondary" onClick={exportUserBase}>ユーザー用ベース書き出し</button>
        <button className="btn-red" onClick={resetAll}>リセット</button>
      </div>
    </div>
  );
}

function ThemePicker(){
  const { meta, setMeta } = useBuilderStore();
  const items = [
    {k:"white" as const, name:"白", bg:"#ffffff", fg:"#111111", border:"#d9dfec"},
    {k:"black" as const, name:"黒", bg:"#141d3d", fg:"#eef3ff", border:"#2b3a6f"},
    {k:"red"   as const, name:"赤", bg:"#fc8b9b", fg:"#2a151a", border:"#4b2a32"},
    {k:"blue"  as const, name:"青", bg:"#7fb5ff", fg:"#112449", border:"#254072"},
    {k:"yellow"as const, name:"黄", bg:"#ffd75a", fg:"#332f12", border:"#4d4622"},
    {k:"green" as const, name:"緑", bg:"#5ce0b1", fg:"#0f241e", border:"#234739"},
  ];
  return (
    <div className="card">
      <div className="form-title mb-2">フォームカラー設定</div>
      <div className="flex items-center" style={{gap:8, flexWrap:"wrap"}}>
        {items.map(t=>(
          <button key={t.k} className="btn" style={{background:t.bg,color:t.fg,border:`1px solid ${t.border}`}}
            onClick={()=>{ setMeta({theme:t.k as any}); localStorage.setItem("cv_theme", t.k); applyTheme(t.k as any); }}>
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function BuilderPage(){
  const { initOnce, meta }=useBuilderStore();
  useEffect(()=>{ initOnce(); },[initOnce]);
  useEffect(()=>{ applyTheme(meta.theme); },[meta.theme]);

  return (
    <div className="grid-2" style={{gridTemplateColumns:"320px 1fr", gap:"16px"}}>
      <div className="space-y-3">
        <BuilderOps/>
        <ThemePicker/>
        <div className="card">
          <PagesSidebar/>
        </div>
      </div>
      <div className="space-y-3">
        <div className="card">
          <PageCanvas/>
        </div>
      </div>
    </div>
  );
}