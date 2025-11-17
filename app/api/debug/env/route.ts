import { NextResponse } from 'next/server';

export async function GET() {
  const keys = [
    'FLOW_CREATE_FORM_FOLDER_URL',
    'FLOW_PROCESS_FORM_SUBMISSION_URL',
    'FLOW_SAVE_FILES_URL',
    'FLOW_GET_NEXT_SEQ_URL',
    'FLOW_FORWARD_HANDSHAKE_MS',
  ];
  const env = Object.fromEntries(keys.map(k => [k, process.env[k] ? 'SET' : 'MISSING']));
  return NextResponse.json({ ok: true, env });
}
