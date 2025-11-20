"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import BuildStatus from "./BuildStatus.client";

type LookupItem = {
  token: string;
  seq: string;
  bldg: string;
  statusPath: string;
  formFolderRel: string;
  schemaPath: string;
  urlPath: string;
  qrPath: string;
};

type Props = {
  createUrl?: string;         // 既存：新規作成フロー用
  statusUrl?: string;         // 既存：GetBuildStatus フロー用
  defaultUser?: string | null;
  defaultHost?: string | null;
};

const ENV_DEFAULT_USER = process.env.NEXT_PUBLIC_DEFAULT_USER || "form_PJ1";
const ENV_DEFAULT_HOST = process.env.NEXT_PUBLIC_DEFAULT_HOST || "https://www.form.visone-ai.jp";

export default function BuildingFolderPanel({
  createUrl,
  statusUrl,
  defaultUser,
  defaultHost,
}: Props) {
  const [user] = useState<string>(defaultUser || ENV_DEFAULT_USER);
  const [host] = useState<string>(defaultHost || ENV_DEFAULT_HOST);

  // ========== 新規作成（従来機能） ==========
  const [bldgCreate, setBldgCreate] = useState<string>("");
  const [traceId, setTraceId] = useState<string | undefined>();
  const [statusPath, setStatusPath] = useState<string | undefined>();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const canRun = useMemo(() => !!bldgCreate.trim(), [bldgCreate]);

  const onRunCreate = useCallback(async () => {
    setError(undefined); setTraceId(undefined); setStatusPath(undefined);
    try {
      if (!bldgCreate.trim()) throw new Error("建物名は必須です。");
      if (!createUrl) throw new Error("FLOW_CREATE_FORM_FOLDER_URL が未設定です。");
      setRunning(true);
      const res = await fetch(createUrl, {
        method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ varUser: user, varBldg: bldgCreate.trim(), varHost: host }),
      });
      if (!res.ok) throw new Error(`CreateFormFolder が失敗: ${res.status} ${await res.text().catch(()=> "")}`);
      const json = await res.json().catch(()=> ({}));
      const tkn = json?.token || (json?.user && json?.seq ? `${json.user}_${json.seq}_${bldgCreate.trim()}` : "");
      const st  = json?.statusPath || "";
      if (!tkn || !st) throw new Error("Flow 応答に token/statusPath がありません。");
      setTraceId(json.traceId); setStatusPath(st);
      try{ localStorage.setItem("cv:lastBuild", JSON.stringify({ user, bldg: bldgCreate.trim(), statusPath: st })); }catch{}
    } catch(e:any){
      setError(e?.message || String(e));
    } finally { setRunning(false); }
  }, [bldgCreate, user, host, createUrl]);

  // ========== 既存の建物を選ぶ（Registry Lookup 経由） ==========
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupErr, setLookupErr] = useState<string | undefined>();
  const [items, setItems] = useState<LookupItem[]>([]);
  const [pickedToken, setPickedToken] = useState<string>("");

  const loadBuildings = useCallback(async () => {
    setLookupErr(undefined); setLookupLoading(true);
    try{
      const r = await fetch(`/api/registry/lookup?user=${encodeURIComponent(user)}`, { cache:"no-store" });
      if(!r.ok) throw new Error(`lookup HTTP ${r.status} ${await r.text().catch(()=> "")}`);
      const j = await r.json();
      if(!j?.ok || !Array.isArray(j?.items)) throw new Error("lookup 返却が不正です。");
      setItems(j.items as LookupItem[]);
      // 直近を初期選択
      const first = (j.items as LookupItem[])[0];
      if(first){ setPickedToken(first.token); setStatusPath(first.statusPath); }
    }catch(e:any){
      setLookupErr(e?.message || String(e));
    }finally{ setLookupLoading(false); }
  }, [user]);

  useEffect(()=>{ /* 初回は押した人だけ実行にする */ },[]);

  // 選択変更時に statusPath を更新
  useEffect(()=>{
    const it = items.find(x=>x.token===pickedToken);
    setStatusPath(it?.statusPath);
  },[pickedToken, items]);

  return (
    <div className="space-y-6">
      {/* 既存の建物を選ぶ */}
      <section className="card">
        <div className="form-title mb-2">既存の建物を選ぶ（最新リストを取得）</div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={loadBuildings} disabled={lookupLoading}>
            {lookupLoading ? "読み込み中..." : "建物を読み込む"}
          </button>
          {lookupErr && <span className="text-xs text-red-600 whitespace-pre-wrap">{lookupErr}</span>}
        </div>

        {items.length>0 && (
          <div className="mt-3 flex items-center gap-2">
            <label className="form-text">建物フォルダ</label>
            <select className="input" value={pickedToken} onChange={e=>setPickedToken(e.target.value)}>
              {items.map(it=>(
                <option key={it.token} value={it.token}>{it.token}（{it.bldg} / {it.seq}）</option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* ステータス（既存・新規どちらの経路でも表示可能） */}
      <section className="card">
        <div className="form-title mb-2">ステータス</div>
        <BuildStatus user={user} bldg={""} statusPath={statusPath} statusUrl={statusUrl} justTriggered={false}/>
      </section>

      {/* 新規作成（従来どおり） */}
      <section className="card">
        <div className="form-title mb-2">建物フォルダ作成 + URL発行（新規）</div>
        <div className="grid gap-3" style={{gridTemplateColumns:"1fr"}}>
          <label className="flex flex-col">
            <span className="form-text mb-1">建物名</span>
            <input className="input" value={bldgCreate} onChange={e=>setBldgCreate(e.target.value)} placeholder="例: テストビルA" />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn" onClick={onRunCreate} disabled={!canRun || running}>
            {running ? "実行中..." : "建物フォルダ作成 + URL発行"}
          </button>
          {error && <span className="text-red-500 text-xs whitespace-pre-wrap">{error}</span>}
        </div>
      </section>
    </div>
  );
}
