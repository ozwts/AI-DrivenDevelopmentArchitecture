import { Amplify } from "aws-amplify";
import { config } from "@/config";

/**
 * AWS Amplify認証設定
 */
export const configureAuth = (): void => {
  if (config.auth === undefined) {
    throw new Error(
      "Auth configuration is required when mockedApi is false. Please provide auth settings in config.ts",
    );
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: config.auth.userPoolId,
        userPoolClientId: config.auth.userPoolClientId,
        loginWith: {
          email: true,
        },
      },
    },
  });
};
