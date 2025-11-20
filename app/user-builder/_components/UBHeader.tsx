"use client";

import * as React from "react";

export default function UBHeader() {
  return (
    <header
      style={{
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        borderBottom: "1px solid #e5e7eb",
        background: "#0b0f1a",
        color: "#e5edff",
      }}
    >
      {/* 左：ハンバーガー */}
      <button
        aria-label="menu"
        style={{
          width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center",
          borderRadius: 6, border: "1px solid #2b3a6f", background: "transparent", color: "#cfe0ff",
        }}
        onClick={() => { /* 将来メニューを展開する場合はここに処理 */ }}
      >
        ☰
      </button>

      {/* 中央：タイトル */}
      <div style={{ fontWeight: 700, letterSpacing: 0.3 }}>CV-FormLink / ユーザービルダー</div>

      {/* 右：空き（将来用） */}
      <div style={{ width: 36 }} />
    </header>
  );
}
