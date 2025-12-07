/**
 * APIエラーハンドリング
 */

import { handleUnauthorized } from "./auth-handler";
import { apiLogger } from "./logger";

type ErrorContext = {
  url: string;
  method: string;
  status: number;
  statusText: string;
  errorText: string;
};

/**
 * HTTPエラーレスポンスを処理
 * 401の場合はリダイレクト、それ以外はエラーをスロー
 */
export const handleHttpError = (context: ErrorContext): never => {
  apiLogger.error(context);

  if (context.status === 401) {
    handleUnauthorized();
    throw new Error("認証が必要です。ログインページに移動します。");
  }

  throw new Error(
    `API Error: ${context.status} ${context.statusText} - ${context.errorText}`,
  );
};

/**
 * バリデーションエラーを処理
 */
export const handleValidationError = (
  endpoint: string,
  errors: unknown[],
  data: unknown,
  message: string,
): never => {
  apiLogger.validationError({ endpoint, errors, data });
  throw new Error(
    `APIレスポンスのバリデーションに失敗しました (${endpoint}): ${message}`,
  );
};
