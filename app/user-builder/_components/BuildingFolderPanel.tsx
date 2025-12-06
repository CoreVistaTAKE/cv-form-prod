"use client";

import { useMemo, useRef, useState } from "react";
import type { Theme } from "@/utils/theme";

type BuiltInfo = {
  user: string;
  bldg: string;
  token?: string;
  statusPath?: string;
  [k: string]: any;
};

type Props = {
  defaultUser: string;
  excludePages: string[];
  excludeFields: string[];
  theme?: Theme;
  onBuilt?: (info: BuiltInfo) => void;
};

function uuidLike() {
  // ブラウザは crypto.randomUUID がある前提。無い場合のフォールバック。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function BuildingFolderPanel(props: Props) {
  const { defaultUser, excludePages, excludeFields, theme, onBuilt } = props;

  const [bldg, setBldg] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [msg, setMsg] = useState<string>("");

  const counts = useMemo(() => {
    return {
      pages: Array.isArray(excludePages) ? excludePages.length : 0,
      fields: Array.isArray(excludeFields) ? excludeFields.length : 0,
    };
  }, [excludePages, excludeFields]);

  const canSubmit = useMemo(() => {
    return !!defaultUser && bldg.trim().length > 0 && !busy;
  }, [defaultUser, bldg, busy]);

  async function submit() {
    // ★二重送信ブロック（クリック連打/Enter連打/イベント二重発火）
    if (busyRef.current) return;

    const user = (defaultUser || "").trim();
    const name = bldg.trim();

    if (!user || !name) {
      setMsg("user / bldg が空です");
      return;
    }

    const requestId = uuidLike();

    busyRef.current = true;
    setBusy(true);
    setMsg("");

    try {
      const r = await fetch("/api/flows/create-form-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          user,
          bldg: name,
          excludePages: excludePages ?? [],
          excludeFields: excludeFields ?? [],
          theme: theme ?? "",
        }),
      });

      const t = await r.text().catch(() => "");
      const j = t ? JSON.parse(t) : {};

      if (!r.ok || j?.ok === false) {
        const reason = j?.reason || `create-folder HTTP ${r.status}`;
        setMsg(`${reason}${j?.code ? ` (${j.code})` : ""}`);
        return;
      }

      const info: BuiltInfo = {
        user,
        bldg: name,
        token: j?.token,
        statusPath: j?.statusPath || j?.status_path,
        ...j,
      };

      setMsg("作成要求を送信しました。ステータス更新を待っています。");
      onBuilt?.(info);
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex items-center gap-2"
        style={{ flexWrap: "wrap" }}
      >
        <input
          className="input"
          style={{ minWidth: 260 }}
          placeholder="建物名（例：テストA）"
          value={bldg}
          onChange={(e) => setBldg(e.target.value)}
          disabled={busy}
        />

        <button className="btn" type="submit" disabled={!canSubmit}>
          {busy ? "作成中..." : "作成する"}
        </button>

        <div className="text-xs text-slate-500">
          user: <b>{defaultUser}</b> / theme: <b>{theme || "(未設定)"}</b> / 非表示: <b>{counts.pages}</b>セクション・<b>{counts.fields}</b>項目
        </div>
      </form>

      {msg && <div className="text-xs whitespace-pre-wrap" style={{ color: msg.includes("HTTP") || msg.includes("タイムアウト") ? "#dc2626" : "#64748b" }}>{msg}</div>}
    </div>
  );
}
