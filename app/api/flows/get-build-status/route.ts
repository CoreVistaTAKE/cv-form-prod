// POST { user: string, bldg: string }
import { NextResponse } from "next/server";
import { postFlow } from "../_lib";

export async function POST(req: Request) {
  const { user, bldg } = await req.json();
  const url = process.env.PA_GET_BUILD_STATUS_URL!;
  const status = await postFlow(url, { varUser: user, varBldg: bldg });
  // 期待レスポンス: { ok:true, user, bldg, pct:10|40|80|100, step, url, qrPath, updatedAt }
  return NextResponse.json(status);
}