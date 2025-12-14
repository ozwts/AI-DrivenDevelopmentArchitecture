/* eslint-disable local-rules/component/require-component-test -- 外部サービス依存（useAuth + userApi）のため、E2Eテストでカバー。 */
import { useEffect, useState, ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { initialize } from "@/app/lib/api";
import { authUserApi } from "../api";
import { Button } from "@/app/lib/ui";

type AuthInitializerProps = {
  readonly children: ReactNode;
};

/**
 * 認証の初期化を行うコンポーネント
 * - API clientにtoken取得関数を注入
 * - 初回ログイン時のユーザー登録処理
 */
export function AuthInitializer({ children }: AuthInitializerProps): ReactNode {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // API clientを初期化
    initialize({ getAccessToken });
  }, [getAccessToken]);

  useEffect(() => {
    const initializeUser = async () => {
      if (!isAuthenticated) {
        setIsInitialized(true);
        return;
      }

      console.log("[AuthInitializer] Starting user initialization...");

      try {
        // ユーザー情報を取得
        const user = await authUserApi.getCurrentUser();
        console.log("[AuthInitializer] User already registered:", user);
        setIsInitialized(true);
      } catch (error) {
        console.log("[AuthInitializer] Error fetching current user:", error);

        // 404エラー（ユーザー未登録）の場合は自動的にユーザー登録
        if (
          error instanceof Error &&
          (error.message.includes("404") ||
            error.message.includes("Not Found") ||
            error.message.includes("NotFoundError"))
        ) {
          console.log(
            "[AuthInitializer] User not found (404). Registering new user...",
          );
          try {
            const newUser = await authUserApi.registerUser();
            console.log(
              "[AuthInitializer] User registered successfully:",
              newUser,
            );
            setIsInitialized(true);
          } catch (registerError) {
            console.error(
              "[AuthInitializer] Failed to register user:",
              registerError,
            );
            setError(
              registerError instanceof Error
                ? registerError.message
                : "ユーザー登録に失敗しました",
            );
          }
        } else {
          console.error("[AuthInitializer] Unexpected error:", error);
          setError(
            error instanceof Error
              ? error.message
              : "ユーザー情報の取得に失敗しました",
          );
        }
      }
    };

    if (isAuthenticated && !isInitialized) {
      initializeUser();
    }
  }, [isAuthenticated, isInitialized]);

  // エラー表示
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <div className="mb-4 text-lg font-semibold text-red-900">
            エラーが発生しました
          </div>
          <div className="mb-4 text-sm text-red-700">{error}</div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              window.location.reload();
            }}
          >
            再試行
          </Button>
        </div>
      </div>
    );
  }

  // 初期化が完了するまでローディング表示
  if (isAuthenticated && !isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-base border-t-transparent"></div>
          <div className="text-sm text-text-secondary">
            ユーザー情報を読み込み中...
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
