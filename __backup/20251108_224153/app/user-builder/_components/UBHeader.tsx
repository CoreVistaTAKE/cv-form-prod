import * as React from "react";
const APP_VER = process.env.NEXT_PUBLIC_APP_VERSION || '';
"use client";
function __cvCloseMenu(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget as HTMLElement;
  const d = el.closest('details') as HTMLDetailsElement | null;
  if (d && d.hasAttribute('open')) { d.removeAttribute('open'); }
}

export default function ExistingExcludePanel(){
  return (
    <div style={{padding:8, border:"1px dashed #CBD5E1", borderRadius:6, fontSize:12, color:"#334155"}}>
      対象外(非適用)設定パネル（ダミー）。本実装があれば差し替えてください。
    </div>
  );
}
