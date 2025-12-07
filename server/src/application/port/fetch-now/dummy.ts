import type { FetchNow } from "@/application/port/fetch-now";

/**
 * テスト用FetchNowのファクトリ関数
 *
 * @description
 * 指定した日時を常に返すFetchNow実装を生成する。
 * テストで時刻依存のロジックを検証する際に使用。
 *
 * @param fixedDate - 固定で返す日時（省略時: 2024-01-01 00:00:00 JST）
 * @returns 固定日時を返すFetchNow
 *
 * @example
 * const fetchNow = buildFetchNowDummy(new Date("2024-06-15T10:00:00+09:00"));
 * fetchNow(); // => 常に2024-06-15T10:00:00+09:00を返す
 */
export const buildFetchNowDummy =
  (fixedDate: Date = new Date("2024-01-01T00:00:00+09:00")): FetchNow =>
  () =>
    fixedDate;
