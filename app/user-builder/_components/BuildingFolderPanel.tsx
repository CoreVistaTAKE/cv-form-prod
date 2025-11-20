"use client";

import React, { useCallback, useMemo, useState } from "react";
import BuildStatus from "./BuildStatus.client";

type CreateRes = {
  ok?: boolean;
  traceId?: string;
  token?: string;
  statusPath?: string;
  user?: string;
  seq?: string;
  bldgFolderName?: string;
};

type Props = {
  createUrl?: string;
  statusUrl?: string;
  defaultUser?: string | null;
  defaultHost?: string | null;
};

const ENV_DEFAULT_USER = process.env.NEXT_PUBLIC_DEFAULT_USER || "form_PJ1";
const ENV_DEFAULT_HOST =
  process.env.NEXT_PUBLIC_DEFAULT_HOST || "https://www.form.visone-ai.jp";

function required(url: string, name: string) {
  if (!url) throw new Error(`${name} が未設定です。.env.local に ${name} を定義してください。`);
}

function upsertRegistry(entry: { bldg: string; statusPath: string; url?: string }) {
  try {
    const raw = localStorage.getItem("cv_registry") || "[]";
    const arr: any[] = JSON.parse(raw);
    const i = arr.findIndex((x) => x && x.statusPath === entry.statusPath);
    if (i >= 0) arr[i] = { ...arr[i], ...entry };
    else arr.push(entry);
    localStorage.setItem("cv_registry", JSON.stringify(arr));
  } catch {}
}

export default function BuildingFolderPanel({
  createUrl,
  statusUrl,
  defaultUser,
  defaultHost,
}: Props) {
  const FLOW_CREATE_URL = createUrl || "";
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
      required(FLOW_CREATE_URL, "FLOW_CREATE_FORM_FOLDER_URL");

      setRunning(true);

      const res = await fetch(FLOW_CREATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ varUser: user, varBldg: bldg.trim(), varHost: host }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`CreateFormFolder が失敗: ${res.status} ${text}`);
      }

      const json: CreateRes = await res.json().catch(() => ({}));
      const tkn = json.token || (json.user && json.seq ? `${json.user}_${json.seq}_${bldg.trim()}` : undefined);
      const stPath = json.statusPath;

      if (!tkn || !stPath) {
        throw new Error("Flow の応答に token または statusPath が含まれていません。CreateFormFolder の Response を確認してください。");
      }

      setTraceId(json.traceId);
      setToken(tkn);
      setStatusPath(stPath);

      // lastBuild は従来通り
      try {
        const last = { user, bldg: bldg.trim(), statusPath: stPath };
        localStorage.setItem("cv:lastBuild", JSON.stringify(last));
      } catch {}

      // ★ 新規：レジストリへ登録（url は後で BuildStatus が埋める）
      upsertRegistry({ bldg: bldg.trim(), statusPath: stPath });
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setRunning(false);
    }
  }, [bldg, user, host, FLOW_CREATE_URL]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: "1fr" }}>
        <label className="flex flex-col">
          <span className="form-text mb-1">建物名</span>
          <input className="input" value={bldg} onChange={(e) => setBldg(e.target.value)} placeholder="例: テストビルA" />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn" onClick={onRun} disabled={!canRun || running}
          title={!canRun ? "建物名を入力してください" : "建物フォルダを作成します"}>
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
            <BuildStatus user={user} bldg={bldg.trim()} statusPath={statusPath} statusUrl={statusUrl} justTriggered={true} />
          </div>
        </div>
      )}
    </div>
  );
}
