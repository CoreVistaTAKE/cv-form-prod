// app/fill/FillClient.tsx
"use client";

import * as React from "react";
import { Wizard } from "@/components/Wizard";
import { useBuilderStore } from "@/store/builder";
import { applyTheme } from "@/utils/theme";

type Props = {
  user: string;
  bldg: string;
};

export default function FillClient({ user, bldg }: Props): JSX.Element {
  const builder = useBuilderStore();

  React.useEffect(() => {
    // 初期化（既に初期化済みなら内部で1回だけ）
    builder.initOnce();

    // 建物コンテキストをメタに反映（フォームUI側が参照すると想定）
    try {
      builder.setMeta({
        fixedCompany: user,
        fixedBuilding: bldg,
      });
    } catch {
      // setMeta未対応でもUIは継続
    }

    // テーマ適用（ローカル保存があればそれを優先）
    try {
      const theme = localStorage.getItem("cv_theme") || builder.meta.theme || "black";
      applyTheme(theme as any);
    } catch {
      // noop
    }

    // 直近利用の建物を記録（任意）
    try {
      localStorage.setItem("cv_last_building", `${user}__${bldg}`);
    } catch {
      // noop
    }
  }, [user, bldg, builder]);

  // そのままフォームウィザードを表示
  return <Wizard />;
}
