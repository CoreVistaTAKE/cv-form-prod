// app/fill/page.tsx
export const dynamic = "force-dynamic";

import FillClient from "./FillClient";

type Props = {
  searchParams?: { user?: string; bldg?: string; host?: string };
};

export default function FillPage({ searchParams }: Props) {
  const user =
    (searchParams?.user ?? process.env.NEXT_PUBLIC_DEFAULT_USER ?? "").toString();
  const bldg = (searchParams?.bldg ?? "").toString();
  const host =
    (searchParams?.host ?? process.env.NEXT_PUBLIC_DEFAULT_HOST ?? "").toString();

  // user/bldg のどちらかでも欠けていればガイド表示
  if (!user || !bldg) {
    return (
      <div style={{ padding: 16 }}>
        <h1>パラメータ不足</h1>
        <p>
          URL に <code>?user=xxx&bldg=YYY</code> を指定してください。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card"><div className="form-title">入力フォーム</div></div>
      {/* 直指定で解決するモード */}
      <FillClient user={user} bldg={bldg} host={host} />
    </div>
  );
}
