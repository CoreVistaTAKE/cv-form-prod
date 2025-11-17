// POST { user: string }
import { NextResponse } from "next/server";
import { postFlow } from "../_lib";

export async function POST(req: Request) {
  const { user } = await req.json();
  const url = process.env.PA_GET_NEXT_SEQ_URL!;
  const result = await postFlow(url, { username: user });
  // 期待レスポンス: { next: "002" } など
  return NextResponse.json(result);
}