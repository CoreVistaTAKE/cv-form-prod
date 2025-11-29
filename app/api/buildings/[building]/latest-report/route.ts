import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const FORM_BASE_ROOT = process.env.FORM_BASE_ROOT;

if (!FORM_BASE_ROOT) {
  throw new Error('FORM_BASE_ROOT is not set in environment variables');
}

const isSafeName = (name: string) =>
  !name.includes('..') && !name.includes('/') && !name.includes('\\');

export async function GET(
  _req: Request,
  { params }: { params: { building: string } },
) {
  try {
    const building = decodeURIComponent(params.building);

    if (!isSafeName(building)) {
      return new NextResponse('invalid building name', { status: 400 });
    }

    const reportDir = path.join(FORM_BASE_ROOT, building, 'report');

    const files = await fs.readdir(reportDir, { withFileTypes: true });

    // Excel っぽい拡張子だけを対象
    const excelFiles = files
      .filter((f) => f.isFile())
      .map((f) => f.name)
      .filter(
        (name) =>
          name.toLowerCase().endsWith('.xlsx') ||
          name.toLowerCase().endsWith('.xlsm') ||
          name.toLowerCase().endsWith('.xls'),
      );

    if (excelFiles.length === 0) {
      return new NextResponse('no report excel found', { status: 404 });
    }

    // 更新日時で一番新しいものを選ぶ
    const stats = await Promise.all(
      excelFiles.map(async (fileName) => {
        const fullPath = path.join(reportDir, fileName);
        const stat = await fs.stat(fullPath);
        return { fileName, mtime: stat.mtime.getTime() };
      }),
    );

    stats.sort((a, b) => b.mtime - a.mtime);
    const latest = stats[0];

    const latestPath = path.join(reportDir, latest.fileName);
    const fileBuffer = await fs.readFile(latestPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // ブラウザでそのまま開く or ダウンロード
        'Content-Disposition': `inline; filename="${encodeURIComponent(
          latest.fileName,
        )}"`,
      },
    });
  } catch (error) {
    console.error('Error serving latest report excel:', error);
    return new NextResponse('failed to load latest report excel', {
      status: 500,
    });
  }
}
