// app/fill/FillClient.tsx
"use client";
import React from "react";

type ResolveResp = {
  ok: boolean;
  exists?: boolean;
  url?: string;
  reason?: string;
};

export default function FillClient(props: { user: string; bldg: string; host?: string }) {
  const { user, bldg, host } = props;
  const [url, setUrl] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  // 初回マウントでフォームURLを解決
  React.useEffect(() => {
    let aborted = false;
    (async () => {
      setBusy(true);
      setMsg(null);
      try {
        // サーバー側ルートで OneDrive/status.json → url.txt を解決する実装を想定
        // ここは既に作成済みの app/api/forms/resolve/route.ts を呼び出します
        const res = await fetch("/api/forms/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ varUser: user, varBldg: bldg, varHost: host ?? "" }),
          cache: "no-store",
        });
        const data: ResolveResp = await res.json();
        if (!aborted) {
          if (data.ok && data.exists && data.url) {
            setUrl(data.url);
          } else {
            setUrl(null);
            setMsg(data.reason || "フォームURLが見つかりませんでした。『完成フォームを更新』が未実施の可能性があります。");
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
    return () => {
      aborted = true;
    };
  }, [user, bldg, host]);

  return (
    <div className="card" style={{ padding: 12 }}>
      <div className="form-title">建物フォーム</div>
      <div className="text-sm" style={{ color: "#6B7280", marginBottom: 8 }}>
        user: <code>{user}</code> ／ bldg: <code>{bldg}</code>
      </div>

      {busy && <div className="hint">照会中…</div>}
      {msg && !busy && <div className="hint" style={{ color: "#b91c1c" }}>{msg}</div>}

      {url ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", height: "75vh", marginTop: 8 }}>
          <iframe src={url} style={{ width: "100%", height: "100%", border: 0 }} title="building-form" />
        </div>
      ) : !busy ? (
        <div style={{ padding: 8, border: "1px dashed #CBD5E1", borderRadius: 8, color: "#334155", marginTop: 8 }}>
          フォームURLが取得できません。ビルダーで建物フォルダ作成→URL/QR発行→完成フォーム更新の順で整備してください。
        </div>
      ) : null}
    </div>
  );
}
