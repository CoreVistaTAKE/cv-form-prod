"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useBuilderStore } from "@/store/builder";
import { usePublishStore } from "@/store/publish";

const HOST = process.env.NEXT_PUBLIC_CANONICAL_HOST;

export default function UserBuilderPage() {
  // builder
  const initBuilder = useBuilderStore(s => s.initOnce);
  const meta   = useBuilderStore(s => s.meta);
  const pages  = useBuilderStore(s => s.pages);
  const fields = useBuilderStore(s => s.fields);
  const setMeta = useBuilderStore(s => s.setMeta);

  // publish
  const initPublish = usePublishStore(s => s.initOnce);
  const ensureUnique = usePublishStore(s => s.ensureUniqueNameSlug);
  const doPublish = usePublishStore(s => s.publish);
  const pubList   = usePublishStore(s => s.list); // 使わないが将来の拡張用で保持

  const [tenant, setTenant] = useState("visone");
  const [slug, setSlug] = useState("");
  const [exPages, setExPages] = useState<string[]>([]);
  const [exFields, setExFields] = useState<string[]>([]);
  const [resultUrl, setResultUrl] = useState("");

  // 初期化
  useEffect(() => { initBuilder(); initPublish(); }, [initBuilder, initPublish]);

  // スラッグの初期値（タイトル由来 + ユニーク化）
  useEffect(() => {
    if (!slug) {
      const base = (meta?.title || "form").toLowerCase().replace(/[^a-z0-9_-]/g, "");
      const uniq = ensureUnique(tenant, base || "form");
      setSlug(uniq);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant, meta?.title, ensureUnique]);

  const onTogglePage = (id: string) => {
    setExPages(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.concat(id));
  };
  const onToggleField = (id: string) => {
    setExFields(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.concat(id));
  };

  const onPublish = () => {
    const schema = { meta, pages, fields };
    const item = doPublish(tenant, slug, schema, { pages: exPages, fields: exFields });
    const host = HOST || (typeof window !== "undefined" ? window.location.host : "");
    const abs  = `https://${host}${item.urlPath}`;
    setResultUrl(abs);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(abs).catch(() => {});
    }
  };

  const sectionPages  = useMemo(() => pages.filter(p => p.type === "section"), [pages]);
  const sectionFields = useMemo(
    () => fields.filter(f => sectionPages.some(p => p.id === f.pageId)),
    [fields, sectionPages]
  );

  return (
    <div className="container">
      <div className="card">
        <h1 className="title">ユーザー用ビルダー</h1>
        <p className="form-text">
          建物名・会社名・テーマを設定して「発行」。除外（任意）でユーザーに見せない項目を隠せます。
        </p>

        <div className="grid gap-4">
          <div>
            <label className="label">会社名（固定）</label>
            <input className="input" value={meta.fixedCompany || ""} onChange={e => setMeta({ fixedCompany: e.target.value })}/>
          </div>
          <div>
            <label className="label">建物名（固定）</label>
            <input className="input" value={meta.fixedBuilding || ""} onChange={e => setMeta({ fixedBuilding: e.target.value })}/>
          </div>
          <div>
            <label className="label">テーマ</label>
            <select className="input" value={meta.theme || "black"} onChange={e => setMeta({ theme: e.target.value as any })}>
              <option value="black">黒（高コントラスト）</option>
              <option value="white">白（濃色文字固定）</option>
              <option value="pastel">パステル</option>
            </select>
          </div>
        </div>

        <hr className="divider" />

        <h2 className="subtitle">除外の指定（任意）</h2>
        <div className="grid gap-2">
          <div>
            <div className="muted">セクション（ページ）</div>
            <div className="flex flex-col gap-1">
              {sectionPages.map(p => (
                <label key={p.id} className="checkbox-row">
                  <input type="checkbox" checked={exPages.includes(p.id)} onChange={() => onTogglePage(p.id)}/>
                  <span>{p.title || "セクション"} <span className="muted">({p.id.slice(0,6)})</span></span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="muted">フィールド</div>
            <div className="flex flex-col gap-1" style={{maxHeight:240, overflow:"auto"}}>
              {sectionFields.map(f => (
                <label key={f.id} className="checkbox-row">
                  <input type="checkbox" checked={exFields.includes(f.id)} onChange={() => onToggleField(f.id)}/>
                  <span>{f.label} <span className="muted">({f.type})</span></span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <hr className="divider" />

        <h2 className="subtitle">発行</h2>
        <div className="grid gap-4">
          <div>
            <label className="label">テナント（英数短め）</label>
            <input className="input" value={tenant} onChange={e => setTenant(e.target.value.replace(/[^a-z0-9_-]/g, ""))}/>
          </div>
          <div>
            <label className="label">フォーム名スラッグ（英数）</label>
            <input className="input" value={slug} onChange={e => setSlug(e.target.value.replace(/[^a-z0-9_-]/g, ""))}/>
          </div>
          <div>
            <button className="btn btn-primary" onClick={onPublish}>発行する</button>
          </div>
        </div>

        {resultUrl && (
          <div className="alert success" style={{ marginTop: 16 }}>
            <div>発行しました：<a href={resultUrl} target="_blank" rel="noreferrer">{resultUrl}</a></div>
            <div className="muted">（URL はクリップボードにもコピー済み）</div>
          </div>
        )}
      </div>
    </div>
  );
}