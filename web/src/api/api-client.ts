/**
 * APIクライアント
 * HTTP通信の基盤と各エンドポイントを統合
 */
import { type ZodType } from "zod";
import { config } from "../config";
import { apiLogger } from "./logger";
import { type GetAccessTokenFn, createAuthHeader } from "./auth-handler";
import { handleHttpError, handleValidationError } from "./error-handler";
import { createHealthEndpoints } from "./endpoints/health";
import { createTodoEndpoints } from "./endpoints/todos";
import { createProjectEndpoints } from "./endpoints/projects";
import { createUserEndpoints } from "./endpoints/users";
import { createAttachmentEndpoints } from "./endpoints/attachments";

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
    apiLogger.request({ url, method, body: options.body });

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

    return response;
  } catch (error) {
    apiLogger.fetchError({ url, method, error });
    throw error;
  }
};

/**
 * レスポンスボディがあるリクエスト
 */
const request: RequestFn = async <T>(
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
const requestVoid: RequestVoidFn = async (
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<void> => {
  await executeFetch(endpoint, options);
};

export const apiClient = {
  /**
   * APIクライアントを初期化
   * アプリケーション起動時に一度だけ呼び出す
   */
  initialize(clientConfig: { getAccessToken: GetAccessTokenFn }): void {
    if (isInitialized) {
      return;
    }
    getAccessToken = clientConfig.getAccessToken;
    isInitialized = true;
  },

  // Health Check
  ...createHealthEndpoints(request),

  // Todo API
  ...createTodoEndpoints(request, requestVoid),

  // Project API
  ...createProjectEndpoints(request, requestVoid),

  // User API
  ...createUserEndpoints(request, requestVoid),

  // Attachment API
  ...createAttachmentEndpoints(request, requestVoid),
};
