"use client";
import React from "react";

type ResolveResp = {
  ok: boolean;
  exists?: boolean;
  url?: string;
  reason?: string;
};

type Props = {
  user: string;
  bldg: string;
  host?: string;
};

export default function FillClient({ user, bldg, host }: Props) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    let aborted = false;
    (async () => {
      setBusy(true); setMsg(null);
      try {
        const res = await fetch("/api/forms/resolve", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ varUser: user, varBldg: bldg, varHost: host }),
          cache: "no-store",
        });
        const data: ResolveResp = await res.json();
        if (!aborted) {
          if (data.ok && data.exists && data.url) {
            setUrl(data.url);
          } else {
            setUrl(null);
            setMsg(
              data.reason ||
              "フォームURLが見つかりませんでした。『完成フォームを更新』が未実施の可能性があります。"
            );
          }
        }
      } catch (e: any) {
        if (!aborted) {
          setUrl(null);
          setMsg(e?.message || "通信エラー");
        }
      } finally {
        if (!aborted) setBusy(false);
      }
    })();
    return () => { aborted = true; };
  }, [user, bldg, host]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div className="hint">
          ユーザー: <b>{user}</b> ／ 建物: <b>{bldg}</b>
        </div>
        {url && (
          <a className="btn" href={url} target="_blank" rel="noreferrer">
            新しいタブで開く
          </a>
        )}
      </div>

      {busy && <div className="hint">照会中…</div>}
      {msg && !busy && <div className="hint" style={{ color: "#b91c1c" }}>{msg}</div>}

      {url && !busy && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", height: "75vh" }}>
          <iframe src={url} style={{ width: "100%", height: "100%", border: 0 }} title="building-form" />
        </div>
      )}
    </div>
  );
}
