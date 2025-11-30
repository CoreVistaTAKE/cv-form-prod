// app/fill/page.tsx
import FillClient from './FillClient';

const DEFAULT_USER = process.env.NEXT_PUBLIC_DEFAULT_USER || 'FirstService';
const DEFAULT_HOST = process.env.NEXT_PUBLIC_DEFAULT_HOST || '';

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
  const bldg = searchParams?.bldg || '';
  const seq = searchParams?.Sseq || searchParams?.seq || '';
  const host = searchParams?.host || DEFAULT_HOST;

  return <FillClient user={user} bldg={bldg} seq={seq} host={host} />;
}
