// app/fill/FillClient.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Wizard } from "@/components/Wizard";
import { useBuilderStore } from "@/store/builder";
import type { FormMeta, Page, Field } from "@/store/builder";
import { filterSchemaForFill, safeArrayOfString } from "@/store/builder";

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

type ResolvedExclude = { excludePages: string[]; excludeFields: string[] };

function loadScopedExclude(user: string, folderToken: string): ResolvedExclude | null {
  try {
    const key = `cv_exclude_v1::${user}::${folderToken}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    const excludePages = safeArrayOfString(obj?.excludePages);
    const excludeFields = safeArrayOfString(obj?.excludeFields);
    if (!excludePages.length && !excludeFields.length) return null;
    return { excludePages, excludeFields };
  } catch {
    return null;
  }
}

function loadLegacyExclude(): ResolvedExclude | null {
  try {
    const pRaw = localStorage.getItem("cv_excluded_pages");
    const fRaw = localStorage.getItem("cv_excluded_fields");
    const excludePages = safeArrayOfString(pRaw ? JSON.parse(pRaw) : []);
    const excludeFields = safeArrayOfString(fRaw ? JSON.parse(fRaw) : []);
    if (!excludePages.length && !excludeFields.length) return null;
    return { excludePages, excludeFields };
  } catch {
    return null;
  }
}

function resolveExcludeForFill(meta: any, user: string, bldg: string, seq3: string): ResolvedExclude {
  const metaPages = safeArrayOfString(meta?.excludePages);
  const metaFields = safeArrayOfString(meta?.excludeFields);

  // schema meta に入っているなら、それを正とする（端末localより優先）
  if (metaPages.length || metaFields.length) {
    return { excludePages: metaPages, excludeFields: metaFields };
  }

  // schema meta に無い場合だけ暫定フォールバック（同一端末用）
  if (typeof window === "undefined") return { excludePages: [], excludeFields: [] };

  const folderToken = `${user}_${seq3}_${bldg}`;
  const scoped = loadScopedExclude(user, folderToken);
  if (scoped) return scoped;

  const legacy = loadLegacyExclude();
  if (legacy) return legacy;

  return { excludePages: [], excludeFields: [] };
}

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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            varUser: user,
            varBldg: bldg,
            varSeq: normalizedSeq,
            // 旧 Flow 互換
            user,
            bldg,
            seq: normalizedSeq,
            host,
          }),
          signal: controller.signal,
        });

        const text = await res.text();
        if (!res.ok) throw new Error(`read HTTP ${res.status}: ${text}`);

        let payload: any = {};
        try {
          payload = text ? JSON.parse(text) : {};
        } catch {
          throw new Error("フォーム定義 JSON の parse に失敗しました。");
        }

        // --- レスポンス形式のパターン吸収 ---
        let schema: { meta: FormMeta; pages: Page[]; fields: Field[] };

        if (payload?.ok && payload.schema) {
          schema = payload.schema;
        } else if (payload?.ok && payload.data?.schema) {
          schema = payload.data.schema;
        } else if (
          payload?.meta &&
          Array.isArray(payload.pages) &&
          Array.isArray(payload.fields)
        ) {
          schema = payload;
        } else {
          throw new Error("read API から想定外の形式のレスポンスが返ってきました。");
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
            if (prevJson?.ok && prevJson.item) previousFromExcel = prevJson.item;
          } else {
            console.warn(
              `[FillClient] previous HTTP ${prevRes.status} ${await prevRes
                .text()
                .catch(() => "")}`,
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
                meta: { ...(schema.meta || {}), previousFromExcel },
              }
            : schema;

        // --- 3) 対象外(非適用)の適用（A1） ---
        const resolved = resolveExcludeForFill(
          schemaWithPrev?.meta,
          user,
          bldg,
          normalizedSeq,
        );

        const schemaForFill = filterSchemaForFill(
          {
            ...schemaWithPrev,
            meta: {
              ...(schemaWithPrev.meta || {}),
              excludePages: resolved.excludePages,
              excludeFields: resolved.excludeFields,
            },
          },
          resolved,
        );

        // Zustand の builder ストアに流し込む（/fill は “適用後 schema” をそのまま使う）
        hydrateFrom(schemaForFill);

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

    return () => controller.abort();
  }, [user, bldg, normalizedSeq, host, hydrateFrom]);

  if (state.phase === "loading" || state.phase === "init") {
    return (
      <div className="card">
        <div className="form-title">フォーム読込中</div>
        <div className="form-text" style={{ opacity: 0.9 }}>
          {state.phase === "loading" ? state.message : "初期化しています…"}
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
            <pre style={{ whiteSpace: "pre-wrap" }}>{state.detail}</pre>
          </details>
        )}
      </div>
    );
  }

  return <Wizard user={user} bldg={bldg} seq={normalizedSeq} />;
}
