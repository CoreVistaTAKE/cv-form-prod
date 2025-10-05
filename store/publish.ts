'use client';
import { create } from "zustand";

export type PublishItem = {
  id: string;                     // 例: "<tenant>/<nameSlug>"
  tenant: string;                 // 例: "cv"
  nameSlug: string;               // 例: "form-a"
  urlPath: string;                // 例: "/fill?tenant=cv&form=form-a"
  schema: any;
  excludes: { pages: string[]; fields: string[] };
  createdAt: string;              // ISO
};

type State = {
  list: PublishItem[];
  initOnce: () => void;
  ensureUniqueNameSlug: (tenantSlug: string, baseSlug: string) => string;
  publish: (
    tenantSlug: string,
    desiredNameSlug: string,
    schema: any,
    excludes: { pages: string[]; fields: string[] }
  ) => PublishItem;
  getByPath: (tenantSlug: string, formId: string) => PublishItem | undefined; // ★ 追加
};

const STORAGE = "cv_publish_items_v050";

export const usePublishStore = create<State>((set, get) => ({
  list: [],
  initOnce: () => {
    try {
      if (typeof window === "undefined") return; // SSR安全化
      const raw = localStorage.getItem(STORAGE);
      if (raw) set({ list: JSON.parse(raw) as PublishItem[] });
    } catch {}
  },
  ensureUniqueNameSlug: (tenantSlug, baseSlug) => {
    const list = get().list || [];
    const taken = (slug: string) =>
      list.some((it) => it.tenant === tenantSlug && it.nameSlug === slug);
    let slug = (baseSlug || "form").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!taken(slug)) return slug;
    let i = 2;
    while (taken(`${slug}_${i}`)) i++;
    return `${slug}_${i}`;
  },
  publish: (tenantSlug, desiredNameSlug, schema, excludes) => {
    const ensure = get().ensureUniqueNameSlug;
    const unique = ensure(tenantSlug, desiredNameSlug);
    const id = `${tenantSlug}/${unique}`;
    const urlPath = `/fill?tenant=${encodeURIComponent(
      tenantSlug
    )}&form=${encodeURIComponent(unique)}`;
    const item: PublishItem = {
      id,
      tenant: tenantSlug,
      nameSlug: unique,
      urlPath,
      schema,
      excludes,
      createdAt: new Date().toISOString(),
    };
    const list = (get().list || [])
      .filter((x) => !(x.tenant === tenantSlug && x.nameSlug === unique))
      .concat(item);
    set({ list });
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE, JSON.stringify(list));
      localStorage.setItem(
        `cv_form_${tenantSlug}_${unique}`,
        JSON.stringify({ schema, excludes })
      );
    }
    return item;
  },
  getByPath: (tenantSlug, formId) => {
    const list = get().list || [];
    // formId は通常 nameSlug。id 互換も一応ケア
    return (
      list.find(
        (it) => it.tenant === tenantSlug && it.nameSlug === formId
      ) || list.find((it) => it.id === `${tenantSlug}/${formId}`)
    );
  },
}));
