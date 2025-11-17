"use client";

import Link from "next/link";
import { CHANGELOG } from "@/data/changelog";

export default function HomePage(){
  return (
    <div className="space-y-3">
<section data-home-update-version="0.5.23" style={{ border:"1px solid var(--border,#E5E7EB)", borderRadius:8, padding:12, margin:"12px 0", background:"var(--background,#FFFFFF)", color:"var(--foreground,#111827)" }}>
  <h2 style={{ margin:0, marginBottom:6, fontSize:14 }}>更新履歴 v0.5.23（2025-10-22）</h2>
  <ul style={{ margin:0, paddingLeft:18, fontSize:13, lineHeight:1.5 }}>
    <li>ヘッダー：右ハンバーガー化、左タイトルはモバイル小さめ。</li>
    <li>ユーザー用ビルダー：4枠に統一（読み込み／フォームカラー設定（フォームに反映）／対象外(非適用)設定／建物フォルダ作成とURL発行）。</li>
    <li>既存 UI のみ流用（新UIは作らない）。配色は globals.css のトークンに追随。</li>
    <li>バックアップ：__backup\ver_0.5.23\*</li>
  </ul>
</section>

<section data-home-update-version="0.5.22" style={{ border:"1px solid var(--border)", borderRadius:8, padding:12, margin:"12px 0", background:"var(--panel)", color:"var(--text)" }}>
  <h2 style={{ margin:0, marginBottom:6, fontSize:14 }}>更新履歴 v0.5.22（2025-10-22）</h2>
  <ul style={{ margin:0, paddingLeft:18, fontSize:13, lineHeight:1.5 }}>
    <li>ユーザー用ビルダー：4枠に統一（読み込み／フォームカラー設定（フォームに反映）／対象外(非適用)設定／建物フォルダ作成とURL発行）。</li>
    <li>ビルダー内ヘッダー：スマホ小さめ・右ハンバーガー・4リンク（#userbase/#color/#exclude/#folder）。</li>
    <li>既存UI尊重：URL/保存名の枠（既存）・BuildingFolderPanel を採用。</li>
    <li>バックアップ：__backup\ver_0.5.22\*</li>
  </ul>
</section>








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
            <h3>入力（ウィザード）</h3>
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