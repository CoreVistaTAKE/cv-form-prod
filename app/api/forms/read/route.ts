// app/api/forms/read/route.ts
export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';

const FLOW_READ_FILE_URL = process.env.FLOW_READ_FILE_URL!;

async function postJson<T>(url:string, body:any, timeoutMs=15000): Promise<T>{
  const ctrl = new AbortController();
  const id = setTimeout(()=>ctrl.abort(), timeoutMs);
  try{
    const res = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json; charset=utf-8'},
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    const txt = await res.text();
    if(!res.ok) throw new Error(`HTTP ${res.status} ${txt}`);
    try{ return JSON.parse(txt) as T; }catch{ return {} as T; }
  }finally{ clearTimeout(id); }
}

export async function POST(req: Request){
  try{
    const { formPath } = await req.json();
    const path = String(formPath||'').trim();
    if(!path) return NextResponse.json({ok:false, reason:'formPath required'},{status:400});
    if(!FLOW_READ_FILE_URL) return NextResponse.json({ok:false, reason:'FLOW_READ_FILE_URL not set'},{status:500});

    const resp: any = await postJson(FLOW_READ_FILE_URL, { path });
    const text: string = resp?.text || resp?.body?.text || '';
    if(!text) return NextResponse.json({ok:false, reason:'empty file'},{status:404});
    let json:any;
    try{ json = JSON.parse(text); }catch(e:any){ return NextResponse.json({ok:false, reason:'invalid json: '+e?.message},{status:400}); }
    return NextResponse.json({ ok:true, json });
  }catch(e:any){
    return NextResponse.json({ok:false, reason: e?.message||'unexpected'},{status:500});
  }
}
