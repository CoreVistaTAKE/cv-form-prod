"use client";

import { useMemo, useRef, useState } from "react";
import type { Theme } from "@/utils/theme";

type BuiltInfo = {
  user: string;
  bldg: string;
  token?: string;
  traceId?: string;
  finalUrl?: string;
  [k: string]: any;
};

type Props = {
  defaultUser: string;
  excludePages: string[];
  excludeFields: string[];
  theme?: Theme;

  onStart?: (info: { user: string; bldg: string; startedAt: number }) => void;
  onBuilt?: (info: BuiltInfo) => void;
  onError?: (reason: string) => void;
};

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

// 空は通常（OK）。入力がある時だけチェックする
function validateBldgIfNotEmpty(nameRaw: string) {
  const name = (nameRaw || "").trim();
  if (!name) return "";
  if (name.length > 80) return "建物名が長すぎます（80文字以内推奨）。";
  if (/[\/\\:*?"<>|]/.test(name)) return '建物名に使用できない文字が含まれています（/ \\ : * ? " < > |）。';
  if (/[.\s]$/.test(name)) return "建物名の末尾に「.」または空白は使えません。";
  return "";
}

export default function BuildingFolderPanel(props: Props) {
  const { defaultUser, excludePages, excludeFields, theme, onStart, onBuilt, onError } = props;

  const [bldg, setBldg] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  const localErr = useMemo(() => validateBldgIfNotEmpty(bldg), [bldg]);

  const canSubmit = useMemo(() => {
    return !!defaultUser && bldg.trim().length > 0 && !localErr && !busy;
  }, [defaultUser, bldg, localErr, busy]);

  async function submit() {
    if (busyRef.current) return;

    const user = (defaultUser || "").trim();
    const name = (bldg || "").trim();
    if (!user) return;

    // 送信時だけ必須（空は通常）
    if (!name) return;

    const vErr = validateBldgIfNotEmpty(name);
    if (vErr) {
      onError?.(vErr);
      return;
    }

    const startedAt = Date.now();
    onStart?.({ user, bldg: name, startedAt });

    // 入力欄は通常「空」に戻す
    setBldg("");

    const requestId = uuidLike();

    busyRef.current = true;
    setBusy(true);

    try {
      const r = await fetch("/api/flows/create-form-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          user,
          bldg: name,

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
          onError?.("同じ建物の作成がすでに実行中です。時間をおいて再実行してください。");
          return;
        }

        onError?.(`${reason}${code ? ` (${code})` : ""}`);
        return;
      }

      // ★ Flow の Response から finalUrl を拾う（キー揺れ吸収）
      const finalUrl =
        j?.finalUrl ||
        j?.final_url ||
        j?.url ||
        j?.formUrl ||
        j?.publicUrl ||
        "";

      onBuilt?.({
        user,
        bldg: name,
        token: j?.token,
        traceId: j?.traceId || j?.trace_id,
        finalUrl: typeof finalUrl === "string" ? finalUrl : "",
        ...j,
      });
    } catch (e: any) {
      onError?.(e?.message || String(e));
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
          placeholder="建物フォルダ名（例：テストビル）"
          value={bldg}
          onChange={(e) => setBldg(e.target.value)}
          disabled={busy}
        />

        <button className="btn" type="submit" disabled={!canSubmit}>
          {busy ? "作成中..." : "作成する"}
        </button>
      </form>

      {/* 空欄は通常なので赤字は出さない。入力がある時だけ禁止文字を出す */}
      {!!localErr && bldg.trim().length > 0 && (
        <div className="text-xs text-red-600 whitespace-pre-wrap">{localErr}</div>
      )}
    </div>
  );
}
