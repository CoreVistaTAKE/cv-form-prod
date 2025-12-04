// app/fill/page.tsx
import FillClient from "./FillClient";

const DEFAULT_USER = process.env.NEXT_PUBLIC_DEFAULT_USER || "FirstService";
const DEFAULT_HOST = process.env.NEXT_PUBLIC_DEFAULT_HOST || "";

type PageProps = {
  searchParams?: {
    user?: string;
    bldg?: string;
    Sseq?: string;
    seq?: string;
    host?: string;
  };
};

export default function Page({ searchParams }: PageProps) {
  const user = searchParams?.user || DEFAULT_USER;
  const bldg = searchParams?.bldg || "";
  const seqRaw = searchParams?.Sseq || searchParams?.seq || "";
  const seq = (seqRaw || "001").toString().padStart(3, "0");
  const host = searchParams?.host || DEFAULT_HOST;

  // 同一タブで別物件を開き直すケースの “状態残り” を潰すため key を付与
  const k = `${user}::${seq}::${bldg}`;

  return <FillClient key={k} user={user} bldg={bldg} seq={seq} host={host} />;
}
