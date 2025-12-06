"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Props = {
  user?: string;
  bldg?: string;
  statusPath?: string;
  justTriggered?: boolean;
};

type AnyObj = Record<string, any>;

/** 疑似進捗の目安（秒） ※完了判定には使わない */
const TOTAL_SECONDS = 30;

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

function pseudoMessage(elapsedSec: number) {
  const t = elapsedSec;

  if (t < 2) {
    return { title: "受付中", detail: "作成要求を送信しています。" };
  }
  if (t < 7) {
    return { title: "テンプレートをコピー中", detail: "BaseSystem を建物フォルダへ複製しています。" };
  }
  if (t < 12) {
    return { title: "設定を適用中", detail: "対象外(非適用)・テーマ設定をフォーム定義へ反映しています。" };
  }
  if (t < 18) {
    return { title: "URL / QR を生成中", detail: "配布用リンクと QR 画像を自動生成しています。" };
  }
  if (t < 23) {
    return { title: "雛形Excelを準備中", detail: "originals のファイル名を建物名に合わせて整えています。" };
  }
  if (t < 28) {
    return { title: "保存・最終処理中", detail: "OneDrive/SharePoint へ保存し、整合性を確認しています。" };
  }
  return { title: "完了確認中", detail: "共有リンク発行などの最終処理を待っています（混雑時は少し長引きます）。" };
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

  const stopRef = useRef(false);
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
    const percent =
      Number.isFinite(doneOk) && Number.isFinite(totalOk) && totalOk > 0
        ? Math.max(0, Math.min(100, Math.round((doneOk / totalOk) * 100)))
        : NaN;

    return { phase, done: doneOk, total: totalOk, percent, finished, formUrl, qrUrl, traceId, raw, status: s };
  }, [data]);

  // component life
  useEffect(() => {
    stopRef.current = false;
    return () => {
      stopRef.current = true;
      abortRef.current?.abort();
    };
  }, []);

  // 疑似進捗タイマー（完了扱いにはしない）
  useEffect(() => {
    if (!statusPath) return;

    const started = Date.now();
    startedAtRef.current = started;
    setElapsed(0);

    const timer = window.setInterval(() => {
      const sec = (Date.now() - started) / 1000;
      setElapsed(sec);
    }, 200);

    return () => window.clearInterval(timer);
  }, [statusPath]);

  const fetchStatusOnce = useCallback(async () => {
    if (!statusPath) return { j: {}, finished: false };

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBusy(true);
    setErr("");

    try {
      const endpoints = ["/api/flows/get-build-status", "/api/registry/build-status"] as const;

      let last: any = null;

      for (const ep of endpoints) {
        last = await postJson(ep, payload, controller.signal);

        // 404 は次のエンドポイントへ（未実装・未配置の想定）
        if (!last.ok && last.status === 404) continue;

        // JSONが取れていれば採用（空でも採用する：statusファイルがまだ無いケースもある）
        break;
      }

      const j = (last?.json ?? {}) as AnyObj;

      if (j?.ok === false) {
        setErr(j?.reason || "ステータス取得に失敗しました。");
      } else if (!last?.ok && last?.status) {
        // ok:false ではないがHTTPが失敗のケース
        setErr(`ステータス取得 HTTP ${last.status}`);
      }

      setData(j);
      return { j, finished: computeFinished(j) };
    } catch (e: any) {
      if (e?.name === "AbortError") return { j: data || {}, finished: false };
      setErr(e?.message || String(e));
      return { j: data || {}, finished: false };
    } finally {
      setBusy(false);
    }
  }, [payload, statusPath, data]);

  // ポーリング（完了したら止める / unmount で止める）
  useEffect(() => {
    if (!statusPath) return;

    let timer: any = null;
    let active = true;

    const fastMs = 1500;
    const slowMs = 5000;
    const maxMs = 15 * 60 * 1000; // 15min で打ち切り（無限ポーリング防止）

    const loop = async () => {
      if (!active || stopRef.current) return;

      const { finished } = await fetchStatusOnce();
      if (!active || stopRef.current) return;

      if (finished) return;

      const elapsedMs = Date.now() - startedAtRef.current;
      if (elapsedMs > maxMs) {
        setErr((prev) => prev || "処理が長引いています。混雑か、status 連携未整備の可能性があります（更新ボタンで再取得してください）。");
        return;
      }

      const interval = justTriggered && elapsedMs < 60_000 ? fastMs : slowMs;
      timer = setTimeout(loop, interval);
    };

    // 初回即時
    void loop();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [statusPath, justTriggered, fetchStatusOnce]);

  if (!statusPath) {
    return <div className="text-xs text-slate-500">statusPath がありません。</div>;
  }

  const pseudo = pseudoMessage(elapsed);
  const hasServerPercent = Number.isFinite(view.percent);

  const pct = useMemo(() => {
    if (view.finished) return 100;
    if (hasServerPercent) return Math.max(0, Math.min(99, view.percent)); // 完了前に100にはしない
    const p = Math.round((elapsed / TOTAL_SECONDS) * 100);
    return Math.max(0, Math.min(98, p));
  }, [view.finished, hasServerPercent, view.percent, elapsed]);

  const statusTitle = view.finished
    ? "完了"
    : view.phase
      ? view.phase
      : pseudo.title;

  const statusDetail = view.finished
    ? "建物フォルダ作成が完了しました。URL/QR を配布できます。"
    : view.phase
      ? pseudo.detail
      : pseudo.detail;

  const showOver30sHint = !view.finished && !hasServerPercent && elapsed >= TOTAL_SECONDS;

  return (
    <div className="card space-y-4">
      <div>
        <div className="form-title mb-1">建物フォルダを作成しています</div>
        <p className="form-text text-sm" style={{ opacity: 0.85 }}>
          ブラウザを閉じずに、そのままお待ちください。
        </p>
      </div>

      <div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: view.finished ? "#16a34a" : "#2563eb",
            }}
          />
        </div>
        <div className="mt-1 text-xs text-slate-600 text-right">進捗 {pct}%</div>
        {!hasServerPercent && (
          <div className="mt-1 text-xs text-slate-500">
            ※この進捗は目安です（Flow 側の status が未整備の場合は疑似進捗で案内します）
          </div>
        )}
        {showOver30sHint && (
          <div className="mt-1 text-xs text-yellow-700">
            30秒を超えました。混雑か、status 連携が未整備の可能性があります。しばらく待って「更新」を押してください。
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="form-title text-base">{statusTitle}</div>
        <p className="form-text text-sm" style={{ opacity: 0.9 }}>
          {statusDetail}
        </p>

        {Number.isFinite(view.done) && Number.isFinite(view.total) && view.total > 0 && (
          <div className="text-xs text-slate-600">
            実進捗: <b>{view.done}</b> / <b>{view.total}</b>{" "}
            {Number.isFinite(view.percent) && <span className="text-slate-500">（{view.percent}%）</span>}
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
