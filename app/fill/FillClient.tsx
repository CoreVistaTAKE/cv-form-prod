"use client";
import React from "react";
import { Wizard } from "@/components/Wizard";
import { useBuilderStore } from "@/store/builder";

type Props = { user?: string; bldg?: string; host?: string };

export default function FillClient({ user, bldg, host }: Props) {
  const builder = useBuilderStore();

  // ──────────────────────────────────────────────────────────────
  // 直リンク（user & bldg あり）の場合：resolve → read → hydrate → Wizard
  // ──────────────────────────────────────────────────────────────
  const isDirect = !!user && !!bldg;
  const [phase, setPhase] = React.useState<"idle"|"resolving"|"reading"|"ready"|"error">(isDirect ? "resolving" : "idle");
  const [err, setErr] = React.useState<string>("");

  React.useEffect(() => {
    if (!isDirect) return;

    let aborted = false;
    (async () => {
      setErr("");
      setPhase("resolving");
      try {
        // 1) schemaPath を解決
        const r1 = await fetch("/api/forms/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ varUser: user, varBldg: bldg, varHost: host }),
          cache: "no-store",
        });
        if (!r1.ok) {
          const t = await r1.text().catch(() => "");
          throw new Error(`resolve HTTP ${r1.status} ${t}`);
        }
        const j1 = await r1.json().catch(() => ({} as any));
        const schemaPath: string =
          j1?.schemaPath ||
          j1?.body?.schemaPath ||
          j1?.result?.schemaPath ||
          "";

        if (!schemaPath) {
          // URLだけ来る実装も許容（将来拡張）。今回はschemaPathが必須。
          throw new Error("schemaPath が取得できません。Flow の status.json に schemaPath を出力してください。");
        }

        // 2) JSON を取得
        setPhase("reading");
        const r2 = await fetch("/api/forms/read", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ schemaPath }),
          cache: "no-store",
        });
        if (!r2.ok) {
          const t = await r2.text().catch(() => "");
          throw new Error(`read HTTP ${r2.status} ${t}`);
        }
        const schema = await r2.json();

        // 3) ストアへ注入
        if (!aborted) {
          builder.hydrateFrom(schema); // 既存のユーザービルダーでも使用中の安全な注入関数
          setPhase("ready");
        }
      } catch (e: any) {
        if (aborted) return;
        setErr(e?.message || String(e));
        setPhase("error");
      }
    })();

    return () => { aborted = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirect, user, bldg, host]);

  if (isDirect) {
    if (phase === "resolving") {
      return <div className="card"><div className="form-text">フォームを探しています…（resolve）</div></div>;
    }
    if (phase === "reading") {
      return <div className="card"><div className="form-text">フォーム定義を読み込んでいます…（read）</div></div>;
    }
    if (phase === "error") {
      return (
        <div className="card">
          <div className="form-title">読み込みエラー</div>
          <div className="form-text" style={{whiteSpace:"pre-wrap"}}>{err || "unknown error"}</div>
          <div className="form-text" style={{marginTop:8, opacity:.8}}>
            ※ /api/forms/resolve → /api/forms/read の順で失敗箇所を特定してください。
          </div>
        </div>
      );
    }
    // 読み込み完了
    if (phase === "ready") {
      return <Wizard />;
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────
  // 直リンク以外：既存のローカル選択UI（そのまま温存）
  // ──────────────────────────────────────────────────────────────
  const [pickedBldg, setPickedBldg] = React.useState("");
  const [formUrl, setFormUrl] = React.useState("");

  const options = React.useMemo<string[]>(() => {
    try {
      const raw = localStorage.getItem("cv_building_options") || "[]";
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? (arr as string[]) : [];
    } catch { return []; }
  }, []);

  const urlMap = React.useMemo<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem("cv_form_urls") || "{}";
      const obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? (obj as Record<string, string>) : {};
    } catch { return {}; }
  }, []);

  React.useEffect(() => {
    try {
      const last = localStorage.getItem("cv_last_building") || "";
      const init = last || (options.length ? options[0] : "");
      setPickedBldg(init);
      setFormUrl(init ? urlMap[init] || "" : "");
    } catch {}
  }, [options, urlMap]);

  React.useEffect(() => {
    setFormUrl(pickedBldg ? urlMap[pickedBldg] || "" : "");
  }, [pickedBldg, urlMap]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          建物：
          <select
            value={pickedBldg}
            onChange={(e) => setPickedBldg(e.target.value)}
            style={{ marginLeft: 8, padding: "6px 10px", border: "1px solid #E5E7EB", borderRadius: 6 }}
          >
            {options.length === 0 ? (
              <option value="">（建物がありません）</option>
            ) : (
              options.map((x) => <option key={x} value={x}>{x}</option>)
            )}
          </select>
        </label>
        {formUrl && (
          <a className="btn" href={formUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            この建物のフォームを新しいタブで開く
          </a>
        )}
      </div>

      {formUrl ? (
        <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden", height: "70vh" }}>
          <iframe src={formUrl} style={{ width: "100%", height: "100%", border: 0 }} title="building-form" />
        </div>
      ) : (
        <div style={{ padding: 8, border: "1px dashed #CBD5E1", borderRadius: 8, color: "#334155" }}>
          直近の建物が見つかりません。まず「ユーザー用ビルダー → 建物フォルダ作成」で建物を作成し、
          「プレビュー」で完成フォームがあることを確認してください。
        </div>
      )}
    </div>
  );
}
