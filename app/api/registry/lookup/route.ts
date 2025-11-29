import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const rawUser = (body as any)?.varUser as string | undefined;

    const defaultUser =
      process.env.NEXT_PUBLIC_NEXT_PUBLIC_DEFAULT_USER ||
      process.env.NEXT_PUBLIC_DEFAULT_USER ||
      'form_PJ1';

    const varUser =
      (typeof rawUser === 'string' && rawUser.trim()) || defaultUser;

    const root = process.env.FORM_BASE_ROOT;
    if (!root) {
      return NextResponse.json(
        { ok: false, reason: 'FORM_BASE_ROOT が .env.local に設定されていません。' },
        { status: 500 },
      );
    }

    // 例：
    //   C:\...\01_InternalTest\form_PJ1
    //   C:\...\02_Cliants\FirstService
    const userRoot = path.join(root, varUser);

    const entries = await fs.readdir(userRoot, { withFileTypes: true });

    const options = entries
      .filter((ent) => ent.isDirectory())
      .map((ent) => ent.name)
      .filter((name) => name.toLowerCase() !== 'basesystem')
      .sort((a, b) => a.localeCompare(b, 'ja'));

    return NextResponse.json({ ok: true, options });
  } catch (e: any) {
    console.error('[api/registry/lookup] error', e);
    const msg =
      e?.code === 'ENOENT'
        ? `フォルダが見つかりませんでした: ${e?.path || ''}`
        : e?.message || String(e);
    return NextResponse.json(
      { ok: false, reason: msg },
      { status: 500 },
    );
  }
}
