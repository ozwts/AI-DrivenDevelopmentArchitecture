/**
 * リクエスト正規化ユーティリティ
 *
 * フォームデータをAPIリクエスト用に正規化する。
 * - PATCH: dirtyFieldsで変更フィールドのみ抽出、空文字列→null変換
 * - POST: 空文字列フィールドを除外
 */

/**
 * 変更されたフィールドのみを抽出する
 */
function pickDirtyFields<T extends Record<string, unknown>>(
  data: T,
  dirtyFields: Partial<Record<keyof T, boolean>>,
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(dirtyFields) as (keyof T)[]) {
    if (dirtyFields[key]) {
      result[key] = data[key];
    }
  }
  return result;
}

/**
 * 空文字列をnullに変換する（PATCH用）
 */
function emptyStringsToNull<T extends Record<string, unknown>>(
  data: T,
): { [K in keyof T]: T[K] | null } {
  const result = { ...data } as Record<string, unknown>;
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "string" && value.trim() === "") {
      result[key] = null;
    }
  }
  return result as { [K in keyof T]: T[K] | null };
}

/**
 * PATCHリクエスト用の正規化
 *
 * 1. dirtyFieldsで変更フィールドのみ抽出
 * 2. 空文字列をnullに変換（クリア操作）
 *
 * @example
 * ```typescript
 * const normalized = normalizePatchRequest(data, dirtyFields);
 * // { title: "新タイトル", description: null }
 * ```
 */
export function normalizePatchRequest<T extends Record<string, unknown>>(
  data: T,
  dirtyFields: Partial<Record<keyof T, boolean>>,
): Partial<{ [K in keyof T]: T[K] | null }> {
  const dirty = pickDirtyFields(data, dirtyFields);
  return emptyStringsToNull(dirty);
}

/**
 * POSTリクエスト用の正規化
 *
 * 空文字列フィールドを除外する（RegisterParamsにはnullable: trueがないため）
 *
 * @example
 * ```typescript
 * const normalized = normalizePostRequest(data);
 * // { title: "タイトル" } // descriptionが空文字列なら除外
 * ```
 */
export function normalizePostRequest<T extends Record<string, unknown>>(
  data: T,
): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string" && value.trim() === "") {
      continue;
    }
    result[key as keyof T] = value as T[keyof T];
  }
  return result;
}
