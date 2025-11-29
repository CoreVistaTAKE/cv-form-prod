"use client";
import { create } from "zustand";
import { nanoid } from "nanoid";
import type { Theme } from "@/utils/theme";
import type { ResponseItem } from "@/store/responses";

export type FieldType =
  | "forminfo"
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "select"
  | "radio"
  | "checkbox"
  | "file";

export type PageType =
  | "info"
  | "revise"
  | "reviseList"
  | "basic"
  | "previous"
  | "section"
  | "review"
  | "complete";

export interface Field {
  id: string;
  pageId: string;
  type: FieldType;
  key: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  labelBold?: boolean;
  labelUnderline?: boolean;
  descBold?: boolean;
  descUnderline?: boolean;
  labelSizeNum?: number;
  descSizeNum?: number;
  bgColor?: string;
  description?: string;
  decimalPlaces?: number;
  selectFirstIsInstruction?: boolean;
}

export interface Page {
  id: string;
  type: PageType;
  title?: string;
  description?: string;
}

export interface FormMeta {
  title: string;
  descriptions?: string[];
  rules?: string[];
  fixedCompany?: string;
  fixedBuilding?: string;
  theme?: Theme;
  /** 本文背景色（任意）。未設定ならUI側で既定色にフォールバック可 */
  contentBg?: string;

  /**
   * ユーザービルダーで設定する「対象外」情報。
   * フォーム側の描画／デフォルト値（「入力しない」）に利用する想定。
   */
  excludePages?: string[];
  excludeFields?: string[];

  /**
   * Excel「回答」シートから読み込んだ直近1件の回答。
   * /api/forms/previous → FillClient → hydrateFrom(meta) で注入する。
   */
  previousFromExcel?: ResponseItem | null;
}

interface State {
  meta: FormMeta;
  pages: Page[];
  fields: Field[];
  activePageId?: string;
  hydrated: boolean;

  initOnce: () => void;
  save: () => void;
  setMeta: (m: Partial<FormMeta>) => void;

  addPage: (t: PageType) => Page;
  updatePage: (id: string, p: Partial<Page>) => void;
  removePage: (id: string) => void;
  setActivePage: (id: string) => void;
  movePage: (from: number, to: number) => void;

  addFieldToActivePage: (t: FieldType) => void;
  copyLastFieldInActivePage: () => void;
  updateField: (id: string, p: Partial<Field>) => void;
  removeField: (id: string) => void;

  hydrateFrom: (schema: { meta: any; pages: any[]; fields: any[] }) => void;
  resetAll: () => void;
}

const defaultMeta: FormMeta = {
  title: "無題のフォーム",
  descriptions: [],
  rules: [],
  fixedCompany: "",
  fixedBuilding: "",
  theme: "black",
  // contentBg は任意。必要ならここで既定色を指定してもよい（例：contentBg: "#0b0f1a"）
  excludePages: [],
  excludeFields: [],
  previousFromExcel: null,
};

function ensureSystemPages(pages: Page[]): Page[] {
  // 既定には reviseList は含めない（必要時に追加）
  const need: PageType[] = ["info", "revise", "basic", "previous", "review", "complete"];
  const exist = new Set(pages.map((p) => p.type));
  const out = [...pages];
  for (const t of need) {
    if (!exist.has(t)) {
      out.push({
        id: nanoid(),
        type: t,
        title:
          t === "info"
            ? "フォーム情報"
            : t === "revise"
            ? "修正ページ"
            : t === "basic"
            ? "基本情報ページ"
            : t === "previous"
            ? "前回点検時の状況"
            : t === "review"
            ? "最終確認"
            : "完了",
      });
    }
  }
  return out;
}

