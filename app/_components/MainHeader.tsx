"use client";
import * as React from "react";
import Link from "next/link";

const APP_VER = process.env.NEXT_PUBLIC_APP_VERSION || "";

export default function MainHeader() {
  const [open, setOpen] = React.useState(false);

  // ESCで閉じる
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backdropFilter: "saturate(180%) blur(6px)",
          background: "rgba(17,24,39,.75)",
          borderBottom: "1px solid #1f2937",
        }}
      >
        <div className="container" style={{display:"flex",alignItems:"center",justifyContent:"space-between",height:56}}>
          <Link href="/" style={{textDecoration:"none", color:"#cfe0ff", fontWeight:700}}>
            CV-FormLink
          </Link>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            {APP_VER && <span style={{fontSize:12, color:"#94a3b8"}}>{APP_VER}</span>}
            <button
              aria-label="メニュー"
              onClick={() => setOpen(true)}
              style={{
                width:36,height:36, display:"grid", placeItems:"center",
                border:"1px solid #334155", borderRadius:8, background:"transparent", color:"#cfe0ff"
              }}
            >
              {/* ハンバーガー（三） */}
              <div style={{width:18, height:2, background:"#cfe0ff", marginBottom:3}}/>
              <div style={{width:18, height:2, background:"#cfe0ff", marginBottom:3}}/>
              <div style={{width:18, height:2, background:"#cfe0ff"}}/>
            </button>
          </div>
        </div>
      </header>

      {/* オーバーレイ（クリックで閉じる） */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position:"fixed", inset:0, background:"rgba(0,0,0,.35)", zIndex:49
          }}
        />
      )}

      {/* 右上の小窓ドロワー */}
      <aside
        aria-hidden={!open}
        style={{
          position:"fixed", top:10, right:10, width:300, maxWidth:"90vw",
          background:"#0b1220", border:"1px solid #1f2937", borderRadius:10,
          boxShadow:"0 10px 24px rgba(0,0,0,.35)", zIndex:50,
          transform: open ? "translateY(0)" : "translateY(-8px)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition:"all .15s ease"
        }}
      >
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", borderBottom:"1px solid #1f2937"}}>
          <div style={{fontWeight:700, color:"#cfe0ff"}}>メニュー</div>
          <button onClick={()=>setOpen(false)} aria-label="閉じる"
            style={{border:"1px solid #334155", background:"transparent", color:"#cfe0ff", borderRadius:6, padding:"4px 8px"}}
          >閉じる</button>
        </div>
        <nav style={{display:"grid", gap:6, padding:10}}>
          <NavItem href="/"           label="ホーム" onClick={()=>setOpen(false)} />
          <NavItem href="/builder"    label="社内ビルダー" onClick={()=>setOpen(false)} />
          <NavItem href="/user-builder" label="ユーザー用ビルダー" onClick={()=>setOpen(false)} />
          <NavItem href="/preview"    label="プレビュー" onClick={()=>setOpen(false)} />
          <NavItem href="/fill"       label="入力フォーム" onClick={()=>setOpen(false)} />
          <NavItem href="/help"       label="ヘルプ" onClick={()=>setOpen(false)} />
          <NavItem href="/manual"     label="マニュアル" onClick={()=>setOpen(false)} />
        </nav>
      </aside>
    </>
  );
}

function NavItem({href, label, onClick}:{href:string; label:string; onClick:()=>void;}){
  return (
    <Link href={href} onClick={onClick}
      style={{
        display:"block", padding:"10px 12px", border:"1px solid #1f2937",
        borderRadius:8, color:"#e2e8f0", textDecoration:"none"
      }}
    >
      {label}
    </Link>
  );
}
