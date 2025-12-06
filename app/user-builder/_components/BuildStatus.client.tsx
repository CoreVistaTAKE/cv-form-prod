"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  user?: string;
  bldg?: string;
  statusPath?: string;
  justTriggered?: boolean;
};

type AnyObj = Record<string, any>;

/** 疑似進捗：フォルダ作成の想定時間（秒） */
const TOTAL_SECONDS = 40;

function pickFirstString(obj: AnyObj, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickFirstNumber(obj: AnyObj, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return NaN;
}

function extractStatusPayload(raw: AnyObj): AnyObj {
  if (raw?.status && typeof raw.status === "object") return raw.status;
  if (raw?.data && typeof raw.data === "object") return raw.data;
  return raw;
}

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function computeFinished(raw: AnyObj) {
  const s = extractStatusPayload(raw || {});
  const phase = pickFirstString(s, ["phase", "status", "state", "stepName", "message"]);
  const done = pickFirstNumber(s, ["done", "current", "step", "progress", "count", "completed"]);
  const total = pickFirstNumber(s, ["total", "max", "stepsTotal", "totalSteps", "target", "all"]);

  const finishedByFlags =
    s?.finished === true || s?.complete === true || s?.completed === true || raw?.finished === true;

  const finishedByCounts =
    Number.isFinite(done) && Number.isFinite(total) && total > 0 && done >= total;

  const finishedByPhase = typeof phase === "string" && /done|complete|completed|finished|success/i.test(phase);

  return Boolean(finishedByFlags || finishedByCounts || finishedByPhase);
}

/**
 * 要件：40秒の疑似進捗で、15/30/45/65/85% のタイミングで文言を切替。
 * ※「AI」は商品表現としての“自動処理”の意味で使う（完了断定はしない）
 */
function aiFolderCreateMessage(pct: number) {
  if (pct < 15) {
    return {
      title: "受付・準備中",
      detail: "AI（自動処理）が入力値を検証し、フォルダ作成ジョブを起票しています。",
    };
  }
  if (pct < 30) {
    return {
      title: "テンプレートをコピー中",
      detail: "AI（自動処理）が BaseSystem をコピーして、建物フォルダの土台を作っています。",
    };
  }
  if (pct < 45) {
    return {
      title: "フォルダ構成を生成中",
      detail: "AI（自動処理）が form / originals の構成を作成し、命名ルールを適用しています。",
    };
  }
  if (pct < 65) {
    return {
      title: "フォーム定義を反映中",
      detail: "AI（自動処理）が テーマ・対象外(非適用) 設定をフォームJSONへ反映して保存しています。",
    };
  }
  if (pct < 85) {
    return {
      title: "配布セットを生成中",
      detail: "AI（自動処理）が URL と QR を生成し、配布できる状態へ整えています。",
    };
  }
  if (pct < 100) {
    return {
      title: "最終チェック中",
      detail: "AI（自動処理）が Excel 雛形のリネームや整合性チェックを実行しています。",
    };
  }
  return {
    title: "反映待ち",
    detail: "想定時間に到達しました。完了反映（status/リンク取得）を待っています。混雑時はここで止まることがあります。",
  };
}

async function postJson(url: string, payload: any, signal?: AbortSignal) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal,
  });

  const t = await r.text().catch(() => "");
  const j = safeJsonParse(t);
  return { ok: r.ok, status: r.status, json: j, rawText: t };
}

