"use client";
import React, { useState } from "react";

export default function UBHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header style={{
      borderBottom: "1px solid var(--border, #E5E7EB)",
      background: "var(--background, #FFFFFF)",
      color: "var(--foreground, #111827)",
      padding: "8px 12px",
      marginBottom: 12
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 14, lineHeight: "18px" }}>ユーザービルダー</h1>
        <button
          aria-label="menu"
          onClick={() => setOpen(v => !v)}
          style={{
            fontSize: 16, lineHeight: "16px",
            background: "transparent",
            border: "1px solid var(--border, #E5E7EB)",
            borderRadius: 6, padding: "6px 10px", cursor: "pointer"
          }}
        >☰</button>
      </div>
      {open && (
        <nav aria-label="builder links" style={{ marginTop: 8 }}>
          <a href="#color"   style={{ display: "block", margin: "6px 0", fontSize: 12 }}>フォームカラー設定</a>
          <a href="#exclude" style={{ display: "block", margin: "6px 0", fontSize: 12 }}>対象外設定</a>
          <a href="#folder"  style={{ display: "block", margin: "6px 0", fontSize: 12 }}>建物フォルダ作成とURL発行</a>
        </nav>
      )}
    </header>
  );
}