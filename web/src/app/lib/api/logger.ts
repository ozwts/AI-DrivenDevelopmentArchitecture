/**
 * API通信用ロガー
 * buildLoggerをラップし、API固有のログ形式を提供
 */
import { buildLogger } from "@/app/lib/logger";

const logger = buildLogger("ApiClient");

type RequestLogParams = {
  url: string;
  method: string;
  body?: BodyInit | null;
};

type ResponseLogParams = {
  url: string;
  method: string;
  status: number;
};

type ErrorLogParams = {
  url: string;
  method: string;
  status: number;
  statusText: string;
  errorText: string;
};

type ValidationErrorLogParams = {
  endpoint: string;
  errors: unknown[];
  data: unknown;
};

type FetchErrorLogParams = {
  url: string;
  method: string;
  error: unknown;
};

export const apiLogger = {
  request(params: RequestLogParams): void {
    logger.debug("リクエスト開始", {
      method: params.method,
      url: params.url,
      hasBody: params.body !== undefined && params.body !== null,
    });
  },

  response(params: ResponseLogParams): void {
    logger.info("リクエスト成功", {
      method: params.method,
      url: params.url,
      status: params.status,
    });
  },

  error(params: ErrorLogParams): void {
    const data = {
      method: params.method,
      url: params.url,
      status: params.status,
      statusText: params.statusText,
      errorText: params.errorText,
    };

    // 5xx: サーバーエラー → ERROR（監視対象）
    // 4xx: クライアントエラー → WARN（ユーザー操作起因）
    if (params.status >= 500) {
      logger.error("リクエスト失敗（サーバーエラー）", data);
    } else {
      logger.warn("リクエスト失敗（クライアントエラー）", data);
    }
  },

  validationError(params: ValidationErrorLogParams): void {
    logger.error("レスポンスバリデーション失敗", {
      endpoint: params.endpoint,
      errors: params.errors,
    });
  },

  fetchError(params: FetchErrorLogParams): void {
    const errorData =
      params.error instanceof Error
        ? params.error
        : { message: String(params.error) };
    logger.error("通信エラー", {
      method: params.method,
      url: params.url,
      error: errorData,
    });
  },
};
