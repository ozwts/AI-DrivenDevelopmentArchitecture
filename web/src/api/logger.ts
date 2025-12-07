/**
 * APIリクエスト/レスポンスのログ出力
 * 開発環境でのみ出力される
 */

type RequestLogParams = {
  url: string;
  method: string;
  body?: BodyInit | null;
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

const isDev = import.meta.env.DEV;

export const apiLogger = {
  request(params: RequestLogParams): void {
    if (isDev) {
      console.log("APIリクエスト:", params);
    }
  },

  error(params: ErrorLogParams): void {
    console.error("APIリクエスト失敗:", params);
  },

  validationError(params: ValidationErrorLogParams): void {
    console.error("APIレスポンスのバリデーション失敗:", params);
  },

  fetchError(params: FetchErrorLogParams): void {
    console.error("通信エラー:", params);
  },

  warn(message: string): void {
    console.warn(message);
  },
};
