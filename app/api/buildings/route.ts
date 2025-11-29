import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const FORM_BASE_ROOT = process.env.FORM_BASE_ROOT;

if (!FORM_BASE_ROOT) {
  throw new Error('FORM_BASE_ROOT is not set in environment variables');
}

export async function GET() {
  try {
    const entries = await fs.readdir(FORM_BASE_ROOT, { withFileTypes: true });

    const buildings = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name !== 'BaseSystem'); // ← BaseSystem を除外

    return NextResponse.json({ buildings });
  } catch (error) {
    console.error('Error listing buildings:', error);
    return NextResponse.json(
      { error: '建物フォルダ一覧の取得に失敗しました' },
      { status: 500 },
    );
  }
}
