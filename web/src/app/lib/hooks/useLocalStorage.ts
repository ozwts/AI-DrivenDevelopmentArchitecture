import { useState, useEffect, useCallback } from "react";
import { buildLogger } from "@/app/lib/logger";

const logger = buildLogger("useLocalStorage");

/**
 * localStorage と同期する汎用フック
 * ビジネスロジックを含まない純粋な状態管理
 *
 * @param key - localStorageのキー
 * @param initialValue - 初期値
 * @returns [値, 値を更新する関数, 値を削除する関数]
 *
 * @example
 * const [theme, setTheme, removeTheme] = useLocalStorage("theme", "light");
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): readonly [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // 初期値の取得（SSR対応のため関数で初期化）
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      logger.warn("localStorage読み取りエラー", { key, error });
      return initialValue;
    }
  });

  // localStorageへの書き込み
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // 関数の場合は前の値を使って計算
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        logger.warn("localStorage書き込みエラー", { key, error });
      }
    },
    [key, storedValue]
  );

  // localStorageからの削除
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      logger.warn("localStorage削除エラー", { key, error });
    }
  }, [key, initialValue]);

  // 他のタブからの変更を同期
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue) as T);
        } catch (error) {
          logger.warn("localStorage同期エラー", { key, error });
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [key]);

  return [storedValue, setValue, removeValue] as const;
}
