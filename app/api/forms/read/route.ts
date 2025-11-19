export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
const FLOW_READ_FILE_URL = process.env.FLOW_READ_FILE_URL!;

export async function POST(req: Request) {
  try {
    const { path } = await req.json();
    if (!path) return NextResponse.json({ ok:false, reason:"path 未指定" }, { status: 400 });
    if (!FLOW_READ_FILE_URL) return NextResponse.json({ ok:false, reason:"FLOW_READ_FILE_URL 未設定" }, { status: 500 });

    const res = await fetch(FLOW_READ_FILE_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json; charset=utf-8" },
      body: JSON.stringify({ path }),
      cache:"no-store"
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status} ${text}`);

    return new NextResponse(text, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } });
  } catch (e:any) {
    return NextResponse.json({ ok:false, reason: e?.message || "unexpected" }, { status: 500 });
  }
}
