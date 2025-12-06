"use client";

import { useMemo, useRef, useState } from "react";
import type { Theme } from "@/utils/theme";

type BuiltInfo = {
  user: string;
  bldg: string;
  token?: string;
  statusPath?: string;
  traceId?: string;
  [k: string]: any;
};

type Props = {
  defaultUser: string;
  excludePages: string[];
  excludeFields: string[];
  theme?: Theme;
  onBuilt?: (info: BuiltInfo) => void;
};

const CANONICAL_HOST = process.env.NEXT_PUBLIC_CANONICAL_HOST || "";

function uuidLike() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function normalizeOrigin(input: string) {
  const s = (input || "").trim().replace(/\/+$/, "");
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}

function getVarHost() {
  const canonical = normalizeOrigin(CANONICAL_HOST);
  if (canonical) return canonical;
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

function validateBldgName(nameRaw: string) {
  const name = (nameRaw || "").trim();

  if (!name) return "建物名が空です。";
  if (name.length > 80) return "建物名が長すぎます（80文字以内推奨）。";

  if (/[\/\\:*?"<>|]/.test(name)) {
    return '建物名に使用できない文字が含まれています（/ \\ : * ? " < > |）。';
  }

  if (/[.\s]$/.test(name)) {
    return "建物名の末尾に「.」または空白は使えません。";
  }

  return "";
}

export default function BuildingFolderPanel(props: Props) {
  const { defaultUser, excludePages, excludeFields, theme, onBuilt } = props;

  const [bldg, setBldg] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [msg, setMsg] = useState<string>("");
  const [lastRequestId, setLastRequestId] = useState<string>("");

  const nameErr = useMemo(() => validateBldgName(bldg), [bldg]);

  const canSubmit = useMemo(() => {
    return !!defaultUser && !nameErr && bldg.trim().length > 0 && !busy;
  }, [defaultUser, bldg, busy, nameErr]);

  async function submit() {
    if (busyRef.current) return;

    const user = (defaultUser || "").trim();
    const name = (bldg || "").trim();

    if (!user) {
      setMsg("user が空です（defaultUser が未設定）。");
      return;
    }
    const vErr = validateBldgName(name);
    if (vErr) {
      setMsg(vErr);
      return;
    }

    const requestId = uuidLike();
    setLastRequestId(requestId);

    busyRef.current = true;
    setBusy(true);
    setMsg("");

    try {
      const varHost = getVarHost();

      const r = await fetch("/api/flows/create-form-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,

          user,
          bldg: name,

          varUser: user,
          varBldg: name,
          varHost,
          host: varHost,

          excludePages: Array.isArray(excludePages) ? excludePages : [],
          excludeFields: Array.isArray(excludeFields) ? excludeFields : [],
          theme: theme ?? "",

          meta: {
            excludePages: Array.isArray(excludePages) ? excludePages : [],
            excludeFields: Array.isArray(excludeFields) ? excludeFields : [],
            theme: theme ?? "",
          },
        }),
      });

      const t = await r.text().catch(() => "");
      const j = safeJsonParse(t);

      if (!r.ok || j?.ok === false) {
        const code = j?.code ? String(j.code) : "";
        const reason = j?.reason || `create-folder HTTP ${r.status}`;

        if (r.status === 409 || code === "INFLIGHT") {
          setMsg("同じ建物の作成がすでに実行中です。少し待って進捗を確認してください。（INFLIGHT）");
          return;
        }

        setMsg(`${reason}${code ? ` (${code})` : ""}`);
        return;
      }

      const info: BuiltInfo = {
        user,
        bldg: name,
        token: j?.token,
        statusPath: j?.statusPath || j?.status_path,
        traceId: j?.traceId || j?.trace_id,
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

  const isErrorMsg =
    msg.includes("HTTP") || msg.includes("タイムアウト") || msg.includes("失敗") || msg.includes("INFLIGHT");

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
          placeholder="建物名（例：FirstService_001_テストビル）"
          value={bldg}
          onChange={(e) => setBldg(e.target.value)}
          disabled={busy}
        />

        <button className="btn" type="submit" disabled={!canSubmit}>
          {busy ? "作成中..." : "作成する"}
        </button>
      </form>

      {nameErr && (
        <div className="text-xs whitespace-pre-wrap" style={{ color: "#b91c1c" }}>
          {nameErr}
        </div>
      )}

      {msg && (
        <div className="text-xs whitespace-pre-wrap" style={{ color: isErrorMsg ? "#dc2626" : "#64748b" }}>
          {msg}
        </div>
      )}

      {!!lastRequestId && (
        <div className="text-[11px] text-slate-400">
          requestId: <span className="font-mono">{lastRequestId}</span>
        </div>
      )}
    </div>
  );
}
