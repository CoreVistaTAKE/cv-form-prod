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

/**
 * NOTE:
 * - 「空」は通常状態なのでエラー扱いしない（赤字を出さない）
 * - 送信時にだけ必須チェックする
 */
function validateBldgNameNonEmptyOnly(nameRaw: string) {
  const name = (nameRaw || "").trim();

  // 空はここではOK（通常状態）
  if (!name) return "";

  if (name.length > 80) return "建物名が長すぎます（80文字以内推奨）。";

  // SharePoint/OneDrive フォルダ名で事故りやすい禁止文字
  if (/[\/\\:*?"<>|]/.test(name)) {
    return '建物名に使用できない文字が含まれています（/ \\ : * ? " < > |）。';
  }

  // 末尾ドット/スペースは事故りやすい
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

  const nonEmptyValidation = useMemo(() => validateBldgNameNonEmptyOnly(bldg), [bldg]);

  const canSubmit = useMemo(() => {
    // ボタンは「入力がある時だけ」押せる
    return !!defaultUser && bldg.trim().length > 0 && !nonEmptyValidation && !busy;
  }, [defaultUser, bldg, nonEmptyValidation, busy]);

  async function submit() {
    if (busyRef.current) return;

    const user = (defaultUser || "").trim();
    const name = (bldg || "").trim();

    if (!user) {
      setMsg("user が空です（defaultUser が未設定）。");
      return;
    }

    // ★必須チェックは「送信時だけ」
    if (!name) {
      setMsg(""); // 空は通常。赤字も出さない。
      return;
    }

    // ★禁止文字などは送信時に弾く（ここは出してOK）
    const vErr = validateBldgNameNonEmptyOnly(name);
    if (vErr) {
      setMsg(vErr);
      return;
    }

    const requestId = uuidLike();

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
          setMsg("同じ建物の作成がすでに実行中です。少し待って進捗をご確認ください。");
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

      // ここで msg を強く出す必要なし。BuildStatus 側で見せる。
      setMsg("");
      onBuilt?.(info);
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const isHardError =
    msg.includes("HTTP") || msg.includes("タイムアウト") || msg.includes("INFLIGHT") || msg.includes("失敗");

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
          placeholder="建物フォルダ名（例：FirstService_001_テストビル）"
          value={bldg}
          onChange={(e) => setBldg(e.target.value)}
          disabled={busy}
        />

        <button className="btn" type="submit" disabled={!canSubmit}>
          {busy ? "作成中..." : "作成する"}
        </button>
      </form>

      {/* 空欄は通常なので、赤字を出さない。必要なら送信時 msg のみ */}
      {!!msg && (
        <div className="text-xs whitespace-pre-wrap" style={{ color: isHardError ? "#dc2626" : "#64748b" }}>
          {msg}
        </div>
      )}
    </div>
  );
}
