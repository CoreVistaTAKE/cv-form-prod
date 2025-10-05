import { Wizard } from "@/components/Wizard";

export default function FillPage(){
  return (
    <div className="space-y-6">
      <div className="card"><div className="form-title">入力ウィザード</div></div>
      <Wizard/>
    </div>
  );
}
