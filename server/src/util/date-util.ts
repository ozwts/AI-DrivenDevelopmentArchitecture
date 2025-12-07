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

