/**
 * 環境変数を取得し、存在しない場合はエラーを投げる
 *
 * @param key 環境変数名
 * @returns 環境変数の値
 */
export const unwrapEnv = (key: string): string => {
  const value = process.env[key];
  if (value === undefined) {
    throw new Error(`環境変数 ${key} が設定されていません`);
  }
  return value;
};
