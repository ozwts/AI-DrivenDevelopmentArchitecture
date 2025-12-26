import { Config } from "./config-type";
import { generatedEnv } from "./generated/env.generated";

/**
 * 開発環境用の設定
 *
 * SSM Parameter Storeから取得した値を使用
 * 事前に `npm run config:fetch` を実行してenv.generated.tsを生成すること
 */
export const config: Config = {
  apiUrl: generatedEnv.API_URL,
  mockedApi: false,
  auth: {
    userPoolId: generatedEnv.COGNITO_USER_POOL_ID,
    userPoolClientId: generatedEnv.COGNITO_CLIENT_ID,
    region: generatedEnv.COGNITO_REGION,
  },
};
