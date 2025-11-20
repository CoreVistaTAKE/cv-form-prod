"use client";
import { useState } from "react";
import ChangelogModal from "./ChangelogModal";

export default function VersionBadge(){
  const ver = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";
  const [open,setOpen]=useState(false);
  return (
    <>
      <div onClick={()=>setOpen(true)}
        title="クリックで変更履歴"
        style={{position:"fixed", right:16, bottom:16, zIndex:9999,
                background:"#111827", color:"#fff", border:"1px solid #2b375a",
                padding:"6px 10px", borderRadius:8, cursor:"pointer",
                boxShadow:"0 6px 20px rgba(0,0,0,.35)"}}>
        v{ver}
      </div>
      {open && <ChangelogModal onClose={()=>setOpen(false)}/>}
    </>
  );
}
