'use client';

import * as React from 'react';
import ExistingExcludePanel from '../_components/ExistingExcludePanel';
import BuildingFolderPanel from '../_components/BuildingFolderPanel';
import BuildStatus from '../_components/BuildStatus.client';

type Props = {
  createUrl: string;
  statusUrl: string;
  defaultUser?: string | null;
  defaultHost?: string | null;
};

// ページ内の小さなカード。children を必須にせず型エラーを潰す
type SectionCardProps = {
  id?: string;
  title: string;
  children?: React.ReactNode;
};
function SectionCard({ id, title, children }: SectionCardProps) {
  return (
    <section id={id} className="card">
      <div className="form-title mb-2">{title}</div>
      {children}
    </section>
  );
}

export default function UserBuilderPanels({
  createUrl,
  statusUrl,
  defaultUser,
  defaultHost,
}: Props) {
  return (
    <div className="space-y-6">

      {/* 1) 対象外(非適用)設定 */}
      <SectionCard id="exclude" title="対象外(非適用)設定">
        <ExistingExcludePanel />
      </SectionCard>

      {/* 2) 建物フォルダ作成とURL発行 */}
      <SectionCard id="folder" title="建物フォルダ作成とURL発行">
        <BuildingFolderPanel
          createUrl={createUrl}
          statusUrl={statusUrl}
          defaultUser={defaultUser ?? undefined}
          defaultHost={defaultHost ?? undefined}
        />
      </SectionCard>

      {/* 3) ステータス（最後に状況だけサマリ表示） */}
      <SectionCard id="status" title="ステータス">
        <BuildStatus
          user={defaultUser ?? 'form_PJ1'}
          bldg="テストビルA"
          justTriggered={false}
          statusUrl={statusUrl}
        />
      </SectionCard>
    </div>
  );
}
