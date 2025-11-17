import FillClient from "./FillClient";
import { Wizard } from "@/components/Wizard";

export default function FillPage() {
  const defaultUser = process.env.NEXT_PUBLIC_DEFAULT_USER ?? "form_PJ1";
  const defaultHost = process.env.NEXT_PUBLIC_DEFAULT_HOST ?? "https://www.form.visone-ai.jp";

  return (
    <div className="space-y-6">
      <div className="card"><div className="form-title">入力フォーム</div></div>

      <FillClient defaultUser={defaultUser} defaultHost={defaultHost} />

      <div className="divider" style={{margin:"12px 0"}}>または</div>

      <div className="card"><div className="form-title">入力ウィザード（従来どおり）</div></div>
      <Wizard/>
    </div>
  );
}
