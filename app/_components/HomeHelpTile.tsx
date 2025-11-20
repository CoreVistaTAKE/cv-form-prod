"use client";
import Link from "next/link";

export default function HomeHelpTile() {
  return (
    <div
      className="card"
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
    >
      <div>
        <div className="form-title">使い方ガイド</div>
        <div className="form-text" style={{ opacity: 0.85 }}>
          操作に迷ったらこちらを参照してください。
        </div>
      </div>
      <Link className="btn" href="/help">
        ヘルプを開く
      </Link>
    </div>
  );
}
