// app/api/forms/reportStore.ts
export type ReportResult = {
  reportUrl?: string;
  sheetKey?: string;
  traceId?: string;
  updatedAt: number;
};

/**
 * 簡易インメモリストア
 * キー: "user::bldg::seq"
 */
const reportStore = new Map<string, ReportResult>();

export function makeKey(user: string, bldg: string, seq: string): string {
  return `${user}::${bldg}::${seq}`;
}

/**
 * ProcessFormSubmission の結果を保存
 */
export function saveReportResult(params: {
  user: string;
  bldg: string;
  seq: string;
  reportUrl?: string;
  sheetKey?: string;
  traceId?: string;
}) {
  const { user, bldg, seq, reportUrl, sheetKey, traceId } = params;
  const key = makeKey(user, bldg, seq);

  reportStore.set(key, {
    reportUrl,
    sheetKey,
    traceId,
    updatedAt: Date.now(),
  });

  // 古いエントリのクリーンアップ（1時間以上前のものを削除）
  const oneHour = 60 * 60 * 1000;
  const now = Date.now();
  for (const [k, v] of reportStore.entries()) {
    if (now - v.updatedAt > oneHour) {
      reportStore.delete(k);
    }
  }
}

/**
 * /api/forms/report-link から参照するための getter
 */
export function getReportResult(
  user: string,
  bldg: string,
  seq: string,
): ReportResult | undefined {
  const key = makeKey(user, bldg, seq);
  return reportStore.get(key);
}
