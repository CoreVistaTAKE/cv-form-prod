"use client";
import { useState } from "react";

type ResolveResp = {
  ok: boolean;
  exists?: boolean;
  url?: string;
  reason?: string;
};

export default function FillClient(props: { defaultUser: string; defaultHost: string }) {
  const [user, setUser] = useState(props.defaultUser);
  const [bldg, setBldg] = useState("");
  const [host, setHost] = useState(props.defaultHost);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!bldg) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/forms/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ varUser: user, varBldg: bldg, varHost: host }),
        cache: "no-store",
      });
      const data: ResolveResp = await res.json();
      if (data.ok && data.exists && data.url) {
        setUrl(data.url);
      } else {
        setUrl(null);
        setMsg(data.reason || "フォームURLが見つかりませんでした。『完成フォームを更新』が未実施の可能性があります。");
      }
    } catch (e: any) {
      setUrl(null);
      setMsg(e?.message || "通信エラー");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="form-title">建物フォームを読み込む（任意）</div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
        <label className="field">
          <div className="label">ユーザー</div>
          <input value={user} onChange={(e) => setUser(e.target.value)} />
        </label>
        <label className="field">
          <div className="label">建物名</div>
          <input value={bldg} onChange={(e) => setBldg(e.target.value)} placeholder="例: テストビルA" />
        </label>
        <label className="field">
          <div className="label">ホスト</div>
          <input value={host} onChange={(e) => setHost(e.target.value)} />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn" onClick={load} disabled={!bldg || busy}>
          {busy ? "照会中…" : "フォームを読み込む"}
        </button>
        {url && (
          <a className="btn" href={url} target="_blank" rel="noreferrer">
            新しいタブで開く
          </a>
        )}
      </div>

      {msg && <div className="hint" style={{ marginTop: 8 }}>{msg}</div>}

      {url && (
        <div style={{ marginTop: 12 }}>
          <iframe src={url} style={{ width: "100%", height: "70vh", border: "1px solid var(--border)" }} />
        </div>
      )}

      <div className="hint" style={{ marginTop: 8 }}>
        ※ 指定しない場合、下の「入力ウィザード」が従来どおり表示されます。
      </div>
    </div>
  );
}
