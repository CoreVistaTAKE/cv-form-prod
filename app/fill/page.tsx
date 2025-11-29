// app/fill/page.tsx
import FillClient from "./FillClient";

type PageProps = {
  searchParams?: {
    user?: string;
    bldg?: string;
    Sseq?: string; // URL は Sseq=001
    seq?: string;  // 互換用（念のため）
  };
};

export default function Page({ searchParams }: PageProps) {
  const user =
    searchParams?.user || process.env.NEXT_PUBLIC_DEFAULT_USER || "";
  const bldg = searchParams?.bldg || "";
  const seq = searchParams?.Sseq || searchParams?.seq || "";

  return <FillClient user={user} bldg={bldg} seq={seq} />;
}
