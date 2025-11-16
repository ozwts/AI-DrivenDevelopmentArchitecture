import type { FetchNow } from "@/domain/support/fetch-now";

/**
 * テスト用の固定日時を返すFetchNow実装を生成する
 *
 * @param fixedDate 固定する日時（デフォルト: 2024-01-01T00:00:00+09:00）
 * @returns 固定日時を返すFetchNow実装
 */
export const buildFetchNowDummy =
  (fixedDate: Date = new Date("2024-01-01T00:00:00+09:00")): FetchNow =>
  () =>
    fixedDate;
