// POST { user: string, bldg: string, values: any, date?: string, seq?: string }
import { NextResponse } from "next/server";
import { postFlow } from "../_lib";

export async function POST(req: Request) {
  const { user, bldg, values, date, seq } = await req.json();
  const url = process.env.PA_PROCESS_FORM_SUBMISSION_URL!;
  const payload = {
    varUser: user,
    varBldg: bldg,
    varValues: values,             // フロー側の varValues を Object で受ける前提
    varDate: date ?? new Date().toISOString(),
    varSeq: seq ?? ""              // 空ならフロー側ロジックに委ねる
  };
  const result = await postFlow(url, payload);
  return NextResponse.json(result);
}