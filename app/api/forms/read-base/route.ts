import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

type Body = {
  varUser?: string;
};

function pickSchema(raw: any) {
  if (raw && typeof raw === 'object' && 'schema' in raw) {
    return (raw as any).schema;
  }
  return raw;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const defaultUser =
      process.env.NEXT_PUBLIC_DEFAULT_USER || 'form_PJ1';
    const varUser =
      (body.varUser && body.varUser.trim()) || defaultUser;

    const root = process.env.FORM_BASE_ROOT;
    if (!root) {
      return NextResponse.json(
        { ok: false, reason: 'FORM_BASE_ROOT が .env.local に設定されていません。' },
        { status: 500 },
      );
    }

    // 例）...\01_InternalTest\form_PJ1\BaseSystem\form\form_base.json
    const basePath = path.join(
      root,
      varUser,
      'BaseSystem',
      'form',
      'form_base.json',
    );

    const text = await fs.readFile(basePath, 'utf8');
    const rawJson = JSON.parse(text);
    const schema = pickSchema(rawJson);

    return NextResponse.json({
      ok: true,
      schema,
      file: basePath,
    });
  } catch (e: any) {
    console.error('[api/forms/read-base] error', e);
    const msg =
      e?.code === 'ENOENT'
        ? `BaseSystem の form_base.json が見つかりませんでした: ${e?.path || ''}`
        : e?.message || String(e);
    return NextResponse.json(
      { ok: false, reason: msg },
      { status: 500 },
    );
  }
}
