import { buildLogger } from "@/app/lib/logger";

const logger = buildLogger("AuthHandler");

/**
 * 認証関連の処理
 */

/**
 * 認証切れ時の処理
 * セッションをクリアしてログインページへリダイレクト
 */
export const handleUnauthorized = (): void => {
  logger.warn("認証切れ、ログインページへリダイレクト");
  sessionStorage.clear();
  localStorage.clear();
  window.location.href = "/login";
};

/**
 * アクセストークン取得関数の型
 */
export type GetAccessTokenFn = () => Promise<string | null>;

/**
 * 認証ヘッダーを生成
 */
export const createAuthHeader = async (
  getAccessToken: GetAccessTokenFn | undefined,
): Promise<Record<string, string>> => {
  if (getAccessToken === undefined) {
    return {};
  }
  const token = await getAccessToken();
  if (token === null) {
    return {};
  }
  return { Authorization: `Bearer ${token}` };
};
