"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useBuilderStore } from "@/store/builder";

type Target = { type:"local"|"onedrive"; url?:string; note?:string; savedAt?:number };

export default function FinalizePage(){
  const { initOnce, meta } = useBuilderStore();
  useEffect(()=>{ initOnce(); },[initOnce]);

  const [targetType,setTargetType] = useState<Target["type"]>("local");
  const [onedriveUrl,setOnedriveUrl] = useState<string>("");
  const [message,setMessage] = useState<string>("");

  function downloadSchemaJson(){
    const data = localStorage.getItem("cv_form_schema_v049") || "{}";
    const a=document.createElement("a");
    a.href=URL.createObjectURL(new Blob([data],{type:"application/json"}));
    a.download="form_schema_v049.json";
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),500);
  }

  function saveTarget(){
    if(targetType==="onedrive"){
      if(!onedriveUrl || !/^https?:\/\//.test(onedriveUrl)){
        setMessage("OneDrive/SharePoint のフォルダURLを入力してください。");
        return;
      }
      const t:Target = { type:"onedrive", url:onedriveUrl.trim(), note:"default output", savedAt:Date.now() };
      localStorage.setItem("cv_output_target", JSON.stringify(t));
      setMessage("保存先を記憶しました（OneDrive/SharePoint）。後で自動出力に使います。");
    }else{
      const t:Target = { type:"local", savedAt:Date.now() };
      localStorage.setItem("cv_output_target", JSON.stringify(t));
      setMessage("保存先を記憶しました（ローカル）。スキーマJSONをダウンロードしてください。");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="form-title">完成フォームの作成</div>
        <div className="gap-2">
          <Link className="btn-secondary" href="/preview">← プレビューに戻る</Link>
          <Link className="btn-secondary" href="/builder">ビルダーへ</Link>
          <Link className="btn-secondary" href="/fill">入力ウィザードへ</Link>
        </div>
      </div>

      <div className="card">
        <div className="form-title mb-1">{meta.title || "無題のフォーム"}</div>
        <p className="form-text" style={{opacity:.8}}>このページでは、完成したフォームを配布・連携できるように「保存先」を決めます。</p>
      </div>

      <div className="card">
        <div className="form-title">保存先の選択</div>

        <label className="flex items-center gap-2 mt-2">
          <input type="radio" checked={targetType==="local"} onChange={()=>setTargetType("local")}/>
          <span className="form-text">ローカル（PCに保存）</span>
        </label>
        {targetType==="local" && (
          <div className="mt-2">
            <p className="form-text">まずはフォーム定義（スキーマJSON）をダウンロードして保存してください。</p>
            <button className="btn mt-2" onClick={downloadSchemaJson}>スキーマJSONをダウンロード</button>
            <p className="form-text" style={{opacity:.7, fontSize:12, marginTop:8}}>※ 今後、Zip化した「完成フォーム配布パッケージ」もここから出力できるようにします。</p>
          </div>
        )}

        <label className="flex items-center gap-2 mt-3">
          <input type="radio" checked={targetType==="onedrive"} onChange={()=>setTargetType("onedrive")}/>
          <span className="form-text">OneDrive / SharePoint（後で自動出力に使用）</span>
        </label>
        {targetType==="onedrive" && (
          <div className="mt-2">
            <label className="label">フォルダURL（例：SharePoint の「報告書」フォルダ）</label>
            <input className="input" value={onedriveUrl} onChange={(e)=>setOnedriveUrl(e.target.value)} placeholder="https://..."/>
            <p className="form-text" style={{opacity:.7, fontSize:12, marginTop:6}}>※ ここで保存したURLはブラウザ内に記憶し、次の工程（Office Scripts + Power Automate）で使用します。</p>
          </div>
        )}

        <div className="text-right mt-3">
          <button className="btn" onClick={saveTarget}>保存先を記憶</button>
        </div>
        {!!message && <div className="form-text" style={{color:"#6ee7b7", marginTop:8}}>{message}</div>}
      </div>
    </div>
  );
}
