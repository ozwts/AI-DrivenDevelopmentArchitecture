import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { type AuthUser } from "aws-amplify/auth";
import { config } from "@/config";
import { buildLogger, setUserSub } from "@/app/lib/logger";
import { authService, configureAuth } from "../services/auth-service";

const logger = buildLogger("AuthProvider");

// --- Context ---

export type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  confirmSignUp: (username: string, confirmationCode: string) => Promise<void>;
  resendConfirmationCode: (username: string) => Promise<void>;
  resetPassword: (username: string) => Promise<void>;
  confirmResetPassword: (
    username: string,
    confirmationCode: string,
    newPassword: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  clearError: () => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

// --- Hook ---

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// --- Provider ---

type AuthProviderProps = {
  readonly children: ReactNode;
};

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
        setUser(MOCK_USER);
      } else {
        const currentUser = await authService.getCurrentUser();
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

  // ユーザー状態が変化したらloggerにuserSubを設定
  useEffect(() => {
    setUserSub(user?.userId);
  }, [user?.userId]);

  const login = useCallback(
    async (username: string, password: string): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        if (config.mockedApi) {
          setUser(MOCK_USER);
        } else {
          const result = await authService.signIn(username, password);

          if (result.needsConfirmation) {
            const err = new Error("メールアドレスの確認が完了していません");
            err.name = "UserNotConfirmedException";
            throw err;
          }

          await checkUser();
        }
      } catch (err) {
        logger.warn("ログイン失敗", err instanceof Error ? err : { err });
        const error =
          err instanceof Error ? err : new Error("ログインに失敗しました");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [checkUser],
  );

  const signUp = useCallback(
    async (username: string, password: string): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        if (!config.mockedApi) {
          await authService.signUp(username, password);
        }
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("サインアップに失敗しました");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const confirmSignUp = useCallback(
    async (username: string, confirmationCode: string): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        if (!config.mockedApi) {
          await authService.confirmSignUp(username, confirmationCode);
        }
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("確認コードの検証に失敗しました");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const resendConfirmationCode = useCallback(
    async (username: string): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        if (!config.mockedApi) {
          await authService.resendSignUpCode(username);
        }
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("確認コードの再送信に失敗しました");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const resetPassword = useCallback(async (username: string): Promise<void> => {
    try {
      setError(null);
      setIsLoading(true);

      if (!config.mockedApi) {
        await authService.resetPassword(username);
      }
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error("パスワードリセットの開始に失敗しました");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const confirmResetPassword = useCallback(
    async (
      username: string,
      confirmationCode: string,
      newPassword: string,
    ): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        if (!config.mockedApi) {
          await authService.confirmResetPassword(
            username,
            confirmationCode,
            newPassword,
          );
        }
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error("パスワードリセットの確認に失敗しました");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setIsLoading(true);
      sessionStorage.clear();

      if (config.mockedApi) {
        setUser(null);
      } else {
        await authService.signOut();
        setUser(null);
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("ログアウトに失敗しました");
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (config.mockedApi) {
      return "mock-access-token";
    }

    try {
      return await authService.getAccessToken();
    } catch (err) {
      logger.error(
        "アクセストークン取得失敗",
        err instanceof Error ? err : { err },
      );
      return null;
    }
  }, []);

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
