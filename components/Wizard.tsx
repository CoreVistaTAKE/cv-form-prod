// components/Wizard.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useBuilderStore } from "@/store/builder";
import { useResponsesStore } from "@/store/responses";
import { toYYYYMMDD, isoDateTokyo, fromISODateStringJST } from "@/utils/date";
import { applyTheme } from "@/utils/theme";
import SubmitProgress from "@/app/fill/_components/SubmitProgress";

const RESERVED = new Set([
  "点検日",
  "ReportSheet（タブ名）",
  "会社名",
  "建物名",
  "点検者名",
  "【2名以上の点検】共同報告グループID",
]);

type WizardProps = {
  user?: string; // /fill の URL の user（例: FirstService）
  bldg?: string; // /fill の URL の bldg（例: テストビルB）
  seq?: string; // 3桁 seq（例: 001）
  host?: string; // 今回の Flow では未使用だが将来拡張用
};

export function Wizard(props: WizardProps) {
  const { user, bldg, seq } = props || {};
  const normalizedSeq = (seq || "001").toString().padStart(3, "0");

  const { pages, fields, meta } = useBuilderStore();
  const responses = useResponsesStore();

  const [idx, setIdx] = useState(0);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [revisePrevItem, setRevisePrevItem] = useState<any | undefined>(
    undefined,
  );
  const [isFromRevise, setIsFromRevise] = useState(false);
  const [working, setWorking] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | undefined>();

  const form = useForm({ shouldUnregister: false });
  const register = form.register as any;
  const getValues = form.getValues;
  const setValue = form.setValue;
  const watch = form.watch;

  const infoIndex = useMemo(
    () => pages.findIndex((p) => p.type === "info"),
    [pages],
  );
  const reviseIndex = useMemo(
    () => pages.findIndex((p) => p.type === "revise"),
    [pages],
  );
  const reviseListIndex = useMemo(
    () => pages.findIndex((p) => p.type === "reviseList"),
    [pages],
  );
  const basicIndex = useMemo(
    () => pages.findIndex((p) => p.type === "basic"),
    [pages],
  );
  const prevIndex = useMemo(
    () => pages.findIndex((p) => p.type === "previous"),
    [pages],
  );
  const reviewIndex = useMemo(
    () => pages.findIndex((p) => p.type === "review"),
    [pages],
  );
  const completeIndex = useMemo(
    () => pages.findIndex((p) => p.type === "complete"),
    [pages],
  );
  const sectionIdxs = useMemo(
    () =>
      pages
        .map((p, i) => (p.type === "section" ? i : -1))
        .filter((i) => i >= 0),
    [pages],
  );
  const lastSectionIndex = useMemo(
    () => (sectionIdxs.length ? sectionIdxs[sectionIdxs.length - 1] : -1),
    [sectionIdxs],
  );

  const currentPage = pages[idx];
  const isInfo = currentPage?.type === "info";
  const isRevise = currentPage?.type === "revise";
  const isReviseList = currentPage?.type === "reviseList";
  const isBasic = currentPage?.type === "basic";
  const isPrev = currentPage?.type === "previous";
  const isSection = currentPage?.type === "section";
  const isReview = currentPage?.type === "review";
  const isComplete = currentPage?.type === "complete";

  // 回答ストア初期化
  useEffect(() => {
    responses.initOnce();
  }, [responses]);

  // テーマ適用
  useEffect(() => {
    applyTheme(meta.theme);
  }, [meta.theme]);

  // ▼ 初期値：点検日と ReportSheet は JST（東京）で統一（sheet は YYMMDD） ★ここ修正
  useEffect(() => {
    const defaultISO = isoDateTokyo(); // JST "YYYY-MM-DD"
    const cur = getValues("点検日") as string | undefined;
    if (!cur) {
      // 初期点検日をセット
      setValue("点検日", defaultISO);

      // toYYYYMMDD() が 20251203 形式なら、先頭2桁を落として 251203 にする
      const baseYYYYMMDD = toYYYYMMDD();
      const baseYYMMDD = baseYYYYMMDD.slice(2); // "20251203" -> "251203"
      setValue("ReportSheet（タブ名）", baseYYMMDD);
    }

    const sub = watch((values: any, ctx: any) => {
      if (ctx?.name === "点検日") {
        const raw = values["点検日"] as string | undefined;
        if (!raw) return;

        const baseYYYYMMDD = toYYYYMMDD(
          fromISODateStringJST(raw).toDate(),
        ); // JSTでYYYYMMDD (20251203)
        const baseYYMMDD = baseYYYYMMDD.slice(2); // 251203

        const rs = values["ReportSheet（タブ名）"] as string | undefined;
        // sheet が未設定、または「6桁(+_n)」形式なら自動更新を許可
        if (!rs || /^\d{6}(_\d+)?$/.test(rs)) {
          setValue("ReportSheet（タブ名）", baseYYMMDD);
        }
      }
    });

    return () => sub.unsubscribe();
  }, [watch, setValue, getValues]);

  // 会社名/建物名（固定値）を注入
  useEffect(() => {
    if (meta.fixedCompany) setValue("会社名", meta.fixedCompany);
    if (meta.fixedBuilding) setValue("建物名", meta.fixedBuilding);
  }, [meta.fixedCompany, meta.fixedBuilding, setValue]);

  // ▼ ページ単位の必須チェック（basic / section）
  function validatePageRequired(targetIndex: number): boolean {
    if (targetIndex < 0 || targetIndex >= pages.length) return true;
    const page = pages[targetIndex];
    if (!(page?.type === "basic" || page?.type === "section")) return true;
    const fs = fields.filter((f) => f.pageId === page.id && f.required);
    if (fs.length === 0) return true;
    const vals = getValues();
    const missing: string[] = [];
    for (const f of fs) {
      const v = vals[f.label];
      const s = v === undefined || v === null ? "" : String(v).trim();
      if (!s) missing.push(f.label);
    }
    if (missing.length > 0) {
      alert(missing.map((x) => `${x} は必須項目です`).join("\n"));
      return false;
    }
    return true;
  }

  // ▼ ナビゲーションボタン
  const TopNav = ({
    left,
    right,
  }: {
    left: () => void;
    right: () => void;
  }) => (
    <div className="flex items-center justify-between mb-2">
      <button className="btn-blue-light btn-nav" onClick={left}>
        ← 戻る
      </button>
      <button className="btn-blue btn-nav" onClick={right}>
        次へ →
      </button>
    </div>
  );

  // 修正時のロード
  function loadForEdit(id: string) {
    const item = responses.getById(id);
    if (!item) return;
    setEditingId(id);
    setIsFromRevise(true);
    setValue("点検日", item.dateISO || "");
    setValue("ReportSheet（タブ名）", item.sheet || "");
    setValue("会社名", meta.fixedCompany || item.company || "");
    setValue("建物名", meta.fixedBuilding || item.building || "");
    setValue("点検者名", item.inspector || "");
    if (fields.some((f) => f.label === "【2名以上の点検】共同報告グループID")) {
      setValue(
        "【2名以上の点検】共同報告グループID",
        (item.groupId || "").toString().replace(/[^\d]/g, ""),
      );
    }
    for (const f of fields) {
      const v = item.values?.[f.label];
      if (v !== undefined) setValue(f.label, v);
    }
    if (item.building && item.sheet) {
      const prev = responses.latestBefore(item.building, item.sheet);
      setRevisePrevItem(prev || undefined);
    }
    if (reviseListIndex >= 0) setIdx(reviseListIndex);
    else if (basicIndex >= 0) setIdx(basicIndex);
  }

  // ▼ 送信 & Flow 呼び出し
  async function saveCurrent(submit: boolean) {
    const vals = form.getValues();

    const building = (meta.fixedBuilding || vals["建物名"] || "").trim();
    const company = (meta.fixedCompany || vals["会社名"] || "").trim();

    if (!building) {
      alert("建物名が未設定です（ビルダーのフォーム設定で固定値を入力してください）");
      return;
    }

    const dateISO = (vals["点検日"] || "").trim();
    const sheet = (vals["ReportSheet（タブ名）"] || "").trim();
    const inspector = (vals["点検者名"] || "").trim();

    const hasGroup = fields.some(
      (f) => f.label === "【2名以上の点検】共同報告グループID",
    );
    const groupId = hasGroup
      ? (vals["【2名以上の点検】共同報告グループID"] || "")
          .toString()
          .replace(/[^\d]/g, "")
          .slice(0, 3)
      : "";

    if (!inspector) {
      alert("点検者名 は必須項目です");
      return;
    }

    const values: Record<string, string> = {};
    for (const f of fields) {
      if ((f as any).type === "forminfo") continue;
      const v = vals[f.label];
      if (v !== undefined && v !== null) {
        const s = String(v);
        if (s.trim() !== "") values[f.label] = s;
      }
    }

    const answers = Object.entries(values).map(([key, value]) => ({
      key,
      value: value == null ? "" : String(value),
    }));

    // ローカル保存（修正用）
    if (editingId) {
      responses.update(editingId, {
        building,
        company,
        inspector,
        groupId,
        dateISO,
        sheet,
        values,
      });
    } else {
      responses.create({
        building,
        company,
        inspector,
        groupId,
        dateISO,
        sheet,
        values,
      });
    }

    // === 「報告書作成」ボタン押下時の処理 ===
    if (submit && completeIndex >= 0) {
      // ★ 送信から27秒後に初回ポーリング、3秒間隔で最大5回
      const firstDelayMs = 27_000;
      const pollIntervalMs = 3_000;
      const maxAttempts = 5;

      // 完了ページへ遷移
      setIdx(completeIndex);
      setWorking(true);
      setReportUrl(undefined);

      if (!user || !bldg) {
        console.log("[Wizard] user/bldg not set; skip Flow submit");
        setWorking(false);
        return;
      }

      const payload = {
        user,
        bldg,
        seq: normalizedSeq,
        date: dateISO,
        sheet,
        company,
        building,
        inspector,
        groupId,
        values,
        answers,
        // Flow 側互換用
        varUser: user,
        varBldg: bldg,
        varSeq: normalizedSeq,
        varDate: dateISO,
        varSheet: sheet,
        varCompany: company,
        varBuilding: building,
        varInspector: inspector,
        varGroupId: groupId,
        varValues: values,
      };

      // /api/forms/report-link をポーリングして共有リンク取得
      const pollReportLink = async (attempt: number) => {
        try {
          const res = await fetch("/api/forms/report-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // ★ sheet/varSheet は送らない（sheetKey と衝突するため）
            body: JSON.stringify({
              user,
              bldg,
              seq: normalizedSeq,
              // 互換
              varUser: user,
              varBldg: bldg,
              varSeq: normalizedSeq,
            }),
          });

          const text = await res.text();
          let json: any = {};
          try {
            json = text ? JSON.parse(text) : {};
          } catch {
            json = { raw: text };
          }

          const urlFromServer: string | undefined =
            json.reportUrl ||
            json.report_url ||
            json.fileUrl ||
            json.file_url ||
            json.url ||
            json?.data?.reportUrl ||
            json?.data?.report_url ||
            json?.data?.fileUrl ||
            json?.data?.file_url ||
            json?.data?.url;

          if (typeof urlFromServer === "string" && urlFromServer.trim()) {
            setReportUrl(urlFromServer.trim());
            setWorking(false);
            return;
          }

          // ★ リトライ対象の reason は静かに継続（正常系の「まだ」）
          const reason = String(json?.reason || "");
          const retryable =
            reason === "not_ready" ||
            reason === "sheetkey_not_ready" ||
            reason === "file_not_found_or_not_ready" ||
            reason === "reportUrl_missing" ||
            reason.startsWith("upstream_http_");

          if (!retryable) {
            console.warn("[Wizard] report-link unexpected", res.status, json);
          }
        } catch (e) {
          console.warn("[Wizard] report-link fetch failed", e);
        }

        if (attempt >= maxAttempts) {
          console.warn("[Wizard] report-link timeout (sheetKey/reportUrl not returned)");
          setWorking(false);
          return;
        }

        setTimeout(() => {
          void pollReportLink(attempt + 1);
        }, pollIntervalMs);
      };

      try {
        // ① 報告書作成フロー起動（非同期：/api/forms/submit は 202 Accepted を返すだけ）
        const res = await fetch("/api/forms/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const text = await res.text();
        let json: any = {};
        try {
          json = text ? JSON.parse(text) : {};
        } catch {
          json = { raw: text };
        }

        if (!res.ok || json?.ok === false) {
          console.warn("[Wizard] submit flow error", res.status, json);
          setWorking(false);
          return;
        }

        // ② 27秒後に report-link ポーリング開始（最大5回）
        setTimeout(() => {
          void pollReportLink(1);
        }, firstDelayMs);
      } catch (e) {
        console.warn("[Wizard] submit flow fetch failed", e);
        setWorking(false);
      }
    }
  }

  const bWatch = watch("建物名");
  const sWatch = watch("ReportSheet（タブ名）"); // いまは未使用だが将来拡張用

  // ページ切り替え時はトップにスクロール
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [idx]);

  // 進捗バー計算（修正ページ / 完了ページはカウントに含めない）
  const stepIndices = useMemo(() => {
    const arr: number[] = [];
    if (infoIndex >= 0) arr.push(infoIndex);
    if (basicIndex >= 0) arr.push(basicIndex);
    if (prevIndex >= 0) arr.push(prevIndex);
    arr.push(...sectionIdxs);
    if (reviewIndex >= 0) arr.push(reviewIndex);
    return arr;
  }, [infoIndex, basicIndex, prevIndex, sectionIdxs, reviewIndex]);

  const curPos = Math.max(0, stepIndices.indexOf(idx));
  const reviewPos =
    reviewIndex >= 0 ? stepIndices.indexOf(reviewIndex) : stepIndices.length - 1;
  const maxPos = Math.max(1, reviewPos);
  const percent = Math.min(100, Math.round((curPos * 100) / maxPos));

  const headerExcerpt = (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="form-title">{meta.title || "無題のフォーム"}</div>
      <div className="form-text" style={{ opacity: 0.9 }}>
        {(meta.fixedBuilding || "") && <>建物：{meta.fixedBuilding}　</>}
        {(meta.fixedCompany || "") && <>会社：{meta.fixedCompany}</>}
      </div>
      {Array.isArray(meta.descriptions) && meta.descriptions[0] && (
        <div className="form-text" style={{ opacity: 0.8, marginTop: 4 }}>
          {meta.descriptions[0]}
        </div>
      )}
      <div className="progress mt-2">
        <div className="bar" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-meta">{percent}%</div>
    </div>
  );

  return (
    <div className="card">
      {headerExcerpt}

      {/* フォーム情報 */}
      {isInfo && (
        <div>
          <div className="card">
            {(meta.descriptions || [])
              .filter(Boolean)
              .map((d, i) => (
                <p key={i} className="form-text">
                  {d}
                </p>
              ))}
            {Array.isArray(meta.rules) && meta.rules.length > 0 && (
              <ul>
                {meta.rules.map((r, i) => (
                  <li key={i} className="form-text">
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex items-center justify-end mt-3">
            {/* 修正ページへの導線は消す（ページ自体は残す） */}
            <button
              className="btn-blue btn-nav"
              onClick={() => {
                if (basicIndex >= 0) setIdx(basicIndex);
              }}
            >
              基本情報へ →
            </button>
          </div>
        </div>
      )}

      {/* 修正ページ */}
      {isRevise && (
        <ReviseBlock
          setIdx={setIdx}
          indices={{ infoIndex, reviseIndex, reviseListIndex, basicIndex }}
          loadForEdit={loadForEdit}
        />
      )}

      {/* 修正する回答ページ（ダミー） */}
      {isReviseList && (
        <ReviseListBlock setIdx={setIdx} indices={{ reviseIndex, basicIndex }} />
      )}

      {/* 基本情報 */}
      {isBasic && (
        <BasicBlock
          setIdx={setIdx}
          indices={{ infoIndex, prevIndex, basicIndex }}
          register={register}
          pages={pages}
          fields={fields}
          validateCurrent={() => validatePageRequired(basicIndex)}
        />
      )}

      {/* 前回点検時の状況：前回報告書リンクのみ表示 */}
      {isPrev && (
        <div>
          <TopNav
            left={() => setIdx(basicIndex >= 0 ? basicIndex : 0)}
            right={() => {
              const ok = validatePageRequired(basicIndex);
              if (!ok) return;
              const fs = sectionIdxs[0];
              if (fs !== undefined) setIdx(fs);
            }}
          />
          <div className="mb-2">
            <div className="form-title">
              {currentPage.title || "前回点検時の状況"}
            </div>
            <div className="form-text" style={{ opacity: 0.9 }}>
              建物フォルダ内 <code>reports</code> フォルダにある
              「前回の報告書（Excel）」へのリンクだけを表示します。
            </div>
          </div>
          <div className="card">
            <PrevGroupsView meta={meta} watchBld={bWatch} />
          </div>
          <TopNav
            left={() => setIdx(basicIndex >= 0 ? basicIndex : 0)}
            right={() => {
              const ok = validatePageRequired(basicIndex);
              if (!ok) return;
              const fs = sectionIdxs[0];
              if (fs !== undefined) setIdx(fs);
            }}
          />
        </div>
      )}

      {/* セクション（ページごと必須チェック） */}
      {isSection && (
        <div>
          <TopNav
            left={() => setIdx(idx - 1)}
            right={() => {
              const ok = validatePageRequired(idx);
              if (!ok) return;
              if (idx === lastSectionIndex) {
                setIdx(reviewIndex);
              } else {
                setIdx(idx + 1);
              }
            }}
          />
          <div className="mb-2">
            <div className="form-title">{currentPage.title || "セクション"}</div>
            {currentPage.description && (
              <div className="form-text" style={{ opacity: 0.9 }}>
                {currentPage.description}
              </div>
            )}
          </div>
          <div className="card">
            <div className="space-y-3">
              {fields
                .filter((f) => f.pageId === currentPage.id)
                .map((f) => (
                  <div key={f.id} className="card">
                    <label className="form-text">
                      {f.label}
                      {f.required && (
                        <span style={{ color: "#f99", marginLeft: 8 }}>＊</span>
                      )}
                    </label>
                    {f.type === "text" && (
                      <input className="input mt-2" {...register(f.label)} />
                    )}
                    {f.type === "textarea" && (
                      <textarea
                        className="input mt-2"
                        style={{ height: 110 }}
                        {...register(f.label)}
                      />
                    )}
                    {f.type === "number" && (
                      <input
                        type="text"
                        className="input mt-2"
                        {...register(f.label)}
                      />
                    )}
                    {f.type === "date" && (
                      <input
                        type="date"
                        className="input mt-2"
                        {...register(f.label)}
                      />
                    )}
                    {f.type === "time" && (
                      <input
                        type="time"
                        className="input mt-2"
                        step={60}
                        {...register(f.label)}
                      />
                    )}
                    {f.type === "select" && (
                      <select className="input mt-2" {...register(f.label)}>
                        <option value="">
                          {"異常がある場合は選択してください"}
                        </option>
                        {(f.options || []).slice(0, 10).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
            </div>
          </div>
          <TopNav
            left={() => setIdx(idx - 1)}
            right={() => {
              const ok = validatePageRequired(idx);
              if (!ok) return;
              if (idx === lastSectionIndex) {
                setIdx(reviewIndex);
              } else {
                setIdx(idx + 1);
              }
            }}
          />
        </div>
      )}

      {/* 最終確認 */}
      {isReview && (
        <div>
          <div className="mb-2">
            <div className="form-title">最終確認</div>
            <div className="form-text" style={{ opacity: 0.9 }}>
              入力した箇所をセクションごとに表示します。この入力を元に報告書を作成します。
            </div>
          </div>
          <div className="space-y-3">
            {pages
              .filter((p) => p.type === "section")
              .map((sp, i) => {
                const entries = Object.entries(form.getValues())
                  .filter(([, v]) => String(v || "").trim() !== "")
                  .filter(([k]) =>
                    fields.some((f) => f.pageId === sp.id && f.label === k),
                  );
                if (entries.length === 0) return null;
                return (
                  <div key={sp.id} className="card">
                    <div className="form-title mb-1">
                      {sp.title || `セクション ${i + 1}`}
                    </div>
                    <div className="space-y-2">
                      {entries.map(([k, v]) => (
                        <div key={k} className="flex">
                          <div style={{ width: 220, color: "#cfe0ff" }}>{k}</div>
                          <div>{String(v)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="flex items-center justify-between mt-3">
            <button
              className="btn-blue-light btn-nav"
              onClick={() => setIdx(lastSectionIndex)}
            >
              ← 戻る
            </button>
            <button
              className="btn-yellow btn-nav"
              onClick={() => saveCurrent(true)}
            >
              報告書作成 →
            </button>
          </div>
        </div>
      )}

      {/* 完了ページ（進捗ゲージ＋リンク） */}
      {isComplete && (
        <div className="space-y-3">
          <SubmitProgress reportUrl={reportUrl} />
          <div className="text-right mt-4">
            <button
              className="btn-secondary"
              onClick={() => {
                setEditingId(undefined);
                setIsFromRevise(false);
                setIdx(0);
              }}
            >
              最初に戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===== 以下：修正・基本・前回表示の補助コンポーネント ===== */

function ReviseBlock({
  setIdx,
  indices,
  loadForEdit,
}: {
  setIdx: any;
  indices: any;
  loadForEdit: (id: string) => void;
}) {
  const { meta } = useBuilderStore();
  const responses = useResponsesStore();
  const [reviseBuilding, setReviseBuilding] = useState<string>(
    meta.fixedBuilding || "",
  );
  const [reviseInspector, setReviseInspector] = useState<string>("");
  const [reviseRespId, setReviseRespId] = useState<string>("");

  useEffect(() => {
    if (meta.fixedBuilding) {
      setReviseBuilding(meta.fixedBuilding);
    }
  }, [meta.fixedBuilding]);

  const buildings = useMemo(() => {
    const set = new Set(responses.list.map((r) => r.building).filter(Boolean));
    return Array.from(set);
  }, [responses.list]);

  const respListFiltered = useMemo(() => {
    const bld = reviseBuilding || meta.fixedBuilding || "";
    if (!bld) return [];
    return responses.byBuildingAndInspector(bld, reviseInspector);
  }, [responses.list, reviseBuilding, reviseInspector, meta.fixedBuilding]);

  return (
    <>
      {!meta.fixedBuilding && (
        <div className="card">
          <div className="form-title mb-1">建物を選択</div>
          <select
            className="input"
            value={reviseBuilding}
            onChange={(e) => {
              setReviseBuilding(e.target.value);
              setReviseRespId("");
            }}
          >
            <option value="">選択してください</option>
            {Array.from(new Set(buildings)).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      )}
      {meta.fixedBuilding && (
        <div className="card">
          <div className="form-text">建物：{meta.fixedBuilding}（固定）</div>
        </div>
      )}

      <div className="card">
        <div className="form-title mb-1">点検者名で絞り込み（任意）</div>
        <input
          className="input"
          placeholder="例：中尾"
          value={reviseInspector}
          onChange={(e) => setReviseInspector(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="form-title mb-1">点検日（YYYYMMDD）を選択</div>
        <select
          className="input"
          value={reviseRespId}
          onChange={(e) => setReviseRespId(e.target.value)}
          disabled={!(reviseBuilding || meta.fixedBuilding)}
        >
          <option value="">選択してください</option>
          {respListFiltered.map((r) => (
            <option key={r.id} value={r.id}>
              {r.sheet}（{r.inspector}）
            </option>
          ))}
        </select>
      </div>

      {!!reviseRespId &&
        (() => {
          const item = responses.getById(reviseRespId)!;
          const entries = Object.entries(item.values || {}).filter(
            ([, v]) => String(v || "").trim() !== "",
          );
          return (
            <div className="card">
              <div className="form-title mb-1">
                選択した回答の一覧（{item.sheet} /{" "}
                {meta.fixedBuilding || item.building} / {item.inspector || ""}）
              </div>
              <div className="space-y-2">
                {entries.length === 0 && (
                  <div className="form-text" style={{ opacity: 0.7 }}>
                    入力済み項目はありません。
                  </div>
                )}
                {entries.length > 0 &&
                  entries.map(([k, v], i) => (
                    <div key={i} className="flex">
                      <div style={{ width: 220, color: "#cfe0ff" }}>{k}</div>
                      <div>{String(v)}</div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })()}

      <div className="flex items-center justify-between mt-3">
        <button
          className="btn-red-light btn-nav"
          onClick={() =>
            setIdx(indices.infoIndex >= 0 ? indices.infoIndex : 0)
          }
        >
          ← 戻る
        </button>
        <button
          className="btn-yellow btn-nav"
          disabled={!reviseRespId}
          onClick={() => loadForEdit(reviseRespId!)}
        >
          {indices.reviseListIndex >= 0
            ? "修正する回答ページへ →"
            : "回答の修正へ →"}
        </button>
      </div>
    </>
  );
}

function ReviseListBlock({ setIdx, indices }: { setIdx: any; indices: any }) {
  return (
    <div className="space-y-3">
      <div className="card">
        <div className="form-text">修正対象が選ばれていません。</div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <button
          className="btn-blue-light btn-nav"
          onClick={() =>
            setIdx(indices.reviseIndex >= 0 ? indices.reviseIndex : 0)
          }
        >
          ← 戻る
        </button>
        <button
          className="btn-blue btn-nav"
          onClick={() =>
            setIdx(
              indices.basicIndex >= 0
                ? indices.basicIndex
                : indices.reviseIndex + 1,
            )
          }
        >
          基本情報へ →
        </button>
      </div>
    </div>
  );
}

function BasicBlock({
  setIdx,
  indices,
  register,
  pages,
  fields,
  validateCurrent,
}: any) {
  const pageId = pages[indices.basicIndex]?.id;
  const fs = fields.filter((f: any) => f.pageId === pageId);
  return (
    <div>
      <div className="card">
        <div className="space-y-3 mt-3">
          {fs.map((f: any) => (
            <div key={f.id} className="card">
              <label className="form-text">
                {f.label}
                {f.required && (
                  <span style={{ color: "#f99", marginLeft: 8 }}>＊</span>
                )}
              </label>
              {!!f.description && (
                <p className="form-text mt-1">{f.description}</p>
              )}
              {f.type === "text" && (
                <input
                  className="input mt-2"
                  {...register(f.label)}
                  placeholder={f.placeholder || ""}
                />
              )}
              {f.type === "date" && (
                <input
                  type="date"
                  className="input mt-2"
                  {...register(f.label)}
                />
              )}
              {f.type === "number" && (
                <input
                  type="text"
                  className="input mt-2"
                  {...register(f.label)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3">
        <button
          className="btn-red-light btn-nav"
          onClick={() =>
            setIdx(indices.infoIndex >= 0 ? indices.infoIndex : 0)
          }
        >
          ← 戻る
        </button>
        <button
          className="btn-blue btn-nav"
          onClick={() => {
            if (validateCurrent && !validateCurrent()) return;
            if (indices.prevIndex >= 0) setIdx(indices.prevIndex);
          }}
        >
          前回点検時の状況へ →
        </button>
      </div>
    </div>
  );
}

/**
 * 前回点検時の状況ページ用コンポーネント（前回報告書リンクのみ表示）
 * - /api/forms/previous 経由で meta.previousFromExcel に入っている情報を使う前提
 * - item.reportUrl / item.fileName / item.lastModified あたりを読みに行く
 */
function PrevGroupsView({ meta, watchBld }: any) {
  // 建物名（固定値 or 入力中の値）
  const building = (meta.fixedBuilding || watchBld || "").trim();

  // /api/forms/previous から埋め込まれた情報
  const prev = meta?.previousFromExcel || null;

  // 共有リンク候補
  const url: string | undefined =
    (prev && typeof prev.reportUrl === "string" && prev.reportUrl) ||
    (prev && typeof prev.report_url === "string" && prev.report_url) ||
    (prev && typeof prev.fileUrl === "string" && prev.fileUrl) ||
    (prev && typeof prev.file_url === "string" && prev.file_url) ||
    (prev && typeof prev.url === "string" && prev.url) ||
    undefined;

  // ファイル名候補
  const fileName: string | undefined =
    (prev &&
      (prev.fileName || prev.name || prev.displayName || prev.Name)) ||
    undefined;

  // 更新日時候補
  const lastModified: string | undefined =
    (prev &&
      (prev.lastModified ||
        prev.lastModifiedDateTime ||
        prev.modified)) ||
    undefined;

  if (!prev) {
    return (
      <div className="form-text" style={{ opacity: 0.7 }}>
        前回の報告書ファイルが見つかりませんでした。
        <br />
        まだ <code>reports</code> フォルダに報告書が作成されていない可能性があります。
      </div>
    );
  }

  if (!url) {
    return (
      <div className="form-text" style={{ opacity: 0.85 }}>
        reports フォルダに前回の報告書ファイルはありますが、
        共有リンクが設定されていません。
        <br />
        OneDrive 側で共有リンクを作成するか、フローで
        <code>Create share link</code> を追加して
        <code>reportUrl</code> を返すようにしてください。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="form-title mb-1">前回の報告書リンク</div>

      {building && (
        <div className="form-text" style={{ opacity: 0.9 }}>
          対象建物：{building}
        </div>
      )}

      <div className="card">
        <div className="form-text mb-2">
          下記リンクから、前回点検時に作成された報告書（Excel）を閲覧できます。
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-300 underline break-all"
        >
          {fileName || "前回の報告書ファイルを開く"}
        </a>
        {lastModified && (
          <div
            className="form-text mt-2"
            style={{ fontSize: 12, opacity: 0.8 }}
          >
            最終更新日：{lastModified}
          </div>
        )}
        <div
          className="form-text mt-3"
          style={{ fontSize: 12, opacity: 0.8 }}
        >
          ※ 建物フォルダ内 <code>reports</code> フォルダにある Excel ファイルのうち、
          最新のものを対象としています。
        </div>
      </div>
    </div>
  );
}
