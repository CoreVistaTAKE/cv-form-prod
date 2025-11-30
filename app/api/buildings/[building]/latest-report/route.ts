import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const FORM_BASE_ROOT = process.env.FORM_BASE_ROOT;

// building 名に危険な文字が含まれていないか簡易チェック
const isSafeName = (name: string) =>
  !name.includes('..') && !name.includes('/') && !name.includes('\\');

export async function GET(
  req: NextRequest,
  { params }: { params: { building: string } },
) {
  try {
    const building = decodeURIComponent(params.building);

    if (!isSafeName(building)) {
      return NextResponse.json(
        { ok: false, error: 'invalid building name' },
        { status: 400 },
      );
    }

    // ★ ここで環境チェック（Heroku などで未設定でもビルドは通る）
    if (!FORM_BASE_ROOT) {
      console.error('FORM_BASE_ROOT is not set; latest-report API is unavailable');
      return NextResponse.json(
        {
          ok: false,
          error: 'Server misconfiguration: FORM_BASE_ROOT is not set',
        },
        { status: 500 },
      );
    }

    const reportDir = path.join(FORM_BASE_ROOT, building, 'report'); // or 'reports'

    const entries = await fs.readdir(reportDir, { withFileTypes: true });

    const candidates = await Promise.all(
      entries
        .filter(
          (e) => e.isFile() && e.name.toLowerCase().endsWith('.xlsx'),
        )
        .map(async (e) => {
          const fullPath = path.join(reportDir, e.name);
          const stat = await fs.stat(fullPath);
          return { fileName: e.name, mtime: stat.mtime };
        }),
    );

    if (candidates.length === 0) {
      return NextResponse.json({ ok: true, item: null });
    }

    candidates.sort(
      (a, b) => b.mtime.getTime() - a.mtime.getTime(),
    );
    const latest = candidates[0];

    return NextResponse.json({
      ok: true,
      item: {
        fileName: latest.fileName,
        lastModified: latest.mtime.toISOString(),
        url: null, // SharePoint URL は Flow 側で取る想定ならここは null/undefined でもOK
      },
    });
  } catch (error) {
    console.error('Error loading latest report:', error);
    return NextResponse.json(
      { ok: false, error: '最新の報告書取得に失敗しました' },
      { status: 500 },
    );
  }
}
