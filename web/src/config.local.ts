import { Config } from "./config-type";

/**
 * ローカル開発用の設定
 *
 * ローカルサーバー（localhost:3000）+ 実際のAWSリソース（Cognito認証）を使用
 * サーバー側: npm run dev でローカルサーバーを起動
 */
export const config: Config = {
  apiUrl: "http://localhost:3000",
  mockedApi: false,
  auth: {
    userPoolId: "ap-northeast-1_0ZkOnmBdP",
    userPoolClientId: "7iakqk0viea59959619p180tlj",
    region: "ap-northeast-1",
  },
};
