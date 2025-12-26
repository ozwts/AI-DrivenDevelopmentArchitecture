import { Config } from "./config-type";

/**
 * ローカル開発用の設定
 *
 * ローカルサーバー + 実際のAWSリソース（Cognito認証）を使用
 * サーバー側: npm run dev でローカルサーバーを起動
 *
 * 環境変数でポートを変更可能:
 * - VITE_API_URL: APIサーバーのURL（デフォルト: http://localhost:3000）
 */
export const config: Config = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000",
  mockedApi: false,
  auth: {
    userPoolId: "ap-northeast-1_0ZkOnmBdP",
    userPoolClientId: "7iakqk0viea59959619p180tlj",
    region: "ap-northeast-1",
  },
};
