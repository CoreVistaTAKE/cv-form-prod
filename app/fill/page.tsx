// app/fill/page.tsx
export const dynamic = "force-dynamic";

import FillClient from "./FillClient";

type Props = {
  searchParams?: { user?: string; bldg?: string; host?: string };
};

export default function FillPage({ searchParams }: Props) {
  const user = (searchParams?.user ?? process.env.NEXT_PUBLIC_DEFAULT_USER ?? "").toString();
  const bldg = (searchParams?.bldg ?? "").toString();
  const host = (searchParams?.host ?? process.env.NEXT_PUBLIC_DEFAULT_HOST ?? "").toString();

  return (
    <div className="space-y-6">
      <div className="card"><div className="form-title">入力フォーム</div></div>
      {/* 直指定があればそのまま解決、なければローカル保存の一覧UIにフォールバック */}
      <FillClient directUser={user} directBldg={bldg} directHost={host} />
    </div>
  );
}