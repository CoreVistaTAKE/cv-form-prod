"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function MainHeader() {
  const ver = process.env.NEXT_PUBLIC_APP_VERSION ?? "v0.60";
  const publicMode = process.env.NEXT_PUBLIC_PUBLIC_MODE === "true";
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;
    const onDocClick = (e: MouseEvent) => {
      if (!details.contains(e.target as Node)) details.open = false;
    };
    const onNavClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a,button");
      if (a) details.open = false;
    };
    document.addEventListener("click", onDocClick);
    details.addEventListener("click", onNavClick);
    return () => {
      document.removeEventListener("click", onDocClick);
      details.removeEventListener("click", onNavClick);
    };
  }, []);

  return (
    <header className="header">
      <div className="header-inner">
        <div className="form-title">CoreVista Form Builder {ver}</div>
        <nav className="nav">
          <details ref={detailsRef} style={{ position: "relative" }}>
            <summary
              aria-label="menu"
              style={{
                listStyle: "none",
                cursor: "pointer",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              ☰
            </summary>
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 8,
                marginTop: 6,
                minWidth: 190,
              }}
            >
              {!publicMode && <div style={{ padding: "4px 0" }}><Link href="/">ホーム</Link></div>}
              {!publicMode && <div style={{ padding: "4px 0" }}><Link href="/builder">社内ビルダー</Link></div>}
              <div style={{ padding: "4px 0" }}><Link href="/user-builder">ユーザービルダー</Link></div>
              <div style={{ padding: "4px 0" }}><Link href="/preview">プレビュー</Link></div>
              <div style={{ padding: "4px 0" }}><Link href="/fill">入力フォーム</Link></div>
              <div style={{ padding: "4px 0" }}><Link href="/manual">マニュアル</Link></div>
              <div style={{ padding: "4px 0" }}><Link href="/help">ヘルプ</Link></div>
            </div>
          </details>
        </nav>
      </div>
    </header>
  );
}