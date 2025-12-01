import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// 一度だけ読み込んでキャッシュ（build 時にも評価される）
const ENV_FORM_BASE_ROOT = process.env.FORM_BASE_ROOT;

// building 名に危険な文字が含まれていないか簡易チェック
const isSafeName = (name: string) =>
  !name.includes("..") && !name.includes("/") && !name.includes("\\");

/**
 * 実際に使う直前に FORM_BASE_ROOT をチェックするヘルパ
 * - 環境変数が未設定なら、ここで例外を投げる
 * - import 時点では throw しないので、少しだけ安全側
 */
function getFormBaseRoot(): string {
  const root = ENV_FORM_BASE_ROOT || process.env.FORM_BASE_ROOT;
  if (!root) {
    throw new Error("FORM_BASE_ROOT is not set in environment variables");
  }
  return root;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { building: string } },
) {
  try {
    const building = decodeURIComponent(params.building);

    if (!isSafeName(building)) {
      return NextResponse.json(
        { error: "invalid building name" },
        { status: 400 },
      );
    }

    const { searchParams } = new URL(req.url);
    const seq = searchParams.get("seq"); // 指定がなければ最新を使う

    // ★ ここで初めて FORM_BASE_ROOT を評価
    const formDir = path.join(getFormBaseRoot(), building, "form");

    // seq が指定されている場合は、そのファイルを直接読む
    if (seq) {
      const fileName = `form_base_${building}_${seq}.json`;
      const filePath = path.join(formDir, fileName);

      try {
        const raw = await fs.readFile(filePath, "utf-8");
        const json = JSON.parse(raw);
        return NextResponse.json({ building, seq, form: json });
      } catch (error) {
        console.error("Error reading specific form_base json:", error);
        return NextResponse.json(
          { error: `指定のフォームが見つかりません: ${fileName}` },
          { status: 404 },
        );
      }
    }

    // seq 未指定 → form_base_<建物>_<Seq>.json の中で「最新 Seq」を推定して読む
    const files = await fs.readdir(formDir);
    const targetFiles = files.filter(
      (f) =>
        f.startsWith(`form_base_${building}_`) && f.endsWith(".json"),
    );

    if (targetFiles.length === 0) {
      return NextResponse.json(
        { error: "対象のフォームJSONが存在しません" },
        { status: 404 },
      );
    }

    // ファイル名から Seq を抜き出して数値ソート
    const withSeq = targetFiles
      .map((fileName) => {
        const match = fileName.match(
          new RegExp(`^form_base_${building}_(\\d+)\\.json$`),
        );
        const seqNum = match ? Number(match[1]) : NaN;
        return { fileName, seqNum };
      })
      .filter((x) => !Number.isNaN(x.seqNum))
      .sort((a, b) => b.seqNum - a.seqNum); // 降順（最新が先頭）

    const latest = withSeq[0];
    const latestPath = path.join(formDir, latest.fileName);
    const raw = await fs.readFile(latestPath, "utf-8");
    const json = JSON.parse(raw);

    return NextResponse.json({
      building,
      seq: String(latest.seqNum),
      form: json,
    });
  } catch (error) {
    console.error("Error loading form_base json:", error);
    return NextResponse.json(
      { error: "フォームJSONの読み込みに失敗しました" },
      { status: 500 },
    );
  }
}