export const useBuilderStore = create<State>((set, get) => ({
  meta: defaultMeta,
  pages: [],
  fields: [],
  activePageId: undefined,
  hydrated: false,

  initOnce: () => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("cv_form_schema_v049") : null;
      if (raw) {
        const data = JSON.parse(raw);
        const pages = ensureSystemPages(data.pages || []);
        const meta = { ...defaultMeta, ...(data.meta || {}) };
        const fields = data.fields || [];
        const active =
          data.activePageId ||
          pages.find((p) => p.type === "section")?.id ||
          pages[0]?.id;
        set({ meta, pages, fields, activePageId: active, hydrated: true });
        return;
      }
    } catch {}
    const pages = ensureSystemPages([]);
    set({ pages, activePageId: pages[0]?.id, fields: [], hydrated: true });
    get().save();
  },

  save: () => {
    if (typeof window === "undefined") return;
    const { meta, pages, fields, activePageId } = get();
    localStorage.setItem(
      "cv_form_schema_v049",
      JSON.stringify({ meta, pages, fields, activePageId })
    );
  },

  setMeta: (m) =>
    set((s) => {
      const meta = { ...s.meta, ...m };
      setTimeout(get().save, 0);
      return { meta };
    }),

  addPage: (t) => {
    const p = {
      id: nanoid(),
      type: t,
      title: t === "section" ? "セクション" : t === "basic" ? "基本情報ページ" : undefined,
    } as Page;
    set((s) => ({ pages: [...s.pages, p] }));
    get().save();
    return p;
  },

  updatePage: (id, p) =>
    set((s) => {
      const pages = s.pages.map((x) => (x.id === id ? { ...x, ...p } : x));
      setTimeout(get().save, 0);
      return { pages };
    }),

  removePage: (id) =>
    set((s) => {
      const tgt = s.pages.find((p) => p.id === id);
      if (!tgt) return s;
      if (tgt.type !== "section") {
        alert("このページは削除できません。セクションのみ削除可能です。");
        return s;
      }
      const pages = s.pages.filter((x) => x.id !== id);
      const fields = s.fields.filter((f) => f.pageId !== id);
      setTimeout(get().save, 0);
      return { pages, fields };
    }),

  setActivePage: (id) => set({ activePageId: id }),

  movePage: (from, to) =>
    set((s) => {
      if (from < 0 || to < 0 || from >= s.pages.length || to >= s.pages.length) return s;
      const arr = [...s.pages];
      const item = arr.splice(from, 1)[0];
      arr.splice(to, 0, item);
      setTimeout(get().save, 0);
      return { pages: arr };
    }),

  addFieldToActivePage: (t) => {
    let active = get().activePageId;
    let page = get().pages.find((p) => p.id === active);
    if (!page) {
      page = get().pages.find((p) => p.type === "section")!;
    }
    const f: any = {
      id: nanoid(),
      pageId: page.id,
      type: t,
      key: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      label: `${t} 質問`,
      labelSizeNum: 10,
      descSizeNum: 10,
      bgColor: "",
    };
    if (t === "number") f.decimalPlaces = 2;
    if (t === "select") {
      f.options = ["選択肢 1", "選択肢 2"];
      f.selectFirstIsInstruction = true;
    }
    if (t === "radio" || t === "checkbox") {
      f.options = ["選択肢 1", "選択肢 2"];
    }
    if (t === "date") {
      f.label = "点検日";
      f.description = "空白は当日になります。さかのぼって入力する際はその日を入力してください";
    }
    if (t === "forminfo") {
      f.label = "フォーム設定";
    }
    set((s) => ({ fields: [...s.fields, f] }));
    get().save();
  },

  copyLastFieldInActivePage: () => {
    const p = get().activePageId;
    const fs = get().fields.filter((f) => f.pageId === p);
    if (fs.length === 0) return;
    const last = fs[fs.length - 1];
    const dup = {
      ...last,
      id: nanoid(),
      key: `q_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };
    set((s) => ({ fields: [...s.fields, dup] }));
    get().save();
  },

  updateField: (id, p) =>
    set((s) => {
      const fields = s.fields.map((x) => (x.id === id ? { ...x, ...p } : x));
      setTimeout(get().save, 0);
      return { fields };
    }),

  removeField: (id) =>
    set((s) => {
      const fields = s.fields.filter((x) => x.id !== id);
      setTimeout(get().save, 0);
      return { fields };
    }),

  hydrateFrom: (schema) => {
    const pages = ensureSystemPages(schema.pages || []);
    const meta = { ...defaultMeta, ...(schema.meta || {}) };
    const fields = schema.fields || [];
    const active = pages.find((p) => p.type === "section")?.id || pages[0]?.id;
    set({ meta, pages, fields, activePageId: active, hydrated: true });
  },

  resetAll: () => {
    if (confirm("フォーム定義を初期化します。よろしいですか？")) {
      const pages = ensureSystemPages([]);
      set({ meta: defaultMeta, pages, fields: [], activePageId: pages[0]?.id });
    }
  },
}));
