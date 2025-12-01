/**
 * Honoコンテキストで使用する定数と型定義
 */

import type { Context } from "hono";

/**
 * ユーザーのSub（Cognitoの一意識別子）
 */
export const USER_SUB = "userSub";

/**
 * Honoアプリケーションの環境型定義
 *
 * Variables: ミドルウェアからハンドラーへ渡すコンテキスト変数の型
 *
 * @see https://hono.dev/docs/api/context
 */
export type AppEnv = {
  Variables: {
    [USER_SUB]: string;
  };
};

/**
 * 型安全なHonoコンテキスト
 *
 * c.get(USER_SUB) が string 型を返すようになる
 */
export type AppContext = Context<AppEnv>;
