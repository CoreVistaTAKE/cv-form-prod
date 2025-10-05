"use client";
import React, { useEffect, useMemo } from "react";
import { usePublishStore } from "@/store/publish";
import { useBuilderStore } from "@/store/builder";
import { Wizard } from "@/components/Wizard";

function applyExcludes(schema: any, excludes?: { pages: string[]; fields: string[] }) {
  if (!excludes) return schema;
  const pageSet = new Set(excludes.pages || []);
  const fieldSet = new Set(excludes.fields || []);
  const pages = (schema.pages || []).filter((p: any) => p.type !== "section" || !pageSet.has(p.id));
  const allowedPageIds = new Set(pages.map((p: any) => p.id));
  const fields = (schema.fields || []).filter((f: any) => allowedPageIds.has(f.pageId) && !fieldSet.has(f.id));
  return { meta: schema.meta, pages, fields };
}

export default function PublishedFormPage({ params }: { params: { tenant: string; formId: string } }) {
  // publish 側の必要な要素だけ selector で取得（lint/型が安定）
  const initPublish = usePublishStore((s) => s.initOnce);
  const getByPath   = usePublishStore((s) => s.getByPath);
  const pubList     = usePublishStore((s) => s.list);

  // builder 側も必要な関数だけ
  const hydrateFrom = useBuilderStore((s) => s.hydrateFrom);

  useEffect(() => {
    initPublish();
  }, [initPublish]);

  const item = useMemo(
    () => getByPath(params.tenant, params.formId),
    [getByPath, params.tenant, params.formId, pubList]
  );

  useEffect(() => {
    if (!item) return;
    const filtered = applyExcludes(item.schema, item.excludes);
    hydrateFrom(filtered);
  }, [item, hydrateFrom]);

  if (!item) {
    return (
      <div className="card">
        <div className="form-text">フォームが見つかりません（URLをご確認ください）。</div>
      </div>
    );
  }

  return <Wizard />;
}
