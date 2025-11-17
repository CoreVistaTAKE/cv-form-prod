import { NextResponse } from "next/server";

export async function POST(request) {
  const url = process.env.FLOW_URL_SAVEFILES;
  if (!url) return NextResponse.json({ ok:false, error:"FLOW_URL_SAVEFILES is not set" }, { status:500 });
  if (/\s|>/.test(url)) return NextResponse.json({ ok:false, error:"FLOW_URL_SAVEFILES に空白/改行/>' が含まれています（1行で設定）" }, { status:400 });

  try {
    const body = await request.json();
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(body)
    });
    const text = await upstream.text();
    let json; try { json = JSON.parse(text); } catch { json = { raw:text }; }
    return NextResponse.json(json, { status: upstream.status });
  } catch (e) {
    return NextResponse.json({ ok:false, error:String(e) }, { status:500 });
  }
}
