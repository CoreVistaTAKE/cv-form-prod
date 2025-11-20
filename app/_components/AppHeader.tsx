"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const APP_VER = process.env.NEXT_PUBLIC_APP_VERSION || "";

const navItems = [
  { href: "/home",        label: "Home" },
  { href: "/builder",     label: "社内ビルダー" },
  { href: "/user-builder",label: "ユーザービルダー" },
  { href: "/preview",     label: "プレビュー" },
  { href: "/fill",        label: "入力フォーム" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header style={{borderBottom:"1px solid var(--border)", background:"var(--bg)"}}>
      <div className="container" style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, padding:"10px 0"}}>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <button aria-label="menu" onClick={()=>setOpen(v=>!v)} style={{border:"1px solid var(--border)", background:"transparent", borderRadius:6, padding:"6px 8px", display:"inline-flex"}}>
            ☰
          </button>
          <Link href="/" style={{textDecoration:"none", fontWeight:700}}>CV‑FormLink</Link>
        </div>
        <div style={{fontSize:12, opacity:.7}}>Version: {APP_VER || "-"}</div>
      </div>

      {/* ナビ（PC: 常時、SP: ハンバーガーで開閉） */}
      <nav className="container" style={{paddingBottom: open ? 10 : 0}}>
        <ul style={{
          display: open ? "grid" : "flex",
          gridTemplateColumns: open ? "1fr" : undefined,
          gap: 8, alignItems:"center", listStyle:"none", padding:0, margin:0
        }}>
          {navItems.map(it => {
            const active = pathname === it.href || pathname?.startsWith(it.href + "?");
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  style={{
                    textDecoration:"none",
                    padding:"6px 10px",
                    border:"1px solid var(--border)",
                    borderRadius:6,
                    display:"inline-block",
                    background: active ? "var(--btn-bg)" : "transparent",
                    color: active ? "var(--btn-fg)" : "inherit",
                    fontSize: 14
                  }}
                  onClick={()=>setOpen(false)}
                >
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
