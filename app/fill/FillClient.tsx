"use client";

import React from "react";
import { Wizard } from "@/components/Wizard";
import { useBuilderStore } from "@/store/builder";

type Props = {
  /** URL クエリから渡ってくる値 */
  user?: string;
  bldg?: string;
  host?: string;
};

/**
 * 挙動
 * - user & bldg がある   → 建物用フォームを /api/forms/read 経由で読み込み、Wizard を描画
 * - user or bldg が無い → 既存の「建物を選んで埋め込み」UIをそのまま利用
 */
export default function FillClient({ user, bldg, host }: Props) {
  const builder = useBuilderStore();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hydrated, setHydrated] = React.useState(false);

  // builder store は必ず 1 回初期化
  React.useEffect(() => {
    if (typeof builder.initOnce === "function") {
      builder.initOnce();
    }
  }, [builder]);

  // ==== 直指定モード（/fill?user=&bldg=） ====
  React.useEffect(() => {
    if (!user || !bldg) return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setHydrated(false);

      try {
        const res = await fetch("/api/forms/read", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ user, bldg, host }),
        });

        const text = await res.text();
        if (!res.ok) {
          throw new Error(`read HTTP ${res.status} ${text}`);
        }

        let payload: any;
        try {
          payload = JSON.parse(text);
        } catch {
          throw new Error("フォーム定義(JSON)の読み込みに失敗しました。");
        }

        if (!payload || typeof payload !== "object") {
          throw new Error("フォーム定義が空です。");
        }

        if (typeof builder.hydrateFrom === "function") {
          builder.hydrateFrom(payload);
        }

        if (!cancelled) {
          setHydrated(true);
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError(e?.message || String(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [user, bldg, host, builder]);

  // ---- 直指定時の表示 ----
  if (user && bldg) {
    const title =
      (builder.meta && (builder.meta as any).title) || "フォームを読み込み中…";

    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div className="card">
          <div className="form-title">{title}</div>
          <div className="form-text" style={{ opacity: 0.9 }}>
            ユーザー: {user} ／ 建物: {bldg}
          </div>

          {loading && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
              建物用フォームを読み込んでいます…
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "#b91c1c",
                whiteSpace: "pre-wrap",
              }}
            >
              フォーム定義の取得に失敗しました:
              <br />
              {error}
            </div>
          )}
        </div>

        {/* フォーム定義が builder に入ったら Wizard を描画 */}
        {!error && hydrated && <Wizard />}
      </div>
    );
  }

  // ==== ここから下は「既存の建物選択 UI」をそのまま維持 ====

  const [pickedBldg, setPickedBldg] = React.useState("");
  const [formUrl, setFormUrl] = React.useState("");

  const options = React.useMemo<string[]>(() => {
    try {
      const raw = localStorage.getItem("cv_building_options") || "[]";
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? (arr as string[]) : [];
    } catch {
      return [];
    }
  }, []);

  const urlMap = React.useMemo<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem("cv_form_urls") || "{}";
      const obj = JSON.parse(raw);
      return obj && typeof obj === "object"
        ? (obj as Record<string, string>)
        : {};
    } catch {
      return {};
    }
  }, []);

  React.useEffect(() => {
    try {
      const last = localStorage.getItem("cv_last_building") || "";
      const init = last || (options.length ? options[0] : "");
      setPickedBldg(init);
      setFormUrl(init ? urlMap[init] || "" : "");
    } catch {
      // ignore
    }
  }, [options, urlMap]);

  React.useEffect(() => {
    setFormUrl(pickedBldg ? urlMap[pickedBldg] || "" : "");
  }, [pickedBldg, urlMap]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label>
          建物：
          <select
            value={pickedBldg}
            onChange={(e) => setPickedBldg(e.target.value)}
            style={{
              marginLeft: 8,
              padding: "6px 10px",
              border: "1px solid #E5E7EB",
              borderRadius: 6,
            }}
          >
            {options.length === 0 ? (
              <option value="">（建物がありません）</option>
            ) : (
              options.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))
            )}
          </select>
        </label>
        {formUrl && (
          <a
            className="btn"
            href={formUrl}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: "none" }}
          >
            この建物のフォームを新しいタブで開く
          </a>
        )}
      </div>

      {formUrl ? (
        <div
          style={{
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            overflow: "hidden",
            height: "70vh",
          }}
        >
          <iframe
            src={formUrl}
            style={{ width: "100%", height: "100%", border: 0 }}
            title="building-form"
          />
        </div>
      ) : (
        <div
          style={{
            padding: 8,
            border: "1px dashed #CBD5E1",
            borderRadius: 8,
            color: "#334155",
          }}
        >
          直近の建物が見つかりません。まず「ユーザー用ビルダー → 建物フォルダ作成」で建物を作成し、
          「プレビュー」で完成フォームがあることを確認してください。
        </div>
      )}
    </div>
  );
}
