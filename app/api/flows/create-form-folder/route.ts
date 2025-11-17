// POST { user: string, bldg: string }
import { NextResponse } from "next/server";
import { currentOrigin, postFlow } from "../_lib";

export async function POST(req: Request) {
  const { user, bldg } = await req.json();
  const varHost = currentOrigin(); // 例: https://app.example.com
  const url = process.env.PA_CREATE_FORM_FOLDER_URL!;
  const result = await postFlow(url, { varUser: user, varBldg: bldg, varHost });
  // 期待レスポンス: { ok, user, seq, bldgFolderName }（フローで定義済み）
  return NextResponse.json(result);
}