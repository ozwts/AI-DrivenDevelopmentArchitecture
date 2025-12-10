import { useState, useEffect } from "react";

/**
 * 値の変更を遅延させる汎用フック
 * ビジネスロジックを含まない純粋な状態管理
 *
 * @param value - 遅延させたい値
 * @param delay - 遅延時間（ミリ秒）
 * @returns 遅延された値
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState("");
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 *
 * useEffect(() => {
 *   // 検索実行（300ms後に実行される）
 * }, [debouncedSearchTerm]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
