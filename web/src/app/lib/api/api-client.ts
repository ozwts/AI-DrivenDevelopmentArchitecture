/**
 * APIクライアント基盤
 * HTTP通信の基盤機能を提供（エンドポイントは各featureに配置）
 */
import { type ZodType } from "zod";
import { config } from "@/config/config";
import { buildLogger } from "@/app/lib/logger";
import { type GetAccessTokenFn, createAuthHeader } from "./auth-handler";
import { handleHttpError, handleValidationError } from "./error-handler";

const logger = buildLogger("ApiClient");

/**
 * APIリクエストオプション（headersの型を制限）
 */
export type ApiRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

/**
 * リクエスト関数の型
 */
export type RequestFn = <T>(
  endpoint: string,
  schema: ZodType<T>,
  options?: ApiRequestOptions,
) => Promise<T>;

export type RequestVoidFn = (
  endpoint: string,
  options?: ApiRequestOptions,
) => Promise<void>;

/**
 * APIクライアントの状態
 */
let getAccessToken: GetAccessTokenFn | undefined;
let isInitialized = false;

/**
 * 初期化チェック
 */
const assertInitialized = (): void => {
  if (!isInitialized) {
    throw new Error(
      "ApiClient が初期化されていません。apiClient.initialize() を先に呼び出してください。",
    );
  }
};

/**
 * fetchを実行し、レスポンスを返す共通処理
 */
const executeFetch = async (
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<Response> => {
  assertInitialized();
  const url = `${config.apiUrl}${endpoint}`;
  const method = options.method ?? "GET";

  const authHeader = await createAuthHeader(getAccessToken);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeader,
    ...options.headers,
  };

  try {
    logger.debug("リクエスト開始", {
      method,
      url,
      hasBody: options.body !== undefined && options.body !== null,
    });

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorText = await response.text();
      handleHttpError({
        url,
        method,
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
    }

    logger.info("リクエスト成功", { method, url, status: response.status });
    return response;
  } catch (error) {
    const errorData =
      error instanceof Error ? error : { message: String(error) };
    logger.error("通信エラー", { method, url, error: errorData });
    throw error;
  }
};

/**
 * レスポンスボディがあるリクエスト
 */
export const request: RequestFn = async <T>(
  endpoint: string,
  schema: ZodType<T>,
  options: ApiRequestOptions = {},
): Promise<T> => {
  const response = await executeFetch(endpoint, options);

  const json: unknown = await response.json();
  const result = schema.safeParse(json);
  if (!result.success) {
    return handleValidationError(
      endpoint,
      result.error.errors,
      json,
      result.error.message,
    );
  }
  return result.data;
};

/**
 * レスポンスボディがないリクエスト（DELETE等）
 */
export const requestVoid: RequestVoidFn = async (
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<void> => {
  await executeFetch(endpoint, options);
};

/**
 * APIクライアントを初期化
 * アプリケーション起動時に一度だけ呼び出す
 */
export const initialize = (clientConfig: {
  getAccessToken: GetAccessTokenFn;
}): void => {
  if (isInitialized) {
    return;
  }
  getAccessToken = clientConfig.getAccessToken;
  isInitialized = true;
};
