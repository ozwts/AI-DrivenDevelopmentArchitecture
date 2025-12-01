import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Tokyo");
dayjs.extend(customParseFormat);

/**
 * DateをISO8601文字列 (JST) に変換する
 *
 * @param {Date} date Date
 * @param {string} format 日時文字列形式（省略時はデフォルトのISO8601形式）
 * @returns {string} ISO8601文字列 (JST)
 */
export const dateToIsoString = (date: Date, format?: string): string =>
  format !== undefined && format !== ""
    ? dayjs(date).tz().format(format)
    : dayjs(date).tz().format("YYYY-MM-DDTHH:mm:ss.SSSZ");

/**
 * ISO8601文字列 (JST) をDateに変換する
 *
 * @param {string} isoStr ISO8601文字列 (JST)
 * @returns {Date} Date
 */
export const dateFromIsoString = (isoStr: string): Date =>
  dayjs(isoStr).tz().toDate();

/**
 * Dateを指定した日時形式で文字列に変換する
 *
 * @param {Date} date Date
 * @param {string} format 日時文字列形式
 * @returns {string} 日時文字列
 */
export const dateToString = (date: Date, format: string): string =>
  dayjs(date).tz().format(format);

/**
 * 指定した形式の日時文字列をISO8601文字列 (JST) に変換する
 *
 * @param dateStr 日時文字列
 * @param format `dateStr` の形式
 * @returns ISO8601文字列 (JST)
 */
export const dateFromString = (dateStr: string, format: string): Date =>
  dayjs.tz(dateStr, format, "Asia/Tokyo").toDate();

/**
 * 日時文字列が有効かどうか
 *
 * @param {string} dateStr 日時文字列
 * @param {string} format 日時文字列形式
 * @returns {boolean} 形式が有効かどうか
 */
export const isValidDateString = (dateStr: string, format?: string): boolean =>
  dayjs(dateStr, format, true).isValid();

/**
 * 年月日時分秒ミリ秒からISO8601文字列 (JST) を作成する
 *
 * @param year 年
 * @param month 月（1-12）
 * @param day 日
 * @param hour 時（0-23、省略時は0）
 * @param minute 分（0-59、省略時は0）
 * @param second 秒（0-59、省略時は0）
 * @param millisecond ミリ秒（0-999、省略時は0）
 * @returns ISO8601文字列 (JST)
 * @example
 * // 2025年1月1日 00:00:00.000 JST
 * isoStringFromParts(2025, 1, 1) // "2025-01-01T00:00:00.000+09:00"
 * @example
 * // 2025年12月31日 23:59:59.999 JST
 * isoStringFromParts(2025, 12, 31, 23, 59, 59, 999) // "2025-12-31T23:59:59.999+09:00"
 * @example
 * // 2025年6月15日 12:30:45.123 JST
 * isoStringFromParts(2025, 6, 15, 12, 30, 45, 123) // "2025-06-15T12:30:45.123+09:00"
 */
export const isoStringFromParts = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): string =>
  dayjs
    .tz(
      `${String(year)}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")}.${String(millisecond).padStart(3, "0")}`,
      "Asia/Tokyo",
    )
    .format("YYYY-MM-DDTHH:mm:ss.SSSZ");
