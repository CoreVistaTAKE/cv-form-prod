'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useBuilderStore } from '@/store/builder';
import { applyTheme, type Theme } from '@/utils/theme';
import BuildingFolderPanel from '../_components/BuildingFolderPanel';
// import BuildStatus from '../_components/BuildStatus.client'; // 固定呼び出しは撤去

type Props = {
  createUrl: string;
  statusUrl: string;
  lookupUrl: string;                    // ★ 追加
  defaultUser?: string | null;
  defaultHost?: string | null;
};

type LookupItem = {
  token: string;        // 例: form_PJ1_001_テスト13
  statusPath: string;   // 例: /drive/root:/01_InternalTest/.../form/status.json
  name?: string;        // 表示名（任意）。無ければ token を使う
  webUrl?: string;      // OneDrive/SharePoint のフォルダURL（返ってくるなら利用）
};

export default function UserBuilderPanels({
  createUrl, statusUrl, lookupUrl, defaultUser, defaultHost,
}: Props) {
  const builder = useBuilderStore();
  useEffect(()=>{ builder.initOnce(); },[builder.initOnce]);
  useEffect(()=>{ applyTheme(builder.meta.theme); },[builder.meta.theme]);

  // ===== カラー設定（既存） =====
  const themeItems: { k: Theme; name: string; bg: string; fg: string; border: string }[] = [
    { k: 'white',  name: '白', bg: '#ffffff', fg: '#111111', border: '#d9dfec' },
    { k: 'black',  name: '黒', bg: '#141d3d', fg: '#eef3ff', border: '#2b3a6f' },
    { k: 'red',    name: '赤', bg: '#fc8b9b', fg: '#2a151a', border: '#4b2a32' },
    { k: 'blue',   name: '青', bg: '#7fb5ff', fg: '#112449', border: '#254072' },
    { k: 'yellow', name: '黄', bg: '#ffd75a', fg: '#332f12', border: '#4d4622' },
    { k: 'green',  name: '緑', bg: '#5ce0b1', fg: '#0f241e', border: '#234739' },
  ];

  // ===== 建物一覧の取得・読込（新規） =====
  const ENV_DEFAULT_USER = process.env.NEXT_PUBLIC_DEFAULT_USER || 'form_PJ1';
  const user = defaultUser || ENV_DEFAULT_USER;

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [items, setItems]     = useState<LookupItem[]>([]);
  const [picked, setPicked]   = useState<string>(""); // token

  const lookup = async () => {
    setError(null); setLoading(true);
    try {
      const res = await fetch(lookupUrl, {
        method: 'POST',
        headers: { 'Content-Type':'application/json; charset=utf-8' },
        body: JSON.stringify({ varUser: user }),
      });
      if(!res.ok){
        const t = await res.text().catch(()=> '');
        throw new Error(`lookup HTTP ${res.status} ${t}`);
      }
      const j:any = await res.json().catch(()=> ({}));
      const arr:any[] = (j.items || j.value || j.buildings || j) as any[];
      const mapped:LookupItem[] = (arr||[]).map((x:any)=>{
        const token = x.token || x.name || x.bldgToken || String(x).trim();
        const statusPath =
          x.statusPath ||
          `/drive/root:/01_InternalTest/${user}/${token}/form/status.json`;
        const name = x.name || token;
        return { token, statusPath, name, webUrl: x.webUrl };
      }).filter(it=>!!it.token && !/BaseSystem/i.test(it.token));
      setItems(mapped);
      if(mapped.length>0) setPicked(mapped[0].token);
    } catch(e:any){
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadFormJson = async () => {
    setError(null); setLoading(true);
    try{
      const it = items.find(x=>x.token===picked);
      if(!it) throw new Error('建物が選択されていません。');
      // 1) status.json → schemaPath を解決
      const stRes = await fetch(statusUrl, {
        method:'POST',
        headers:{'Content-Type':'application/json; charset=utf-8'},
        body: JSON.stringify({ statusPath: it.statusPath }),
      });
      if(!stRes.ok){
        const t = await stRes.text().catch(()=> '');
        throw new Error(`GetBuildStatus ${stRes.status} ${t}`);
      }
      const st:any = await stRes.json().catch(()=> ({}));
      const schemaPath =
        st.schemaPath || st?.body?.schemaPath ||
        (()=>{ // フォールバック：token から推定
          const m = it.token.match(/^[^_]+_(\d+)_([^]+)$/);
          const seq = m? m[1] : '001';
          const bldg = m? m[2] : '';
          return `/drive/root:/01_InternalTest/${user}/${it.token}/form/form_base_${bldg}_${seq}.json`;
        })();

      // 2) /api/forms/read で JSON を取得
      const r = await fetch('/api/forms/read', {
        method:'POST',
        headers:{'Content-Type':'application/json; charset=utf-8'},
        body: JSON.stringify({ schemaPath }),
      });
      if(!r.ok){
        const t = await r.text().catch(()=> '');
        throw new Error(`forms/read ${r.status} ${t}`);
      }
      const json = await r.json();

      // 3) ストアへ適用（ローカルにも保存）
      localStorage.setItem('cv_form_base_v049', JSON.stringify(json));
      builder.hydrateFrom(json);

      alert('建物用フォームを読み込みました。');
    }catch(e:any){
      setError(e?.message || String(e));
    }finally{
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 色設定（既存） */}
      <section className="card">
        <div className="form-title mb-2">フォームカラー設定（フォームに反映）</div>
        <div className="flex items-center" style={{ gap: 8, flexWrap: 'wrap' }}>
          {themeItems.map(t=>(
            <button key={t.k} className="btn"
              style={{background:t.bg,color:t.fg,border:`1px solid ${t.border}`}}
              onClick={()=>{ builder.setMeta({theme:t.k}); localStorage.setItem('cv_theme', t.k); applyTheme(t.k); }}>
              {t.name}
            </button>
          ))}
        </div>
      </section>

      {/* 建物用フォームを読み込む（サーバ上のJSON） */}
      <section className="card">
        <div className="form-title mb-2">建物用フォームを読み込む（サーバ上の JSON）</div>
        <div className="flex items-center gap-2 mb-2">
          <select className="input" style={{minWidth:340}}
            value={picked} onChange={e=>setPicked(e.target.value)}>
            {items.length===0 && <option value="">（建物を取得してください）</option>}
            {items.map(it=>(
              <option key={it.token} value={it.token}>{it.name || it.token}</option>
            ))}
          </select>
          <button className="btn" onClick={loadFormJson} disabled={!picked || loading}>読込</button>
          <button className="btn-secondary" onClick={lookup} disabled={loading}>再取得</button>
          {error && <span className="text-red-500 text-xs whitespace-pre-wrap">{error}</span>}
        </div>
        <div className="text-xs text-slate-500">
          {loading ? 'lookup 実行中…' : (items.length ? `${items.length}件の建物が見つかりました` : 'まだ建物を取得していません')}
        </div>
      </section>

      {/* 建物フォルダ作成 + URL発行（既存） */}
      <section className="card">
        <div className="form-title mb-2">建物フォルダ作成 + URL発行</div>
        <BuildingFolderPanel
          createUrl={createUrl}
          statusUrl={statusUrl}
          defaultUser={defaultUser}
          defaultHost={defaultHost}
        />
      </section>

      {/* ステータス：固定BuildStatus呼び出しは削除。最後の実行は BuildStatus 側が localStorage から自動で拾う実装のため不要。 */}
    </div>
  );
}
