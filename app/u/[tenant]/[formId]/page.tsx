// app/u/[tenant]/[formId]/page.tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { usePublishStore } from "@/store/publish";
import { useBuilderStore } from "@/store/builder";
import { Wizard } from "@/components/Wizard";
import { filterSchemaForFill, safeArrayOfString } from "@/store/builder";

type Excludes = { pages?: unknown; fields?: unknown };

export default function PublishedFormPage({ params }: { params: { tenant: string; formId: string } }) {
  // publish 側の必要な要素だけ selector で取得（lint/型が安定）
  const initPublish = usePublishStore((s) => s.initOnce);
  const getByPath = usePublishStore((s) => s.getByPath);
  const pubList = usePublishStore((s) => s.list);

  // builder 側も必要な関数だけ
  const hydrateFrom = useBuilderStore((s) => s.hydrateFrom);

  useEffect(() => {
    initPublish();
  }, [initPublish]);

  const item = useMemo(
    () => getByPath(params.tenant, params.formId),
    [getByPath, params.tenant, params.formId, pubList],
  );

  useEffect(() => {
    if (!item) return;

    const schema = item.schema;
    if (!schema) return;

    const metaPages = safeArrayOfString(schema?.meta?.excludePages);
    const metaFields = safeArrayOfString(schema?.meta?.excludeFields);

    const ex: Excludes = (item as any)?.excludes || {};
    const exPages = safeArrayOfString((ex as any)?.pages);
    const exFields = safeArrayOfString((ex as any)?.fields);

    // item.excludes があれば優先。無ければ schema.meta を使う
    const resolved = {
      excludePages: exPages.length ? exPages : metaPages,
      excludeFields: exFields.length ? exFields : metaFields,
    };

    const filtered = filterSchemaForFill(
      {
        meta: schema.meta || {},
        pages: Array.isArray(schema.pages) ? schema.pages : [],
        fields: Array.isArray(schema.fields) ? schema.fields : [],
      },
      resolved,
    );

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
