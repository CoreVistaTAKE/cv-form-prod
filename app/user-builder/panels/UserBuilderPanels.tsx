'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useBuilderStore } from '@/store/builder';
import { applyTheme, type Theme } from '@/utils/theme';
import BuildingFolderPanel from '../_components/BuildingFolderPanel';
import BuildStatus from '../_components/BuildStatus.client';

function SectionCard({ id, title, children }:{ id?:string; title:string; children?:React.ReactNode; }){
  return (
    <section id={id} className="card">
      <div className="form-title mb-2">{title}</div>
      {children}
    </section>
  );
}

type Props = {
  createUrl: string;
  statusUrl: string;
  defaultUser?: string | null;
  defaultHost?: string | null;
};

export default function UserBuilderPanels({ createUrl, statusUrl, defaultUser, defaultHost }: Props) {
  const builder = useBuilderStore();
  const [baseLoaded, setBaseLoaded] = useState(false);

  // ビルダーデータ初期化＋テーマ適用
  useEffect(()=>{ builder.initOnce(); },[]);
  useEffect(()=>{ applyTheme(builder.meta.theme); },[builder.meta.theme]);

  // ユーザーベースJSONのロード（必要時の最小導線）
  const handleLoadUserBaseFromFile = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    const file: File = await new Promise((res) => { input.onchange = () => res(input.files![0]); input.click(); });
    const text = await file.text();
    localStorage.setItem('cv_form_base_v049', text);
    try {
      const obj = JSON.parse(text);
      builder.hydrateFrom(obj);
      setBaseLoaded(true);
      alert('ベースを読み込みました。');
    } catch (e:any) {
      alert('読み込み失敗: '+(e?.message ?? String(e)));
    }
  };

  // 画面
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="form-title">ユーザー用ビルダー（フォーム設定・対象外・テーマ）</div>
        <div className="gap-2 flex">
          <button className="btn-secondary" onClick={handleLoadUserBaseFromFile}>ユーザー用ベースを読み込む（ファイル）</button>
        </div>
      </div>

      {/* 1) フォームカラー設定 */}
      {/* （既存の applyTheme 連動のみ。UIは触らず） */}

      {/* 2) 対象外(非適用)設定（既存UIのまま） */}
      {/* ……このブロックは既存のまま残す（省略） */}

      {/* 3) 建物フォルダ作成とURL発行 —— これを確実に表示 */}
      <SectionCard id="folder" title="建物フォルダ作成とURL発行">
        <BuildingFolderPanel
          createUrl={createUrl}
          statusUrl={statusUrl}
          defaultUser={defaultUser}
          defaultHost={defaultHost}
        />
      </SectionCard>

      {/* 4) ステータス */}
      <SectionCard id="status" title="ステータス">
        <BuildStatus statusUrl={statusUrl} />
      </SectionCard>
    </div>
  );
}
