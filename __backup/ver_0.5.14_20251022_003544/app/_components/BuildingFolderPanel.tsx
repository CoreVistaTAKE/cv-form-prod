'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

type Stage = 'idle' | 'running' | 'done' | 'error';

type ApiResult = {
  ok: boolean;
  user?: string;
  seq?: string;
  bldgFolderName?: string;
  message?: string;
};

const HOST = 'https://www.form.visone-ai.jp'; // 固定（1行・https・空白/改行/「>」混入なし）

export default function BuildingFolderPanel() {
  const [username, setUsername] = useState('form_PJ1');
  const [bldg, setBldg] = useState('テストビルA');
  const [stage, setStage] = useState<Stage>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ApiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // F1〜F4の段階表示（15 / 40 / 80 / 100）
  const marks = useMemo(
    () => [
      { key: 'F1', label: '採番・ルート生成', pct: 15 },
      { key: 'F2', label: 'フォルダ作成', pct: 40 },
      { key: 'F3', label: 'テンプレコピー', pct: 80 },
      { key: 'F4', label: '完了', pct: 100 },
    ],
    []
  );

  // 実ステータスとは独立した**ローカル進捗**（API返却まで段階制で可視化）
  useEffect(() => {
    if (stage !== 'running') return;
    setProgress(0);
    const start = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      // 実測 49〜53 秒を踏まえ、返却まで最大 95% で待機
      const target = Math.min(95, Math.floor(elapsed * 2)); // ~50秒で95%
      setProgress((p) => (p < target ? target : p));
      timerRef.current = window.setTimeout(tick, 1000);
    };
    tick();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [stage]);

  const currentStep = useMemo(() => {
    if (progress < 15) return 'F1';
    if (progress < 40) return 'F2';
    if (progress < 80) return 'F3';
    return 'F4';
  }, [progress]);

  const handleCreate = async () => {
    setError(null);
    setResult(null);

    const u = username.trim();
    const b = bldg.trim();

    // 入力バリデーション（予約名禁止・空文字禁止）
    if (!u) {
      setError('username は必須です。');
      return;
    }
    if (!b) {
      setError('bldg は必須です。');
      return;
    }
    if (b === 'BaseSystem') {
      setError('建物名に予約名「BaseSystem」は使用できません。別名にしてください。');
      return;
    }

    setStage('running');

    try {
      const payload = { username: u, bldg: b, host: HOST };
      const res = await fetch('/api/builder/create-building', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: ApiResult = await res.json().catch(() => ({ ok: false, message: 'Bad JSON' }));

      if (!res.ok || !data.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      // 返却時に 100% / 完了
      setProgress(100);
      setStage('done');
      setResult(data);
    } catch (e: any) {
      setStage('error');
      setError(e?.message || 'Unknown error');
    }
  };

  const reset = () => {
    setStage('idle');
    setProgress(0);
    setResult(null);
    setError(null);
  };

  return (
    <section style={{
      border: '1px solid var(--border, #E5E7EB)',
      borderRadius: 8,
      padding: 16,
      marginBottom: 16,
      background: 'var(--background, #FFFFFF)'
    }}>
      <h2 style={{ margin: 0, marginBottom: 8, fontSize: 16 }}>建物フォルダ</h2>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
          username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="form_PJ1"
            style={{ padding: 8, border: '1px solid var(--border, #D1D5DB)', borderRadius: 6, minWidth: 220 }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12 }}>
          bldg
          <input
            value={bldg}
            onChange={(e) => setBldg(e.target.value)}
            placeholder="テストビルA"
            style={{ padding: 8, border: '1px solid var(--border, #D1D5DB)', borderRadius: 6, minWidth: 220 }}
          />
        </label>
        <button
          onClick={handleCreate}
          disabled={stage === 'running'}
          style={{
            padding: '10px 16px',
            background: stage === 'running' ? 'var(--muted, #9CA3AF)' : 'var(--primary, #111827)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 6,
            cursor: stage === 'running' ? 'not-allowed' : 'pointer',
            minWidth: 140
          }}
        >
          フォルダを作成
        </button>
        {stage !== 'idle' && (
          <button onClick={reset} style={{ padding: '10px 12px', border: '1px solid var(--border, #D1D5DB)', borderRadius: 6, background: '#FFF' }}>
            クリア
          </button>
        )}
      </div>

      {/* 段階制（F1〜F4） */}
      <div style={{ marginTop: 16 }}>
        <div style={{ height: 8, background: 'var(--muted, #F3F4F6)', borderRadius: 9999, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary, #111827)', transition: 'width 0.8s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--cv-muted, #374151)' }}>
          {marks.map((m) => (
            <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: 9999,
                background: progress >= m.pct ? '#111827' : '#D1D5DB'
              }} />
              <span>{m.key}: {m.label} {m.pct}% {currentStep === m.key && stage === 'running' ? '（実行中）' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 結果/エラー表示 */}
      {result && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid var(--border, #E5E7EB)', borderRadius: 6, background: 'var(--muted, #F9FAFB)' }}>
          <div style={{ fontSize: 14, marginBottom: 4 }}>結果</div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      {error && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid var(--destructive, #FCA5A5)', borderRadius: 6, background: 'var(--destructive, #FEF2F2)', color: 'var(--destructive-foreground, #991B1B)' }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted-foreground, #6B7280)' }}>
        API: <code>/api/builder/create-building</code>（POST）／送信 JSON 固定：<code>{"{ username, bldg, host }"}</code>（host={HOST}）
      </div>
    </section>
  );
}
