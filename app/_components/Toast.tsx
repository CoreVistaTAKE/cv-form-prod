// app/_components/Toast.tsx
"use client";
import { useEffect, useState } from "react";
export default function Toast({msg, ms=2400}:{msg:string; ms?:number}){
  const [show,setShow]=useState(true);
  useEffect(()=>{const t=setTimeout(()=>setShow(false),ms); return()=>clearTimeout(t);},[ms]);
  if(!show) return null;
  return (
    <div style={{position:"fixed",right:16,bottom:16,background:"#111827",color:"#fff",
      padding:"10px 12px",borderRadius:8,boxShadow:"0 6px 20px rgba(0,0,0,.2)"}}>
      {msg}
    </div>
  );
}