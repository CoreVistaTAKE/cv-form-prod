// store/responses.ts
"use client";
import { create } from "zustand";
import { nanoid } from "nanoid";

export type ResponseItem = {
  id: string;
  building: string;
  company?: string;
  inspector?: string;
  groupId?: string;
  dateISO?: string;
  sheet?: string; // YYYYMMDD
  values?: Record<string, string>;
  createdAt: number;
};

type State = {
  list: ResponseItem[];
  hydrated: boolean;
  initOnce: () => void;
  save: () => void;
  create: (p: Omit<ResponseItem, "id" | "createdAt">) => ResponseItem;
  update: (id: string, p: Partial<ResponseItem>) => void;
  getById: (id: string) => ResponseItem | undefined;
  latestBefore: (building: string, yyyymmdd: string) => ResponseItem | undefined;
  byBuildingAndInspector: (
    building: string,
    inspector?: string
  ) => ResponseItem[];
};

const STORAGE_KEY = "cv_responses_v049";

export const useResponsesStore = create<State>((set, get) => ({
  list: [],
  hydrated: false,

  initOnce: () => {
    if (get().hydrated) return;
    if (typeof window === "undefined") return;

    // 1) まず localStorage から読み込む
    let loaded: ResponseItem[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch {
      loaded = [];
    }
    set({ list: loaded, hydrated: true });

    // 2) ついでに Excel の「前回回答」を 1件だけ取り込む（ベストエフォート）
    (async () => {
      try {
        const url = new URL(window.location.href);
        const user =
          url.searchParams.get("user") ||
          (process.env.NEXT_PUBLIC_DEFAULT_USER as string) ||
          "";
        const bldg = url.searchParams.get("bldg") || "";
        const seqParam =
          url.searchParams.get("Sseq") || url.searchParams.get("seq") || "001";

        if (!user || !bldg) return;

        const normalizedSeq = seqParam.toString().padStart(3, "0");

        const res = await fetch("/api/forms/previous", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            varUser: user,
            varBldg: bldg,
            varSeq: normalizedSeq,
          }),
        });

        if (!res.ok) {
          console.warn(
            "[responses.initOnce] previous HTTP error",
            res.status
          );
          return;
        }

        const payload = await res.json();
        const item = payload?.item || payload?.previous || null;
        if (!item) return;

        set((s) => {
          const list = [...s.list];

          const normalized: ResponseItem = {
            id: item.id || nanoid(),
            createdAt: item.createdAt || Date.now(),
            building: item.building || bldg,
            company: item.company,
            inspector: item.inspector,
            groupId: item.groupId || "",
            dateISO: item.dateISO,
            sheet: item.sheet,
            values: item.values || {},
          };

          const idx = list.findIndex(
            (x) =>
              x.building === normalized.building && x.sheet === normalized.sheet
          );
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...normalized };
          } else {
            list.push(normalized);
          }

          try {
            if (typeof window !== "undefined") {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            }
          } catch {
            // localStorage が死んでいてもフォーム自体は動かしたいので握りつぶす
          }

          return { list };
        });
      } catch (e) {
        console.warn("[responses.initOnce] previous fetch failed", e);
      }
    })();
  },

  save: () => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(get().list));
    } catch {
      // 保存失敗は致命傷ではないので黙殺
    }
  },

  create: (p) => {
    const item: ResponseItem = { id: nanoid(), createdAt: Date.now(), ...p };
    set((s) => ({ list: [...s.list, item] }));
    get().save();
    return item;
  },

  update: (id, p) => {
    set((s) => ({
      list: s.list.map((x) => (x.id === id ? { ...x, ...p } : x)),
    }));
    get().save();
  },

  getById: (id) => get().list.find((x) => x.id === id),

  latestBefore: (building, ymd) => {
    const list = get()
      .list.filter((x) => x.building === building && x.sheet && x.sheet < ymd)
      .sort((a, b) => (b.sheet || "").localeCompare(a.sheet || ""));
    return list[0];
  },

  byBuildingAndInspector: (building, inspector) => {
    return get()
      .list.filter(
        (x) =>
          x.building === building &&
          (!inspector || (x.inspector || "").includes(inspector))
      )
      .sort((a, b) => (b.sheet || "").localeCompare(a.sheet || ""));
  },
}));
