// app/api/forms/read/route.ts
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

const FLOW_GET_BUILD_STATUS_URL = process.env.FLOW_GET_BUILD_STATUS_URL!;
const FLOW_SAVE_FILES_URL = process.env.FLOW_SAVE_FILES_URL!; // このフローに「op=read, path」の分岐を必ず用意

async function postJson<T>(url: string, body: any, timeoutMs = 20000): Promise<T> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      cache: "no-store",
    });

    const txt = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${txt}`);
    }

    try {
      return JSON.parse(txt) as T;
    } catch {
      // Flow 側が text を返すケースもあるので、そのまま any で返す
      return txt as any as T;
    }
  } finally {
    clearTimeout(id);
  }
}

type StatusRes = {
  url?: string;
  qrPath?: string;
  schemaPath?: string;
  pct?: number;
  ok?: boolean;
  body?: any;
  result?: any;
};

export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => ({} as any));

    const {
      // 1) ユーザービルダーからの読み込み用（schemaPath 直指定）
      schemaPath: bodySchemaPath,
      path,
      token,

      // 2) /fill?user=&bldg= からの呼び出し用
      varUser,
      varBldg,
      statusPath,
      user,
      bldg,
    } = raw ?? {};

    // ==========================
    // 1) schemaPath / path 直指定モード
    //    - UserBuilderPanels.tsx からの呼び出し:
    //      body: { schemaPath, token }
    // ==========================
    const schemaPath =
      (typeof bodySchemaPath === "string" && bodySchemaPath.trim()) ||
      (typeof path === "string" && path.trim()) ||
      "";

    if (schemaPath) {
      if (!FLOW_SAVE_FILES_URL) {
        return NextResponse.json(
          { ok: false, reason: "FLOW_SAVE_FILES_URL 未設定（read 分岐必須）" },
          { status: 500 }
        );
      }

      // Flow 側: { op: "read", path, token? } → 対象 JSON の中身を text で返す想定
      const fileRes: any = await postJson<any>(FLOW_SAVE_FILES_URL, {
        op: "read",
        path: schemaPath,
        token,
      });

      const text =
        typeof fileRes === "string"
          ? fileRes
          : fileRes?.text || fileRes?.body?.text || fileRes?.content || "";

      if (!String(text).trim()) {
        return NextResponse.json(
          {
            ok: false,
            reason: "フォーム JSON の内容が取得できませんでした（SaveFiles フローの read 分岐を確認）",
          },
          { status: 502 }
        );
      }

      const parsed = JSON.parse(text);
      const payload: any = { ...parsed };

      // 旧バージョン互換: schema プロパティにも同じ内容を入れておく
      if (payload && typeof payload === "object" && !("schema" in payload)) {
        payload.schema = parsed;
      }

      return NextResponse.json(payload);
    }

    // ==========================
    // 2) user / bldg から status.json を辿るモード
    //    - FillClient.tsx からの呼び出し:
    //      body: { user, bldg, host }
    //    - 旧バージョン互換:
    //      body: { varUser, varBldg, statusPath }
    // ==========================
    const userStr = String(varUser ?? user ?? "").trim();
    const bldgStr = String(varBldg ?? bldg ?? "").trim();

    if (!userStr || !bldgStr) {
      return NextResponse.json(
        { ok: false, reason: "schemaPath か user/bldg のいずれかは必須です" },
        { status: 400 }
      );
    }

    if (!FLOW_GET_BUILD_STATUS_URL) {
      return NextResponse.json(
        { ok: false, reason: "FLOW_GET_BUILD_STATUS_URL 未設定" },
        { status: 500 }
      );
    }
    if (!FLOW_SAVE_FILES_URL) {
      return NextResponse.json(
        { ok: false, reason: "FLOW_SAVE_FILES_URL 未設定（read 分岐必須）" },
        { status: 500 }
      );
    }

    // status.json の取得（statusPath が無い場合も Flow 側で解決できる前提）
    const st = await postJson<StatusRes>(FLOW_GET_BUILD_STATUS_URL, {
      varUser: userStr,
      varBldg: bldgStr,
      statusPath,
    });

    const schemaPathFromStatus =
      st?.schemaPath ||
      st?.body?.schemaPath ||
      st?.result?.schemaPath ||
      "";

    if (!schemaPathFromStatus) {
      return NextResponse.json(
        {
          ok: false,
          reason: "schemaPath が見つかりません（status.json の出力/フローを確認）",
        },
        { status: 502 }
      );
    }

    // OneDrive(SharePoint) の該当 JSON を Flow 経由で読み取り
    // Flow 側：パラメータ { op: "read", path: schemaPathFromStatus } → Get file content → Response raw text
    const fileRes: any = await postJson<any>(FLOW_SAVE_FILES_URL, {
      op: "read",
      path: schemaPathFromStatus,
    });

    const text =
      typeof fileRes === "string"
        ? fileRes
        : fileRes?.text || fileRes?.body?.text || fileRes?.content || "";

    if (!String(text).trim()) {
      return NextResponse.json(
        {
          ok: false,
          reason: "フォーム JSON の内容が取得できませんでした（SaveFiles フローの read 分岐を確認）",
        },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(text);
    const payload: any = { ...parsed };

    // 旧バージョン互換: schema プロパティにも同じ内容を入れておく
    if (payload && typeof payload === "object" && !("schema" in payload)) {
      payload.schema = parsed;
    }

    // /fill 用に最低限のメタだけ _source に付ける（UI 側は meta/pages/fields だけを素直に使う想定）
    payload._source = {
      user: userStr,
      bldg: bldgStr,
      schemaPath: schemaPathFromStatus,
      url:
        st?.url ||
        st?.body?.url ||
        st?.result?.url ||
        "",
    };

    return NextResponse.json(payload);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, reason: e?.message || "unexpected error" },
      { status: 500 }
    );
  }
}