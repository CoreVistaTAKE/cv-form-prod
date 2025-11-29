// app/fill/FillClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Wizard } from "@/components/Wizard";
import { useBuilderStore } from "@/store/builder";
import type { FormMeta, Page, Field } from "@/store/builder";

type Props = {
  user: string;
  bldg: string;
  seq: string; // 3桁の Sseq
  host: string;
};

type LoadState =
  | { phase: "init" }
  | { phase: "loading"; message: string }
  | { phase: "ready" }
  | { phase: "error"; message: string; detail?: string };

export default function FillClient({ user, bldg, seq, host }: Props) {
  const hydrateFrom = useBuilderStore((s) => s.hydrateFrom);
  const [state, setState] = useState<LoadState>({ phase: "init" });

  // 常に 3 桁に揃えた Seq を使う
  const normalizedSeq = (seq || "001").toString().padStart(3, "0");

  useEffect(() => {
    // URL に user / bldg が無いケースは即エラー
    if (!user || !bldg) {
      setState({
        phase: "error",
        message: "URL に user と bldg が指定されていません。",
      });
      return;
    }

    const controller = new AbortController();

    const run = async () => {
      setState({
        phase: "loading",
        message: "フォーム定義を読み込んでいます…",
      });

      try {
        // --- 1) フォーム定義を取得 ---
        const res = await fetch("/api/forms/read", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // FS ルート用
            varUser: user,
            varBldg: bldg,
            varSeq: normalizedSeq,
            // 旧 Flow ルート互換用
            user,
            bldg,
            seq: normalizedSeq,
            host,
          }),
          signal: controller.signal,
        });

        const text = await res.text();
        if (!res.ok) {
          throw new Error(`read HTTP ${res.status}: ${text}`);
        }

        let payload: any = {};
        try {
          payload = text ? JSON.parse(text) : {};
        } catch (e) {
          throw new Error("フォーム定義 JSON の parse に失敗しました。");
        }

        // --- レスポンス形式のパターン吸収 ---
        let schema: { meta: FormMeta; pages: Page[]; fields: Field[] };

        // ① いまの FS ルート: { ok:true, schema:{meta,pages,fields} }
        if (payload?.ok && payload.schema) {
          schema = payload.schema;

          // ② 旧 Flow ルート: { ok:true, data:{schema:{...}} }
        } else if (payload?.ok && payload.data?.schema) {
          schema = payload.data.schema;

          // ③ スキーマ本体そのまま: {meta,pages,fields}
        } else if (
          payload?.meta &&
          Array.isArray(payload.pages) &&
          Array.isArray(payload.fields)
        ) {
          schema = payload;
        } else {
          throw new Error(
            "read API から想定外の形式のレスポンスが返ってきました。"
          );
        }

        // --- 2) Excel の前回回答を取得 (/api/forms/previous) ---
        let previousFromExcel: any = null;
        try {
          const prevRes = await fetch("/api/forms/previous", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              varUser: user,
              varBldg: bldg,
              varSeq: normalizedSeq,
            }),
            signal: controller.signal,
          });

          if (prevRes.ok) {
            const prevJson = await prevRes.json();
            if (prevJson?.ok && prevJson.item) {
              previousFromExcel = prevJson.item;
            }
          } else {
            console.warn(
              `[FillClient] previous HTTP ${prevRes.status} ${await prevRes
                .text()
                .catch(() => "")}`
            );
          }
        } catch (e: any) {
          if (e?.name === "AbortError") {
            console.log("[FillClient] previous fetch aborted (ignored in dev)", e);
          } else {
            console.warn("[FillClient] previous fetch error", e);
          }
        }

        const schemaWithPrev =
          previousFromExcel != null
            ? {
                ...schema,
                meta: {
                  ...(schema.meta || {}),
                  previousFromExcel,
                },
              }
            : schema;

        // Zustand の builder ストアに流し込む
        hydrateFrom(schemaWithPrev);

        setState({ phase: "ready" });
      } catch (err: any) {
        if (err?.name === "AbortError") {
          console.log("[FillClient] read aborted (ignored in dev)", err);
          return;
        }
        console.error("[FillClient] read error", err);
        setState({
          phase: "error",
          message: err?.message || String(err),
          detail: typeof err?.stack === "string" ? err.stack : undefined,
        });
      }
    };

    run();

    return () => {
      controller.abort();
    };
  }, [user, bldg, normalizedSeq, host, hydrateFrom]);

  // ---- 描画部分 ----

  if (state.phase === "loading" || state.phase === "init") {
    return (
      <div className="card">
        <div className="form-title">フォーム読込中</div>
        <div className="form-text" style={{ opacity: 0.9 }}>
          {state.phase === "loading"
            ? state.message
            : "初期化しています…"}
        </div>
        <div className="form-text mt-2" style={{ fontSize: 12 }}>
          user: {user} / bldg: {bldg} / seq: {normalizedSeq}
        </div>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="card">
        <div className="form-title" style={{ color: "#fecaca" }}>
          読み込みエラー
        </div>
        <div className="form-text" style={{ whiteSpace: "pre-wrap" }}>
          {state.message}
        </div>
        {state.detail && (
          <details style={{ marginTop: 8, fontSize: 11 }}>
            <summary>詳細スタック</summary>
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {state.detail}
            </pre>
          </details>
        )}
      </div>
    );
  }

  // phase === "ready"
  return <Wizard user={user} bldg={bldg} seq={normalizedSeq} />;
}
