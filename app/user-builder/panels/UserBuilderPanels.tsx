"use client";
import React from "react";

import ExistingExcludePanel from '../../_components/UBHeader';

function SectionCard(props: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={props.id} style={{
      border: "1px solid var(--border, #E5E7EB)",
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
      background: "var(--background, #FFFFFF)",
      color: "var(--foreground, #111827)"
    }}>
      <h2 style={{ margin: 0, marginBottom: 8, fontSize: 14 }}>{props.title}</h2>
      {props.children}
    </section>
  );
}

export default function UserBuilderPanels() {
  return (
    <div>
      {/* 1) ユーザー用ビルダー（フォーム設定・対象外・テーマ）【ユーザー用ベースを読み込む】 */}
      <SectionCard id="userbase" title="ユーザー用ビルダー（フォーム設定・対象外・テーマ）【ユーザー用ベースを読み込む】">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <label style={{ fontSize: 12, display: "flex", flexDirection: "column" }}>
            URL
            <input placeholder="https://example.com/user-base.json"
              style={{ padding: 8, border: "1px solid var(--border, #D1D5DB)", borderRadius: 6,
                       background: "var(--background, #FFFFFF)", color: "var(--foreground, #111827)" }} />
          </label>
          <label style={{ fontSize: 12, display: "flex", flexDirection: "column" }}>
            保存名
            <input placeholder="user_base_01"
              style={{ padding: 8, border: "1px solid var(--border, #D1D5DB)", borderRadius: 6,
                       background: "var(--background, #FFFFFF)", color: "var(--foreground, #111827)" }} />
          </label>
        </div>
        <div style={{ marginTop: 12 }}>
          <button style={{
            padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border, #E5E7EB)",
            background: "var(--primary, #111827)", color: "#FFFFFF", cursor: "pointer", minWidth: 160
          }}>ユーザー用ベースを読み込む</button>
        </div>
      </SectionCard>

      {/* 2) フォームカラー設定（フォームに反映） */}
      <SectionCard id="color" title="フォームカラー設定（フォームに反映）">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
  <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
    Primary <input type="color" />
  </label>
  <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
    Text <input type="color" />
  </label>
  <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
    Surface <input type="color" />
  </label>
  <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
    Border <input type="color" />
  </label>
</div>
      </SectionCard>

      {/* 3) 対象外(非適用)設定 */}
      <SectionCard id="exclude" title="対象外(非適用)設定">
        <ExistingExcludePanel />
      </SectionCard>

      {/* 4) 建物フォルダ作成とURL発行（既存UI） */}
      <SectionCard id="folder" title="建物フォルダ作成とURL発行">
        </SectionCard>
    </div>
  );
}