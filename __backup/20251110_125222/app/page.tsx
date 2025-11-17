"use client";

import Link from "next/link";
import { CHANGELOG } from "@/data/changelog";

export default function HomePage(){
  return (
    <div className="space-y-3">













      <div className="grid-2">
        <div className="tile">
          <div>
            <h3>社内ビルダー</h3>
            <p>フォーム構成・セクション・部品・テーマなどを編集。</p>
          </div>
          <div className="actions">
            <Link className="btn" href="/builder">開く</Link>
          </div>
        </div>

        <div className="tile">
          <div>
            <h3>ユーザー用ビルダー</h3>
            <p>建物ごとに必要項目だけを選び、フォームを発行（URL・メモ・QRを作成）。</p>
          </div>
          <div className="actions">
            <Link className="btn" href="/user-builder">開く</Link>
          </div>
        </div>

        <div className="tile">
          <div>
            <h3>入力フォーム</h3>
            <p>現場入力・修正・最終確認・完了までをガイド付きで実施。</p>
          </div>
          <div className="actions">
            <Link className="btn" href="/fill">開く</Link>
          </div>
        </div>

        <div className="tile">
          <div>
            <h3>プレビュー</h3>
            <p>入力画面の一括確認（表示の最終チェック）。</p>
          </div>
          <div className="actions">
            <Link className="btn" href="/preview">開く</Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="form-title mb-2">更新履歴</div>
        <ul className="space-y-2">
          {CHANGELOG.map((c)=>(
            <li key={c.version}>
              <div><strong>{c.version}</strong> <span className="form-text" style={{opacity:.8}}>（{c.date}）</span></div>
              <ul className="space-y-1" style={{marginTop:6}}>
                {c.items.map((it, i)=> (<li key={i} className="form-text">・{it}</li>))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

<section style={{ marginTop: 20 }}>
  <a href="/help"
     style={{ display: "inline-block", padding: "10px 14px",
              border: "1px solid var(--border)", borderRadius: 8, marginRight: 8 }}>
    ヘルプ（使い方）
  </a>
  <a href="/manual"
     style={{ display: "inline-block", padding: "10px 14px",
              border: "1px solid var(--border)", borderRadius: 8 }}>
    マニュアル（詳細手順）
  </a>
</section>
