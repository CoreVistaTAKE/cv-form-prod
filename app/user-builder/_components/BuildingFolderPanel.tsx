"use client";

import { useCallback, useMemo, useState } from "react";
import BuildStatus from "./BuildStatus.client";
import type { Theme } from "@/utils/theme";

type CreateRes = {
  ok?: boolean;
  traceId?: string;
  token?: string;
  bldgFolderName?: string;
  statusPath?: string;
  user?: string;
  seq?: string;
};

type Props = {
  defaultUser?: string | null;
  defaultHost?: string | null;

  // ★運用A：新規作成時にだけ反映する meta
  excludePages: string[];
  excludeFields: string[];
  theme?: Theme;

  onBuilt?: (info: { user: string; bldg: string; token: string; statusPath: string; traceId?: string }) => void;
};

const ENV_DEFAULT_USER = process.env.NEXT_PUBLIC_DEFAULT_USER || "FirstService";
const ENV_DEFAULT_HOST = process.env.NEXT_PUBLIC_DEFAULT_HOST || "https://www.form.visone-ai.jp";

export default function BuildingFolderPanel({
  defaultUser,
  defaultHost,
  excludePages,
  excludeFields,
  theme,
  onBuilt,
}: Props) {
  const [user] = useState<string>(defaultUser || ENV_DEFAULT_USER);
  const [host] = useState<string>(defaultHost || ENV_DEFAULT_HOST);
  const [bldg, setBldg] = useState<string>("");

  const [traceId, setTraceId] = useState<string | undefined>();
  const [token, setToken] = useState<string | undefined>();
  const [statusPath, setStatusPath] = useState<string | undefined>();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const canRun = useMemo(() => !!bldg.trim(), [bldg]);

  const onRun = useCallback(async () => {
    setError(undefined);
    setTraceId(undefined);
    setToken(undefined);
    setStatusPath(undefined);

    try {
      if (!bldg.trim()) throw new Error("建物名は必須です。");
      setRunning(true);

      // ★Flow直叩き禁止。サーバAPIにプロキシさせる
      // ★運用A：exclude/theme はここでだけ渡す（作成後は修正不可）
      const res = await fetch("/api/flows/create-form-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          varUser: user,
          varBldg: bldg.trim(),
          varHost: host,
          excludePages: Array.isArray(excludePages) ? excludePages : [],
          excludeFields: Array.isArray(excludeFields) ? excludeFields : [],
          theme: typeof theme === "string" ? theme : "",
        }),
      });

      const txt = await res.text().catch(() => "");
      if (!res.ok) throw new Error(`create-folder HTTP ${res.status} ${txt}`);

      const json: CreateRes = txt ? JSON.parse(txt) : {};
      if (json?.ok === false) throw new Error("create-folder returned ok:false");

      const folderName = json.bldgFolderName || json.token;
      const stPath = json.statusPath;

      if (!folderName || !stPath) {
        throw new Error("create-folder 応答に token(bldgFolderName) または statusPath がありません。");
      }

      setTraceId(json.traceId);
      setToken(folderName);
      setStatusPath(stPath);

      onBuilt?.({
        user,
        bldg: bldg.trim(),
        token: folderName,
        statusPath: stPath,
        traceId: json.traceId,
      });
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "message" in e
          ? String((e as { message?: unknown }).message)
          : String(e);
      setError(msg);
    } finally {
      setRunning(false);
    }
  }, [bldg, user, host, excludePages, excludeFields, theme, onBuilt]);

  return (
    <div className="space-y-4">
      <label className="flex flex-col">
        <span className="form-text mb-1">建物名</span>
        <input
          className="input"
          value={bldg}
          onChange={(e) => setBldg(e.target.value)}
          placeholder="例: テストビルA"
        />
      </label>

      <div className="flex items-center gap-3">
        <button className="btn" onClick={onRun} disabled={!canRun || running}>
          {running ? "実行中..." : "建物フォルダ作成 + URL発行"}
        </button>
        {error && <span className="text-red-500 text-xs whitespace-pre-wrap">{error}</span>}
      </div>

      {token && statusPath && (
        <div className="card">
          <div className="form-text text-[11px] text-slate-500">traceId: {traceId || "-"}</div>
          <div className="form-text text-xs">フォルダ名: {token}</div>
          <div className="form-text text-[11px] text-slate-500">statusPath: {statusPath}</div>

          <div className="mt-3">
            <BuildStatus user={user} bldg={bldg.trim()} statusPath={statusPath} justTriggered={true} />
          </div>
        </div>
      )}
    </div>
  );
}