export default function BuildStatus({ user, bldg, statusPath, justTriggered }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<AnyObj | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const stoppedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const startedAtRef = useRef<number>(0);

  const payload = useMemo(() => {
    return {
      user,
      bldg,
      statusPath,
      varUser: user,
      varBldg: bldg,
      varStatusPath: statusPath,
    };
  }, [user, bldg, statusPath]);

  const payloadRef = useRef(payload);
  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  const view = useMemo(() => {
    const raw = data || {};
    const s = extractStatusPayload(raw);

    const phase = pickFirstString(s, ["phase", "status", "state", "stepName", "message"]);
    const done = pickFirstNumber(s, ["done", "current", "step", "progress", "count", "completed"]);
    const total = pickFirstNumber(s, ["total", "max", "stepsTotal", "totalSteps", "target", "all"]);

    const finished = computeFinished(raw);

    const formUrl =
      pickFirstString(raw, ["formUrl", "url", "publicUrl"]) ||
      pickFirstString(s, ["formUrl", "url", "publicUrl"]);

    const qrUrl =
      pickFirstString(raw, ["qrUrl", "qr", "qrImageUrl"]) ||
      pickFirstString(s, ["qrUrl", "qr", "qrImageUrl"]);

    const traceId =
      pickFirstString(raw, ["traceId", "trace_id", "trace"]) ||
      pickFirstString(s, ["traceId", "trace_id", "trace"]);

    const doneOk = Number.isFinite(done) ? done : NaN;
    const totalOk = Number.isFinite(total) ? total : NaN;

    return { phase, done: doneOk, total: totalOk, finished, formUrl, qrUrl, traceId, raw, status: s };
  }, [data]);

  useEffect(() => {
    stoppedRef.current = false;
    return () => {
      stoppedRef.current = true;
      abortRef.current?.abort();
    };
  }, []);

  // 疑似進捗タイマー（40秒）
  useEffect(() => {
    if (!statusPath) return;

    startedAtRef.current = Date.now();
    setElapsed(0);

    const timer = window.setInterval(() => {
      const sec = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(sec);
    }, 200);

    return () => window.clearInterval(timer);
  }, [statusPath]);

  const pseudoPct = useMemo(() => {
    const raw = Math.round((elapsed / TOTAL_SECONDS) * 100);
    // 要件：1〜100
    return Math.max(1, Math.min(100, raw));
  }, [elapsed]);

  const displayPct = view.finished ? 100 : pseudoPct;
  const aiMsg = useMemo(() => aiFolderCreateMessage(displayPct), [displayPct]);

  const fetchStatusOnce = useCallback(async () => {
    const p = payloadRef.current;
    if (!p?.statusPath) return { finished: false };

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBusy(true);
    setErr("");

    try {
      const endpoints = ["/api/flows/get-build-status", "/api/registry/build-status"] as const;

      let last: any = null;
      for (const ep of endpoints) {
        last = await postJson(ep, p, controller.signal);
        if (!last.ok && last.status === 404) continue;
        break;
      }

      const j = (last?.json ?? {}) as AnyObj;

      if (j?.ok === false) {
        setErr(j?.reason || "ステータス取得に失敗しました。");
      } else if (!last?.ok && last?.status) {
        setErr(`ステータス取得 HTTP ${last.status}`);
      }

      setData(j);
      return { finished: computeFinished(j) };
    } catch (e: any) {
      if (e?.name === "AbortError") return { finished: false };
      setErr(e?.message || String(e));
      return { finished: false };
    } finally {
      setBusy(false);
    }
  }, []);

  // ポーリング（完了したら止める）
  useEffect(() => {
    if (!statusPath) return;

    let timer: any = null;
    let active = true;

    const fastMs = 1500;
    const slowMs = 5000;
    const maxMs = 15 * 60 * 1000;

    const loop = async () => {
      if (!active || stoppedRef.current) return;

      const r = await fetchStatusOnce();
      if (!active || stoppedRef.current) return;

      if (r.finished) return;

      const elapsedMs = Date.now() - startedAtRef.current;
      if (elapsedMs > maxMs) {
        setErr((prev) => prev || "処理が長引いています。混雑か、status 連携未整備の可能性があります（更新で再取得してください）。");
        return;
      }

      const interval = justTriggered && elapsedMs < 60_000 ? fastMs : slowMs;
      timer = setTimeout(loop, interval);
    };

    void loop();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [statusPath, justTriggered, fetchStatusOnce]);

  if (!statusPath) {
    return <div className="text-xs text-slate-500">statusPath がありません。</div>;
  }

  return (
    <div className="card space-y-4">
      <div>
        <div className="form-title mb-1">建物フォルダを作成しています</div>
        <p className="form-text text-sm" style={{ opacity: 0.85 }}>
          目安：{TOTAL_SECONDS}秒前後。ブラウザを閉じずに、そのままお待ちください。
        </p>
      </div>

      <div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-300"
            style={{
              width: `${displayPct}%`,
              backgroundColor: view.finished ? "#16a34a" : "#2563eb",
            }}
          />
        </div>
        <div className="mt-1 text-xs text-slate-600 text-right">進捗 {displayPct}%</div>
      </div>

      <div>
        <div className="form-title text-base mb-1">{view.finished ? "完了" : aiMsg.title}</div>
        <p className="form-text text-sm" style={{ opacity: 0.9 }}>
          {view.finished
            ? "建物フォルダ作成が完了しました。URL/QR を配布できます。"
            : aiMsg.detail}
        </p>

        {view.phase && (
          <div className="text-xs text-slate-500 mt-1">
            実ステータス: <b>{view.phase}</b>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
        <button className="btn-secondary" type="button" onClick={() => void fetchStatusOnce()} disabled={busy}>
          {busy ? "更新中..." : "更新"}
        </button>

        <div className="text-xs text-slate-500">
          statusPath: <span className="font-mono">{statusPath}</span>
        </div>

        {view.traceId ? (
          <div className="text-xs text-slate-500">
            traceId: <span className="font-mono">{view.traceId}</span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
        {view.formUrl && (
          <a className="btn" href={view.formUrl} target="_blank" rel="noreferrer">
            フォームURLを開く
          </a>
        )}
        {view.qrUrl && (
          <a className="btn-secondary" href={view.qrUrl} target="_blank" rel="noreferrer">
            QRを開く
          </a>
        )}
      </div>

      {err && <div className="text-xs text-red-600 whitespace-pre-wrap">{err}</div>}

      <details className="border border-slate-200 rounded-md bg-white px-3 py-2">
        <summary className="cursor-pointer text-xs text-slate-500">ステータスJSON（デバッグ）</summary>
        <pre className="text-xs overflow-auto mt-2">{JSON.stringify(view.raw, null, 2)}</pre>
      </details>
    </div>
  );
}
