// app/fill/page.tsx
export const dynamic = "force-dynamic"; // QR直打ちでも常に最新

import FillClient from "./FillClient";

type Props = {
  searchParams?: { user?: string; bldg?: string };
};

export default function FillPage({ searchParams }: Props) {
  const user = (searchParams?.user ?? process.env.NEXT_PUBLIC_DEFAULT_USER ?? "").toString();
  const bldg = (searchParams?.bldg ?? "").toString();
  const host = (process.env.NEXT_PUBLIC_DEFAULT_HOST ?? "").toString();

  // user/bldg が無い時はガード
  if (!user || !bldg) {
    return (
      <div style={{ padding: 16 }}>
        <h1>パラメータ不足</h1>
        <p>URL に <code>?user=xxx&bldg=YYY</code> を指定してください。</p>
      </div>
    );
  }

  // クエリあり → フォーム解決＆埋め込み
  return <FillClient user={user} bldg={bldg} host={host} />;
}
