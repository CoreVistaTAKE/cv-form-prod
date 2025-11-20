// app/api/registry/lookup/route.ts
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const FLOW_URL = process.env.FLOW_REGISTRY_LOOKUP_URL!;

async function post<T>(url:string, body:any, timeoutMs=15000): Promise<T>{
  const ctrl = new AbortController(); const id=setTimeout(()=>ctrl.abort(), timeoutMs);
  try{
    const r = await fetch(url, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(body),
      cache:"no-store",
      signal: ctrl.signal,
    });
    const txt = await r.text();
    if(!r.ok) throw new Error(`HTTP ${r.status} ${txt}`);
    try{ return JSON.parse(txt) as T; } catch{ return {} as T; }
  } finally { clearTimeout(id); }
}

export async function GET(req: Request){
  try{
    const u = new URL(req.url);
    const user = (u.searchParams.get("user")||"").trim();
    if(!user) return NextResponse.json({ok:false, reason:"user required"}, {status:400});
    if(!FLOW_URL) return NextResponse.json({ok:false, reason:"FLOW_REGISTRY_LOOKUP_URL not set"}, {status:500});
    const data = await post<any>(FLOW_URL, { varUser: user });
    return NextResponse.json({ ok:true, ...data });
  }catch(e:any){
    return NextResponse.json({ ok:false, reason: e?.message||String(e) }, {status:500});
  }
}
