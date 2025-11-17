"use client";
import { useEffect, useState } from "react";

export default function ChangelogModal({onClose}:{onClose:()=>void}){
  const [txt,setTxt]=useState("読み込み中...");
  useEffect(()=>{
    fetch("/api/changelog").then(async r=>{
      const j=await r.json();
      setTxt(j?.ok ? j.changelog || "(empty)" : "読み込みに失敗しました");
    }).catch(()=>setTxt("読み込みに失敗しました"));
  },[]);
  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,.35)", zIndex:10000}}
         onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
           style={{position:"absolute", right:20, bottom:70, width:"min(680px, 90vw)",
                   background:"#0b1020", color:"#eaf0ff",
                   border:"1px solid #23315f", borderRadius:12, padding:16,
                   boxShadow:"0 8px 30px rgba(0,0,0,.4)"}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
          <strong>Changelog</strong>
          <button onClick={onClose} style={{background:"transparent", color:"#fff", border:"1px solid #3d4b7d", borderRadius:6, padding:"4px 8px", cursor:"pointer"}}>閉じる</button>
        </div>
        <pre style={{whiteSpace:"pre-wrap"}}>{txt}</pre>
      </div>
    </div>
  );
}
