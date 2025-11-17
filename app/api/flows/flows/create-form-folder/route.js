import { NextResponse } from "next/server";
export async function POST(req) {
  const url = process.env.FLOW_URL_CREATEFORMFOLDER;
  if (!url) return NextResponse.json({ ok:false, error:"FLOW_URL_CREATEFORMFOLDER is not set" }, { status:500 });
  if (/\s|>/.test(url)) return NextResponse.json({ ok:false, error:"FLOW_URL_CREATEFORMFOLDER に空白または '>' が含まれています（1行・プレーン文字に修正）" }, { status:400 });
  try {
    const body = await req.json();
    const upstream = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
    const text = await upstream.text(); let json; try{ json=JSON.parse(text);}catch{ json={ raw:text }; }
    return NextResponse.json(json, { status: upstream.status });
  } catch(e) { return NextResponse.json({ ok:false, error:String(e) }, { status:500 }); }
}
