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
  seq?: string;  // 3桁 seq（例: 001）
  host?: string; // 今回の Flow では未使用だが将来拡張用
};

export function Wizard(props: WizardProps) {
  const { user, bldg, seq } = props || {};
  const normalizedSeq = (seq || "001").toString().padStart(3, "0");

  const { pages, fields, meta } = useBuilderStore();
  const responses = useResponsesStore();

  const [idx, setIdx] = useState(0);
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [revisePrevItem, setRevisePrevItem] = useState<any | undefined>(undefined);
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

  useEffect(() => {
    responses.initOnce();
  }, [responses]);

  useEffect(() => {
    applyTheme(meta.theme);
  }, [meta.theme]);

  // ▼ 初期値：点検日とReportSheetはJST（東京）で統一
  useEffect(() => {
    const defaultISO = isoDateTokyo(); // JST "YYYY-MM-DD"
    const cur = getValues("点検日") as string | undefined;
    if (!cur) {
      setValue("点検日", defaultISO);
      setValue("ReportSheet（タブ名）", toYYYYMMDD());
    }
    const sub = watch((values: any, ctx: any) => {
      if (ctx?.name === "点検日") {
        const raw = values["点検日"] as string | undefined;
        const base = toYYYYMMDD(fromISODateStringJST(raw).toDate()); // JSTでYYYYMMDD
        const rs = values["ReportSheet（タブ名）"] as string | undefined;
        if (!rs || /^\d{8}(_\d+)?$/.test(rs)) {
          setValue("ReportSheet（タブ名）", base);
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

  // ▼ ナビ
  const TopNav = ({ left, right }: { left: () => void; right: () => void }) => (
    <div className="flex items-center justify-between mb-2">
      <button className="btn-blue-light btn-nav" onClick={left}>
        ← 戻る
      </button>
      <button className="btn-blue btn-nav" onClick={right}>
        次へ →
      </button>
    </div>
  );

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

    // === 「報告書作成」ボタン押下時の処理 ==================================
    if (submit && completeIndex >= 0) {
      // 進捗UIは 0〜37秒で動かす想定
      // 実際の共有リンク取得は：
      // - 最初の 25 秒は何もせず待つ
      // - その後 3 秒間隔で最大 5 回 /api/forms/report-link を叩く
      // - いずれかで reportUrl が返ってきた時点でポーリングは終了する
      const initialDelayMs = 25_000; // 最初の1回は25秒後
      const pollIntervalMs = 3_000;  // その後は3秒間隔
      const maxAttempts = 5;         // 最大5回

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
            body: JSON.stringify({
              user,
              bldg,
              seq: normalizedSeq,
              sheet,
              varSheet: sheet,
            }),
          });

          const text = await res.text();
          let json: any = {};
          try {
            json = text ? JSON.parse(text) : {};
          } catch {
            json = { raw: text };
          }

          if (res.ok && json?.ok !== false) {
            let urlFromFlow: string | undefined =
              json.reportUrl ||
              json.report_url ||
              json.fileUrl ||
              json.file_url ||
              json.url;

            if (!urlFromFlow && json.data) {
              urlFromFlow =
                json.data.reportUrl ||
                json.data.report_url ||
                json.data.fileUrl ||
                json.data.file_url ||
                json.data.url;
            }

            if (typeof urlFromFlow === "string" && urlFromFlow.trim()) {
              // 共有リンク取得成功：ここでポーリング打ち切り
              setReportUrl(urlFromFlow.trim());
              setWorking(false);
              return;
            }
          } else {
            console.warn("[Wizard] report-link error", res.status, json);
          }
        } catch (e) {
          console.warn("[Wizard] report-link fetch failed", e);
        }

        // ここまで来たらまだ生成中 or 失敗
        if (attempt >= maxAttempts) {
          console.warn("[Wizard] report-link timeout");
          setWorking(false);
          return;
        }

        // 次のポーリングを予約
        setTimeout(() => {
          pollReportLink(attempt + 1);
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

        // ② フロー起動を受け付けたら、25秒待ってから共有リンク取得フローを叩き始める
        setTimeout(() => {
          pollReportLink(1);
        }, initialDelayMs);
      } catch (e) {
        console.warn("[Wizard] submit flow fetch failed", e);
        setWorking(false);
      }
    }
  }

  const bWatch = watch("建物名");
  const sWatch = watch("ReportSheet（タブ名）");

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

      {/* 以下、info / revise / basic / previous / section / review / complete は元のまま */}
      {/* ...（中略：あなたの元のコードと同じ）... */}

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

// ReviseBlock / ReviseListBlock / BasicBlock / PrevGroupsView は
// そのままなので省略（上で貼った完全版を使ってOK）
