// app/fill/page.tsx
export const dynamic = "force-dynamic";

import FillClient from "./FillClient";

type Props = {
  searchParams?: { user?: string; bldg?: string; host?: string };
};

export default function FillPage({ searchParams }: Props) {
  const user = (searchParams?.user ?? "").toString();
  const bldg = (searchParams?.bldg ?? "").toString();
  const host =
    (searchParams?.host ?? process.env.NEXT_PUBLIC_DEFAULT_HOST ?? "").toString();

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="form-title">入力フォーム</div>
      </div>
      {/* user/bldg があれば“直指定モード”、無ければローカルの建物選択UI */}
      <FillClient user={user} bldg={bldg} host={host} />
    </div>
  );
}
