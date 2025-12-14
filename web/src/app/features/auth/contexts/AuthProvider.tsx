import { useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import {
  signIn,
  signOut,
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
  resendSignUpCode,
  getCurrentUser,
  fetchAuthSession,
  AuthUser,
} from "aws-amplify/auth";
import { configureAuth } from "./authConfig";
import { config } from "@/config";
import { AuthContext, AuthContextType } from "./AuthContext";
import { buildLogger } from "@/app/lib/logger";

const logger = buildLogger("AuthProvider");

type AuthProviderProps = {
  readonly children: React.ReactNode;
};

// モックモード用のダミーユーザー
const MOCK_USER: AuthUser = {
  username: "mock-user",
  userId: "mock-user-id",
} as AuthUser;

export function AuthProvider({ children }: AuthProviderProps): ReactNode {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Amplify設定の初期化（モックモード時はスキップ）
  useEffect(() => {
    if (!config.mockedApi) {
      configureAuth();
    }
  }, []);

  // 現在のユーザーを取得
  const checkUser = useCallback(async () => {
    try {
      if (config.mockedApi) {
        // モックモードでは常にダミーユーザーを返す
        setUser(MOCK_USER);
      } else {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初回マウント時にユーザーをチェック
  useEffect(() => {
    checkUser();
  }, [checkUser]);

  /**
   * ログイン
   */
  const login = useCallback(
    async (username: string, password: string): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        if (config.mockedApi) {
          // モックモードでは常に成功
          setUser(MOCK_USER);
        } else {
          const signInResult = await signIn({
            username,
            password,
          });

          // メール確認が必要な場合はエラーを投げる
          if (signInResult.nextStep.signInStep === "CONFIRM_SIGN_UP") {
            const error = new Error("メールアドレスの確認が完了していません");
            error.name = "UserNotConfirmedException";
            throw error;
          }

          // ログイン後、ユーザー情報を取得
          await checkUser();
        }
      } catch (error) {
        // ログイン失敗はユーザー操作起因のためWARN
        logger.warn("ログイン失敗", error instanceof Error ? error : { error });

        const err =
          error instanceof Error ? error : new Error("ログインに失敗しました");
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [checkUser],
  );

  /**
   * サインアップ
   */
  const signUp = useCallback(
    async (username: string, password: string): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        if (config.mockedApi) {
          // モックモードでは常に成功（何もしない）
          return;
        }

        await amplifySignUp({
          username,
          password,
          options: {
            userAttributes: {
              email: username,
            },
          },
        });
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error("サインアップに失敗しました");
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /**
   * メール確認コードの送信
   */
  const confirmSignUp = useCallback(
    async (username: string, confirmationCode: string): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        if (config.mockedApi) {
          // モックモードでは常に成功（何もしない）
          return;
        }

        await amplifyConfirmSignUp({
          username,
          confirmationCode,
        });
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error("確認コードの検証に失敗しました");
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /**
   * 確認コードの再送信
   */
  const resendConfirmationCode = useCallback(
    async (username: string): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        if (config.mockedApi) {
          // モックモードでは常に成功（何もしない）
          return;
        }

        await resendSignUpCode({ username });
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error("確認コードの再送信に失敗しました");
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /**
   * パスワードリセット（確認コードの送信）
   */
  const resetPassword = useCallback(async (username: string): Promise<void> => {
    try {
      setError(null);
      setIsLoading(true);

      if (config.mockedApi) {
        // モックモードでは常に成功（何もしない）
        return;
      }

      const { resetPassword: amplifyResetPassword } =
        await import("aws-amplify/auth");
      await amplifyResetPassword({ username });
    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error("パスワードリセットの開始に失敗しました");
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * パスワードリセットの確認
   */
  const confirmResetPassword = useCallback(
    async (
      username: string,
      confirmationCode: string,
      newPassword: string,
    ): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        if (config.mockedApi) {
          // モックモードでは常に成功（何もしない）
          return;
        }

        const { confirmResetPassword: amplifyConfirmResetPassword } =
          await import("aws-amplify/auth");
        await amplifyConfirmResetPassword({
          username,
          confirmationCode,
          newPassword,
        });
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error("パスワードリセットの確認に失敗しました");
        setError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  /**
   * ログアウト
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setIsLoading(true);

      // セッションストレージをクリア
      sessionStorage.clear();

      if (config.mockedApi) {
        // モックモードではユーザーをクリアするだけ
        setUser(null);
      } else {
        await signOut();
        setUser(null);
      }
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("ログアウトに失敗しました");
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * アクセストークンを取得
   */
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (user === null) {
      return null;
    }

    if (config.mockedApi) {
      // モックモードではダミートークンを返す
      return "mock-access-token";
    }

    try {
      const session = await fetchAuthSession();
      const accessToken = session.tokens?.accessToken;

      if (accessToken === undefined) {
        return null;
      }

      return accessToken.toString();
    } catch (err) {
      logger.error("アクセストークン取得失敗", err instanceof Error ? err : { err });
      return null;
    }
  }, [user]);

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      error,
      login,
      signUp,
      confirmSignUp,
      resendConfirmationCode,
      resetPassword,
      confirmResetPassword,
      logout,
      getAccessToken,
      clearError,
    }),
    [
      user,
      isLoading,
      error,
      login,
      signUp,
      confirmSignUp,
      resendConfirmationCode,
      resetPassword,
      confirmResetPassword,
      logout,
      getAccessToken,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
