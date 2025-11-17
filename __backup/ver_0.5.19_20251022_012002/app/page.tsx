"use client";

import Link from "next/link";
import { CHANGELOG } from "@/data/changelog";

export default function HomePage(){
  return (
    <div className="space-y-3">
<section data-home-update-version="0.5.18" style="border:1px solid var(--border,#E5E7EB);border-radius:8px;padding:12px;margin:12px 0;background:var(--background,#FFFFFF);color:var(--foreground,#111827)">
  <h2 style="margin:0 0 6px 0;font-size:14px">更新履歴 v0.5.18（2025-10-22）</h2>
  <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.5">
    <li>ユーザー用ビルダー：4枠を指定順に整備（読み込み／フォームカラー設定（フォームに反映）／対象外(非適用)設定／建物フォルダ作成とURL発行）。</li>
    <li>ヘッダー：スマホ小さめ・右ハンバーガーで各枠にリンク。</li>
    <li>配色：既存テーマ変数へ統一（cv系→標準トークン）。</li>
    <li>社内側の混入と余分な ' 行を清掃。</li>
    <li>バックアップ：__backup\ver_0.5.18\*</li>
  </ul>
</section>

<section data-home-update-version="0.5.17" style="border:1px solid var(--border,#E5E7EB);border-radius:8px;padding:12px;margin:12px 0;background:var(--background,#FFFFFF);color:var(--foreground,#111827)">
  <h2 style="margin:0 0 6px 0;font-size:14px">更新履歴 v0.5.17（2025-10-22）</h2>
  <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.5">
    <li>ユーザー用ビルダー：4枠を指定順に整備（読み込み／フォームカラー設定（フォームに反映）／対象外(非適用)設定／建物フォルダ作成とURL発行）。</li>
    <li>ヘッダー：スマホ小さめ・右ハンバーガーで各枠にリンク。</li>
    <li>配色：既存テーマ変数へ統一（cv系→標準トークン）。</li>
    <li>社内側の混入と余分な ' 行を清掃。</li>
    <li>バックアップ：__backup\ver_0.5.17\*</li>
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