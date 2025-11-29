// lib/formFs.ts
import { promises as fs } from 'fs';
import path from 'path';

export type BuildingInfo = {
  name: string;
  latestSeq: number | null;
  status: string; // '' のときは表示しない（作成中など）
};

function getBaseRoot(): string {
  const root = process.env.FORM_BASE_ROOT;
  if (!root) {
    throw new Error('環境変数 FORM_BASE_ROOT が設定されていません。');
  }
  return root;
}

function getUserRoot(user: string): string {
  const trimmed = (user || '').trim();
  if (!trimmed) {
    throw new Error('ユーザフォルダ名が空です。varUser を確認してください。');
  }
  const root = getBaseRoot();
  return path.join(root, trimmed);
}

async function existsDir(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
}

async function existsFile(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 指定ユーザーの建物フォルダ一覧
 * - <FORM_BASE_ROOT>\<varUser>\BaseSystem を除く直下フォルダ
 * - 各フォルダの最新 Seq と status を見る
 */
export async function listBuildingsForUser(user: string): Promise<BuildingInfo[]> {
  const userRoot = getUserRoot(user);
  if (!(await existsDir(userRoot))) {
    // フォルダがまだ無い場合は空配列を返す
    return [];
  }

  const dirents = await fs.readdir(userRoot, { withFileTypes: true });
  const buildings: BuildingInfo[] = [];

  for (const d of dirents) {
    if (!d.isDirectory()) continue;
    if (d.name === 'BaseSystem') continue;

    const buildingName = d.name;
    const { latestSeq, status } = await getBuildingLatestSeqAndStatus(
      user,
      buildingName,
    );

    buildings.push({
      name: buildingName,
      latestSeq,
      status,
    });
  }

  buildings.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  return buildings;
}

/**
 * 建物ごとの最新 Seq と status を取得
 * - form/form_base_<建物名>_<Seq>.json をスキャン
 * - status or meta.status が '作成中' 以外ならステータスとして採用
 */
async function getBuildingLatestSeqAndStatus(
  user: string,
  buildingName: string,
): Promise<{ latestSeq: number | null; status: string }> {
  const userRoot = getUserRoot(user);
  const formDir = path.join(userRoot, buildingName, 'form');

  if (!(await existsDir(formDir))) {
    return { latestSeq: null, status: '' };
  }

  const files = await fs.readdir(formDir);
  const pattern = new RegExp(
    `^form_base_${escapeRegExp(buildingName)}_(\\d+)\\.json$`,
  );

  const seqs: number[] = [];
  for (const file of files) {
    const m = file.match(pattern);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n)) seqs.push(n);
  }

  if (seqs.length === 0) {
    return { latestSeq: null, status: '' };
  }

  const latestSeq = Math.max(...seqs);
  const filePath = path.join(
    formDir,
    `form_base_${buildingName}_${latestSeq}.json`,
  );

  try {
    const text = await fs.readFile(filePath, 'utf8');
    const obj = JSON.parse(text);

    let rawStatus = '';
    if (typeof obj?.status === 'string') rawStatus = obj.status;
    else if (typeof obj?.meta?.status === 'string') rawStatus = obj.meta.status;

    const trimmed = rawStatus.trim();
    const status =
      trimmed && trimmed !== '作成中'
        ? trimmed
        : ''; // 作成中は UI 上は空扱い

    return { latestSeq, status };
  } catch (e) {
    console.error('[formFs] getBuildingLatestSeqAndStatus error', e);
    return { latestSeq, status: '' };
  }
}

/**
 * BaseSystem 用フォーム (form_base.json) を読み込む
 * - <FORM_BASE_ROOT>\<varUser>\BaseSystem\form\form_base.json
 */
export async function getBaseSystemSchema(user: string): Promise<any> {
  const userRoot = getUserRoot(user);
  const filePath = path.join(userRoot, 'BaseSystem', 'form', 'form_base.json');

  if (!(await existsFile(filePath))) {
    throw new Error(`BaseSystem のフォーム定義が見つかりません: ${filePath}`);
  }

  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text);
}

/**
 * 建物用フォーム (form_base_<建物名>_<Seq>.json) を読み込む
 * - Seq 未指定なら最新 Seq を自動選択
 */
export async function getBuildingSchema(
  user: string,
  buildingName: string,
  seqInput?: number | null,
): Promise<{ schema: any; seq: number }> {
  const userRoot = getUserRoot(user);
  const formDir = path.join(userRoot, buildingName, 'form');

  if (!(await existsDir(formDir))) {
    throw new Error(`建物フォルダが存在しません: ${formDir}`);
  }

  const files = await fs.readdir(formDir);
  const pattern = new RegExp(
    `^form_base_${escapeRegExp(buildingName)}_(\\d+)\\.json$`,
  );

  const seqs: number[] = [];
  for (const file of files) {
    const m = file.match(pattern);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n)) seqs.push(n);
  }

  if (seqs.length === 0) {
    throw new Error(
      `建物 ${buildingName} のフォーム定義ファイルが見つかりません（form_base_${buildingName}_*.json がありません）。`,
    );
  }

  let seq: number;
  if (seqInput != null && Number.isFinite(seqInput)) {
    seq = seqInput as number;
    if (!seqs.includes(seq)) {
      throw new Error(
        `建物 ${buildingName} の Seq=${seq} のフォーム定義ファイルが見つかりません。`,
      );
    }
  } else {
    seq = Math.max(...seqs);
  }

  const filePath = path.join(formDir, `form_base_${buildingName}_${seq}.json`);
  if (!(await existsFile(filePath))) {
    throw new Error(`フォーム定義ファイルが見つかりません: ${filePath}`);
  }

  const text = await fs.readFile(filePath, 'utf8');
  const schema = JSON.parse(text);

  return { schema, seq };
}
