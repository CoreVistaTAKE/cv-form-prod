"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  user?: string;
  bldg?: string;
  statusPath?: string;
  justTriggered?: boolean;
};

type AnyObj = Record<string, any>;

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
  // よくあるパターンを吸収（{status:{...}} でも {data:{...}} でも）
  if (raw?.status && typeof raw.status === "object") return raw.status;
  if (raw?.data && typeof raw.data === "object") return raw.data;
  return raw;
}

async function postJson(url: string, payload: any) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const t = await r.text().catch(() => "");
  let j: any = {};
  try {
    j = t ? JSON.parse(t) : {};
  } catch {
    j = { raw: t };
  }

  return { ok: r.ok, status: r.status, json: j, rawText: t };
}

export default function BuildStatus({ user, bldg, statusPath, justTriggered }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<AnyObj | null>(null);
  const stoppedRef = useRef(false);

  const payload = useMemo(() => {
    return {
      // どっちのAPIでも受けられるように多めに渡す
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

    const finished =
      s?.finished === true ||
      s?.complete === true ||
      s?.completed === true ||
      (Number.isFinite(done) && Number.isFinite(total) && total > 0 && done >= total) ||
      (typeof s?.phase === "string" && /done|complete|finished|success/i.test(s.phase));

    const formUrl = pickFirstString(raw, ["formUrl", "url", "publicUrl"]) || pickFirstString(s, ["formUrl", "url", "publicUrl"]);
    const qrUrl = pickFirstString(raw, ["qrUrl", "qr", "qrImageUrl"]) || pickFirstString(s, ["qrUrl", "qr", "qrImageUrl"]);

    const doneOk = Number.isFinite(done) ? done : NaN;
    const totalOk = Number.isFinite(total) ? total : NaN;
    const percent = Number.isFinite(doneOk) && Number.isFinite(totalOk) && totalOk > 0 ? Math.max(0, Math.min(100, Math.round((doneOk / totalOk) * 100))) : NaN;

    return { phase, done: doneOk, total: totalOk, percent, finished, formUrl, qrUrl, s, raw };
  }, [data]);

  useEffect(() => {
    stoppedRef.current = false;
    return () => {
      stoppedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!statusPath) return;

    let timer: any = null;

    const tick = async () => {
      if (stoppedRef.current) return;

      setBusy(true);
      setErr("");

      try {
        // まず flows/get-build-status を叩き、無ければ registry/build-status にフォールバック
        const endpoints = ["/api/flows/get-build-status", "/api/registry/build-status"];

        let last: any = null;
        for (const ep of endpoints) {
          last = await postJson(ep, payload);
          // 404 は次へ
          if (!last.ok && last.status === 404) continue;

          // レスポンスがJSONとして返ってきたら採用
          if (last.json && Object.keys(last.json).length > 0) break;
        }

        const j = last?.json ?? {};
        if (j?.ok === false) {
          setErr(j?.reason || "ステータス取得に失敗しました");
        }

        setData(j);
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setBusy(false);
      }
    };

    // 初回即時
    void tick();

    // 直後は早めにポーリング、落ち着いたら間隔を伸ばす
    const fastMs = 1500;
    const slowMs = 5000;

    const start = Date.now();
    const loop = async () => {
      if (stoppedRef.current) return;
      await tick();

      // 完了っぽければ止める
      const cur = (data ? extractStatusPayload(data as AnyObj) : {}) as AnyObj;
      const finished =
        cur?.finished === true ||
        cur?.complete === true ||
        cur?.completed === true ||
        (typeof cur?.phase === "string" && /done|complete|finished|success/i.test(cur.phase));

      if (finished) return;

      const elapsed = Date.now() - start;
      const interval = justTriggered && elapsed < 60_000 ? fastMs : slowMs;
      timer = setTimeout(loop, interval);
    };

    timer = setTimeout(loop, justTriggered ? 1200 : 3000);

    return () => {
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusPath, JSON.stringify(payload), justTriggered]);

  if (!statusPath) {
    return <div className="text-xs text-slate-500">statusPath がありません。</div>;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-500">
        statusPath: <span className="font-mono">{statusPath}</span>
      </div>

      <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
        <div className="text-sm">
          状態: <b>{view.phase || (busy ? "取得中..." : "（不明）")}</b>
        </div>

        {Number.isFinite(view.done) && Number.isFinite(view.total) && view.total > 0 && (
          <div className="text-sm">
            進捗: <b>{view.done}</b> / <b>{view.total}</b>
            {Number.isFinite(view.percent) && <span className="text-xs text-slate-500">（{view.percent}%）</span>}
          </div>
        )}

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

      {/* デバッグ用に最低限の中身を見える化（進捗が拾えない時の判断材料になる） */}
      <details className="border border-slate-200 rounded-md bg-white px-3 py-2">
        <summary className="cursor-pointer text-xs text-slate-500">ステータスJSON（デバッグ）</summary>
        <pre className="text-xs overflow-auto mt-2">{JSON.stringify(view.raw, null, 2)}</pre>
      </details>
    </div>
  );
}
