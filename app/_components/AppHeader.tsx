// app/_components/AppHeader.tsx
"use client";
import Link from "next/link";
export default function AppHeader(){
  return (
    <header style={{borderBottom:"1px solid var(--border,#e5e7eb)",padding:"10px 12px",
      display:"flex",gap:12,alignItems:"center",justifyContent:"space-between"}}>
      <div style={{fontWeight:600}}>CoreVista Form Builder</div>
      <nav style={{display:"flex",gap:10,fontSize:14}}>
        <Link href="/">ホーム</Link>
        <Link href="/builder">社内ビルダー</Link>
        <Link href="/user-builder">ユーザー用ビルダー</Link>
        <Link href="/fill">入力（ウィザード）</Link>
        <Link href="/preview">プレビュー</Link>
      </nav>
    </header>
  );
}