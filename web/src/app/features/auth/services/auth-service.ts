import { Amplify } from "aws-amplify";
import {
  signIn as amplifySignIn,
  signOut as amplifySignOut,
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
  resendSignUpCode as amplifyResendSignUpCode,
  resetPassword as amplifyResetPassword,
  confirmResetPassword as amplifyConfirmResetPassword,
  getCurrentUser as amplifyGetCurrentUser,
  fetchAuthSession as amplifyFetchAuthSession,
  type AuthUser,
} from "aws-amplify/auth";
import { config } from "@/config/config";

// --- Types ---

export type SignInResult = {
  needsConfirmation: boolean;
};

// --- Configuration ---

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

// --- Auth Service ---

export const authService = {
  /**
   * ログイン
   */
  signIn: async (username: string, password: string): Promise<SignInResult> => {
    const result = await amplifySignIn({ username, password });
    return {
      needsConfirmation: result.nextStep.signInStep === "CONFIRM_SIGN_UP",
    };
  },

  /**
   * ログアウト
   */
  signOut: async (): Promise<void> => {
    await amplifySignOut();
  },

  /**
   * サインアップ
   */
  signUp: async (username: string, password: string): Promise<void> => {
    await amplifySignUp({
      username,
      password,
      options: {
        userAttributes: {
          email: username,
        },
      },
    });
  },

  /**
   * サインアップ確認
   */
  confirmSignUp: async (
    username: string,
    confirmationCode: string,
  ): Promise<void> => {
    await amplifyConfirmSignUp({ username, confirmationCode });
  },

  /**
   * 確認コード再送信
   */
  resendSignUpCode: async (username: string): Promise<void> => {
    await amplifyResendSignUpCode({ username });
  },

  /**
   * パスワードリセット開始
   */
  resetPassword: async (username: string): Promise<void> => {
    await amplifyResetPassword({ username });
  },

  /**
   * パスワードリセット確認
   */
  confirmResetPassword: async (
    username: string,
    confirmationCode: string,
    newPassword: string,
  ): Promise<void> => {
    await amplifyConfirmResetPassword({
      username,
      confirmationCode,
      newPassword,
    });
  },

  /**
   * 現在のユーザー取得
   */
  getCurrentUser: async (): Promise<AuthUser> => {
    return amplifyGetCurrentUser();
  },

  /**
   * アクセストークン取得
   */
  getAccessToken: async (): Promise<string | null> => {
    const session = await amplifyFetchAuthSession();
    const accessToken = session.tokens?.accessToken;
    return accessToken?.toString() ?? null;
  },
};
