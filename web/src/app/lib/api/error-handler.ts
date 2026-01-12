/**
 * APIエラーハンドリング
 */

import { buildLogger } from "@/app/lib/logger";
import { handleUnauthorized } from "./auth-handler";

const logger = buildLogger("ApiClient");

type ErrorContext = {
  url: string;
  method: string;
  status: number;
  statusText: string;
  errorText: string;
};

/**
 * APIエラークラス
 * HTTPステータスコードを保持し、エラーハンドリングで使用
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * アクセス権限エラーかどうか
   */
  isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * 存在しないリソースエラーかどうか
   */
  isNotFound(): boolean {
    return this.status === 404;
  }
}

/**
 * HTTPエラーレスポンスを処理
 * 401の場合はリダイレクト、それ以外はエラーをスロー
 */
export const handleHttpError = (context: ErrorContext): never => {
  const logData = {
    method: context.method,
    url: context.url,
    status: context.status,
    statusText: context.statusText,
    errorText: context.errorText,
  };

  // 5xx: サーバーエラー → ERROR（監視対象）
  // 4xx: クライアントエラー → WARN（ユーザー操作起因）
  if (context.status >= 500) {
    logger.error("リクエスト失敗（サーバーエラー）", logData);
  } else {
    logger.warn("リクエスト失敗（クライアントエラー）", logData);
  }

  if (context.status === 401) {
    handleUnauthorized();
    throw new ApiError(
      "認証が必要です。ログインページに移動します。",
      context.status,
      context.statusText,
    );
  }

  throw new ApiError(
    `API Error: ${context.status} ${context.statusText} - ${context.errorText}`,
    context.status,
    context.statusText,
  );
};

/**
 * バリデーションエラーを処理
 */
export const handleValidationError = (
  endpoint: string,
  errors: unknown[],
  _data: unknown,
  message: string,
): never => {
  logger.error("レスポンスバリデーション失敗", { endpoint, errors });
  throw new Error(
    `APIレスポンスのバリデーションに失敗しました (${endpoint}): ${message}`,
  );
};
