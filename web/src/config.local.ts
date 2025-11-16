import { Config } from "./config-type";

export const config: Config = {
  apiUrl: "http://localhost:3000", // ローカル開発時のURL
  mockedApi: true,
  mockType: "HAS_ALL",
  auth: {
    userPoolId: "ap-northeast-1_XXXXXXXXX", // TODO: Cognito User Pool IDに置き換えてください
    userPoolClientId: "XXXXXXXXXXXXXXXXXXXXXXXXXX", // TODO: Cognito Client IDに置き換えてください
    region: "ap-northeast-1",
  },
};
