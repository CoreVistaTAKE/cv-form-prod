// app/fill/page.tsx
export const dynamic = "force-dynamic";

import FillClient from "./FillClient";
import { Wizard } from "@/components/Wizard";

type Props = {
  searchParams?: { user?: string; bldg?: string };
};

export default function FillPage({ searchParams }: Props) {
  const user = (searchParams?.user ?? "").toString();
  const bldg = (searchParams?.bldg ?? "").toString();

  // URLに user/bldg が揃っていれば、その建物用ウィザードを直接表示
  if (user && bldg) {
    return (
      <div className="space-y-6">
        <div className="card">
          <div className="form-title">入力ウィザード</div>
        </div>
        <FillClient user={user} bldg={bldg} />
      </div>
    );
  }

  // パラメータ不足時は従来のウィザード（共通モード）を出す
  return (
    <div className="space-y-6">
      <div className="card">
        <div className="form-title">入力ウィザード</div>
      </div>
      <Wizard />
    </div>
  );
}
