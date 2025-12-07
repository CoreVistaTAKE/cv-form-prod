import { redirect } from "next/navigation";

const TOKEN_RE = /^([A-Za-z0-9]+)_(\d{3})_(.+)$/;

export const dynamic = "force-dynamic";

export default function UPage({ params }: { params: { tenant: string; formId: string } }) {
  const tenant = params.tenant || "";
  let formId = params.formId || "";

  // 念のため（encodedが混ざっても死なない）
  try {
    formId = decodeURIComponent(formId);
  } catch {
    // ignore
  }

  const m = TOKEN_RE.exec(formId);

  if (m) {
    const seq = m[2];
    const bldg = m[3];

    const sp = new URLSearchParams();
    sp.set("user", tenant);
    sp.set("bldg", bldg);
    sp.set("Sseq", seq);

    redirect(`/fill?${sp.toString()}`);
  }

  // トークン形式でない場合の逃げ（最低限 user だけ渡す）
  const sp = new URLSearchParams();
  sp.set("user", tenant);
  redirect(`/fill?${sp.toString()}`);
}
