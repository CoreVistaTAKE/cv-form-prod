import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = "Asia/Tokyo";

/** 現在（JST） */
export const nowTokyo = () => dayjs().tz(TZ);

/** YYYYMMDD（JST）に整形 */
export const toYYYYMMDD = (d?: Date | string | number) => {
  const m = d ? dayjs(d).tz(TZ) : nowTokyo();
  return m.format("YYYYMMDD");
};

/** YYYY-MM-DD（JST）に整形（<input type="date"> 初期値用） */
export const isoDateTokyo = (d?: Date | string | number) => {
  const m = d ? dayjs(d).tz(TZ) : nowTokyo();
  return m.format("YYYY-MM-DD");
};

/** "YYYY-MM-DD" を 「その日のJST 00:00」 として解釈して返す */
export const fromISODateStringJST = (iso?: string) => {
  if (!iso) return nowTokyo();
  // 例: 2025-09-21 → 2025-09-21T00:00:00+09:00 とみなす
  const fixed = `${iso}T00:00:00+09:00`;
  return dayjs(fixed).tz(TZ);
};