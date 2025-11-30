import { NextResponse } from 'next/server';
import fs from 'fs/promises';

const FORM_BASE_ROOT = process.env.FORM_BASE_ROOT;

export async function GET() {
  try {
    if (!FORM_BASE_ROOT) {
      console.error('FORM_BASE_ROOT is not set');
      return NextResponse.json(
        { ok: false, error: 'Server misconfiguration: FORM_BASE_ROOT is not set' },
        { status: 500 },
      );
    }

    const entries = await fs.readdir(FORM_BASE_ROOT, { withFileTypes: true });

    const buildings = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    return NextResponse.json({ ok: true, buildings });
  } catch (error) {
    console.error('Error listing buildings:', error);
    return NextResponse.json(
      { ok: false, error: 'ビル一覧の取得に失敗しました' },
      { status: 500 },
    );
  }
}
