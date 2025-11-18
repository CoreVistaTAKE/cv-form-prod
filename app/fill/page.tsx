// app/fill/page.tsx
export const dynamic = "force-dynamic"; // 常に最新（QR 直打ちでもキャッシュを避ける）

import FillClient from "./FillClient";

type Props = {
  searchParams?: { user?: string; bldg?: string };
};

export default function FillPage({ searchParams }: Props) {
  const user = (searchParams?.user ?? process.env.NEXT_PUBLIC_DEFAULT_USER ?? "").toString();
  const bldg = (searchParams?.bldg ?? "").toString();

  // user/bldg のどちらかでも無いとフォーム出せないので、簡易ガードだけ
  if (!user || !bldg) {
    return (
      <div style={{ padding: 16 }}>
        <h1>パラメータ不足</h1>
        <p>URL に <code>?user=xxx&bldg=YYY</code> を指定してください。</p>
      </div>
    );
  }

  return <FillClient user={user} bldg={bldg} />;
}
