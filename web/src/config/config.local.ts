import { Config } from "./config-type";
import { generatedEnv } from "./generated/env.generated";

/**
 * ローカル開発用の設定
 *
 * ローカルサーバー + 実際のAWSリソース（Cognito認証）を使用
 * サーバー側: npm run dev でローカルサーバーを起動
 *
 * 事前に `npm run config:fetch` を実行してenv.generated.tsを生成すること
 *
 * 環境変数でポートを変更可能:
 * - VITE_API_URL: APIサーバーのURL（デフォルト: http://localhost:3000）
 */
export const config: Config = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000",
  mockedApi: false,
  auth: {
    userPoolId: generatedEnv.COGNITO_USER_POOL_ID,
    userPoolClientId: generatedEnv.COGNITO_CLIENT_ID,
    region: generatedEnv.COGNITO_REGION,
  },
};
