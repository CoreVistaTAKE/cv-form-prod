// app/api/forms/reportStore.ts
export type ReportStatus = "running" | "success" | "error";

export type ReportResult = {
  reportUrl?: string;
  sheetKey?: string;
  traceId?: string;

  // 追加（既存コードを壊さないよう optional）
  status?: ReportStatus;
  error?: string;

  updatedAt: number;
};

/**
 * 簡易インメモリストア
 * キー: "user::bldg::seq"
 */
const reportStore = new Map<string, ReportResult>();

const ONE_HOUR_MS = 60 * 60 * 1000;

export function makeKey(user: string, bldg: string, seq: string): string {
  return `${user}::${bldg}::${seq}`;
}

function hasOwn(obj: object, key: PropertyKey) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function cleanupOldEntries() {
  const now = Date.now();
  for (const [k, v] of reportStore.entries()) {
    if (now - v.updatedAt > ONE_HOUR_MS) reportStore.delete(k);
  }
}

/**
 * ProcessFormSubmission の結果を保存（部分更新OK）
 * - 明示的に undefined を渡した場合は「消す」
 * - status 未指定なら reportUrl / error から推定
 */
export function saveReportResult(params: {
  user: string;
  bldg: string;
  seq: string;
  reportUrl?: string;
  sheetKey?: string;
  traceId?: string;
  status?: ReportStatus;
  error?: string;
}) {
  const { user, bldg, seq } = params;
  const key = makeKey(user, bldg, seq);

  const prev = reportStore.get(key);

  const next: ReportResult = {
    reportUrl: prev?.reportUrl,
    sheetKey: prev?.sheetKey,
    traceId: prev?.traceId,
    status: prev?.status,
    error: prev?.error,
    updatedAt: Date.now(),
  };

  if (hasOwn(params, "reportUrl")) next.reportUrl = params.reportUrl;
  if (hasOwn(params, "sheetKey")) next.sheetKey = params.sheetKey;
  if (hasOwn(params, "traceId")) next.traceId = params.traceId;
  if (hasOwn(params, "status")) next.status = params.status;
  if (hasOwn(params, "error")) next.error = params.error;

  // status 自動推定（未指定の場合）
  if (!hasOwn(params, "status")) {
    if (next.error) next.status = "error";
    else if (next.reportUrl) next.status = "success";
    else next.status = "running";
  }

  // running/error の時に古いURLが残るのは事故なので、URL未指定なら落とす
  if ((next.status === "running" || next.status === "error") && !hasOwn(params, "reportUrl")) {
    next.reportUrl = undefined;
  }

  // success/running で error が残るのも混乱するので、error 未指定ならクリア
  if ((next.status === "success" || next.status === "running") && !hasOwn(params, "error")) {
    next.error = undefined;
  }

  reportStore.set(key, next);
  cleanupOldEntries();
}

/**
 * /api/forms/report-link から参照するための getter
 */
export function getReportResult(user: string, bldg: string, seq: string): ReportResult | undefined {
  const key = makeKey(user, bldg, seq);
  return reportStore.get(key);
}
