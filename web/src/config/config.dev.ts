import { Config } from "./config-type";

/**
 * 開発環境用の設定
 *
 * モックAPIサーバーを使う場合:
 * export const config: Config = {
 *   apiUrl: "http://localhost:3001",
 *   mockedApi: true,
 * };
 *
 * 本番環境（Cognito認証）を使う場合:
 * export const config: Config = {
 *   apiUrl: "https://xxx.execute-api.ap-northeast-1.amazonaws.com",
 *   mockedApi: false,
 *   auth: {
 *     userPoolId: "ap-northeast-1_xxxxx",
 *     userPoolClientId: "xxxxxxxxxx",
 *     region: "ap-northeast-1",
 *   },
 * };
 */
export const config: Config = {
  apiUrl: "https://0y986xzln7.execute-api.ap-northeast-1.amazonaws.com",
  mockedApi: false,
  auth: {
    userPoolId: "ap-northeast-1_0ZkOnmBdP",
    userPoolClientId: "7iakqk0viea59959619p180tlj",
    region: "ap-northeast-1",
  },
};
