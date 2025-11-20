"use client";
import React from "react";
import { Wizard } from "@/components/Wizard";

type Props = { user?: string; bldg?: string; host?: string };
type RegItem = { bldg: string; statusPath: string; url?: string };

async function resolveStatus(statusPath: string): Promise<{ url?: string } | null> {
  try {
    const res = await fetch("/api/flows/get-build-status", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ statusPath }),
    });
    if (!res.ok) return null;
    const j = await res.json().catch(() => ({} as any));
    const url = j?.url || j?.body?.url;
    return url ? { url } : null;
  } catch {
    return null;
  }
}

function loadRegistry(): RegItem[] {
  try {
    const raw = localStorage.getItem("cv_registry") || "[]";
    const arr = JSON.parse(raw);
    const uniq = new Map<string, RegItem>();
    for (const it of Array.isArray(arr) ? arr : []) {
      if (it && it.bldg && it.statusPath) uniq.set(it.statusPath, it as RegItem);
    }
    return Array.from(uniq.values());
  } catch {
    return [];
  }
}

function saveRegistry(items: RegItem[]) {
  try { localStorage.setItem("cv_registry", JSON.stringify(items)); } catch {}
}

export default function FillClient({ user, bldg, host }: Props) {
  // 直指定は最短で Wizard を描画
  if (user && bldg) {
    return <Wizard {...({ user, bldg, host } as any)} />;
  }

  const [registry, setRegistry] = React.useState<RegItem[]>([]);
  const [options, setOptions] = React.useState<string[]>([]);
  const [pickedBldg, setPickedBldg] = React.useState("");
  const [formUrl, setFormUrl] = React.useState("");

  // 初回ロード：レジストリ→存在チェック→クリーン化
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      const base = loadRegistry();
      const cleaned: RegItem[] = [];
      for (const it of base) {
        const ok = await resolveStatus(it.statusPath);
        if (ok?.url) cleaned.push({ ...it, url: ok.url });
      }
      if (cancelled) return;
      saveRegistry(cleaned);
      setRegistry(cleaned);
      const names = Array.from(new Set(cleaned.map((x) => x.bldg))).sort();
      setOptions(names);

      const last = localStorage.getItem("cv_last_building") || "";
      const init = last && names.includes(last) ? last : (names[0] || "");
      setPickedBldg(init);
      const url = cleaned.find((x) => x.bldg === init)?.url || "";
      setFormUrl(url);
    })();

    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    const url = registry.find((x) => x.bldg === pickedBldg)?.url || "";
    setFormUrl(url);
    try { localStorage.setItem("cv_last_building", pickedBldg || ""); } catch {}
  }, [pickedBldg, registry]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label>
          建物：
          <select
            value={pickedBldg}
            onChange={(e) => setPickedBldg(e.target.value)}
            style={{ marginLeft: 8, padding: "6px 10px", border: "1px solid #E5E7EB", borderRadius: 6 }}
          >
            {options.length === 0 ? (
              <option value="">（建物がありません）</option>
            ) : (
              options.map((x) => <option key={x} value={x}>{x}</option>)
            )}
          </select>
        </label>
        {formUrl && (
          <a className="btn" href={formUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
            この建物のフォームを新しいタブで開く
          </a>
        )}
      </div>

      {formUrl ? (
        <div style={{ border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden", height: "70vh" }}>
          <iframe src={formUrl} style={{ width: "100%", height: "100%", border: 0 }} title="building-form" />
        </div>
      ) : (
        <div style={{ padding: 8, border: "1px dashed #CBD5E1", borderRadius: 8, color: "#334155" }}>
          有効な建物が見つかりません。まず「ユーザー用ビルダー → 建物フォルダ作成」で建物を作成し、
          ステータス 100% で URL が発行されていることを確認してください。
        </div>
      )}
    </div>
  );
}
