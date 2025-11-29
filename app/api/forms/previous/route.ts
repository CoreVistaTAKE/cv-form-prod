// app/api/forms/previous/route.ts
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import * as XLSX from "xlsx";

const FORM_BASE_ROOT = process.env.FORM_BASE_ROOT;

type ResponseItem = {
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

// Excel のシリアル値 → 日付文字列 YYYY-MM-DD
function excelSerialToDateISO(val: any): string {
  if (!val && val !== 0) return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = `${val.getMonth() + 1}`.padStart(2, "0");
    const d = `${val.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "number") {
    // Excel 起点 1899-12-30
    const base = Date.UTC(1899, 11, 30);
    const ms = Math.round(val * 24 * 60 * 60 * 1000);
    const dt = new Date(base + ms);
    const y = dt.getUTCFullYear();
    const m = `${dt.getUTCMonth() + 1}`.padStart(2, "0");
    const d = `${dt.getUTCDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

// Excel のシリアル値 → 時刻文字列 HH:mm
function excelSerialToTimeHM(val: any): string {
  if (!val && val !== 0) return "";
  if (val instanceof Date) {
    const h = `${val.getHours()}`.padStart(2, "0");
    const m = `${val.getMinutes()}`.padStart(2, "0");
    return `${h}:${m}`;
  }
  if (typeof val === "number") {
    const frac = val - Math.floor(val);
    const totalMinutes = Math.round(frac * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
  }
  const s = String(val).trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) return s;
  return s;
}

// ラベルと値から、画面に出す文字列へ正規化
function normalizeCell(label: string, raw: any): string {
  if (raw === null || raw === undefined || raw === "") return "";

  if (label === "点検日") {
    return excelSerialToDateISO(raw);
  }

  // タイマー系は「時刻」に寄せる
  if (label.includes("タイマー")) {
    return excelSerialToTimeHM(raw);
  }

  return String(raw).trim();
}

export async function POST(req: NextRequest) {
  try {
    if (!FORM_BASE_ROOT) {
      return NextResponse.json(
        { ok: false, reason: "FORM_BASE_ROOT is not configured on server" },
        { status: 500 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const varUser: string = body.varUser ?? body.user ?? "";
    const varBldg: string = body.varBldg ?? body.bldg ?? "";
    const varSeq: string = (body.varSeq ?? body.Sseq ?? body.seq ?? "001")
      .toString()
      .padStart(3, "0");

    if (!varUser || !varBldg || !varSeq) {
      return NextResponse.json(
        {
          ok: false,
          reason: `missing parameters: varUser=${varUser}, varBldg=${varBldg}, varSeq=${varSeq}`,
        },
        { status: 400 }
      );
    }

    const folderName = `${varUser}_${varSeq}_${varBldg}`;
    const excelFileName = `建物設備点検報告書_${varBldg}_雛形.xlsx`;
    const excelPath = path.join(
      FORM_BASE_ROOT,
      varUser,
      folderName,
      "originals",
      excelFileName
    );

    // ファイル存在チェック
    try {
      await fs.access(excelPath);
    } catch {
      return NextResponse.json(
        { ok: false, reason: `Excel not found: ${excelPath}` },
        { status: 404 }
      );
    }

    // Buffer で読み込んでから xlsx に渡す（パスの日本語問題を回避）
    const buf = await fs.readFile(excelPath);
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });
    const sheet = wb.Sheets["回答"];
    if (!sheet) {
      return NextResponse.json(
        { ok: false, reason: "シート '回答' が見つかりません" },
        { status: 500 }
      );
    }

    // 2次元配列で取得（header:1 で 1行目=ヘッダ）
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
    });

    if (rows.length < 2) {
      // 回答なし
      return NextResponse.json({ ok: true, item: null }, { status: 200 });
    }

    const headerRow = rows[0] ?? [];

    // 下から走査して、最後にデータが入っている行を探す
    let lastRowIdx = rows.length - 1;
    const isEmptyRow = (r: any[] | undefined) =>
      !r ||
      r.every(
        (v) =>
          v === null ||
          v === undefined ||
          (typeof v === "string" && v.trim() === "")
      );

    while (lastRowIdx >= 1 && isEmptyRow(rows[lastRowIdx])) {
      lastRowIdx--;
    }
    if (lastRowIdx < 1) {
      return NextResponse.json({ ok: true, item: null }, { status: 200 });
    }

    const dataRow = rows[lastRowIdx] ?? [];

    // ラベル -> 列インデックス のマップ
    const headerIndexMap = new Map<string, number>();
    headerRow.forEach((h: any, idx: number) => {
      if (typeof h === "string" && h.trim()) {
        headerIndexMap.set(h.trim(), idx);
      }
    });

    const getCellByLabel = (label: string): any => {
      const idx = headerIndexMap.get(label);
      if (idx === undefined) return undefined;
      return dataRow[idx];
    };

    const values: Record<string, string> = {};
    for (const [label, idx] of headerIndexMap.entries()) {
      const raw = dataRow[idx];
      const v = normalizeCell(label, raw);
      if (!v) continue; // 空白は「異常なし」扱いで非表示
      values[label] = v;
    }

    // 基本情報系
    const dateRaw = getCellByLabel("点検日");
    const dateISO = excelSerialToDateISO(dateRaw);
    const sheetYmd = dateISO ? dateISO.replace(/-/g, "") : "";

    const company = normalizeCell("会社名", getCellByLabel("会社名"));
    const inspector = normalizeCell("点検者名", getCellByLabel("点検者名"));

    // building プロパティはフォームの bldg をそのまま入れる
    // （Excel 側の建物名は values["建物名"] として持つ）
    const item: ResponseItem = {
      id: `excel-${lastRowIdx}`,
      building: varBldg,
      company,
      inspector,
      groupId: "",
      dateISO,
      sheet: sheetYmd,
      values,
      createdAt: Date.now(),
    };

    return NextResponse.json({ ok: true, item }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/forms/previous] error", err);
    return NextResponse.json(
      { ok: false, reason: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, name: "forms-previous" });
}
