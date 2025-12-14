/* eslint-disable local-rules/component/require-component-test -- 外部サービス依存（useAuth + userApi）のため、E2Eテストでカバー。 */
import { useEffect, useState, ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import { initialize } from "@/app/lib/api";
import { authUserApi } from "../api";
import { Button } from "@/app/lib/ui";
import { buildLogger } from "@/app/lib/logger";

const logger = buildLogger("AuthInitializer");

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

      logger.debug("ユーザー初期化開始");

      try {
        // ユーザー情報を取得
        const user = await authUserApi.getCurrentUser();
        logger.info("ユーザー登録済み", { userId: user.id });
        setIsInitialized(true);
      } catch (error) {
        logger.debug("ユーザー取得エラー", error instanceof Error ? error : { error });

        // 404エラー（ユーザー未登録）の場合は自動的にユーザー登録
        if (
          error instanceof Error &&
          (error.message.includes("404") ||
            error.message.includes("Not Found") ||
            error.message.includes("NotFoundError"))
        ) {
          logger.info("ユーザー未登録(404)、新規登録開始");
          try {
            const newUser = await authUserApi.registerUser();
            logger.info("ユーザー登録成功", { userId: newUser.id });
            setIsInitialized(true);
          } catch (registerError) {
            logger.error(
              "ユーザー登録失敗",
              registerError instanceof Error ? registerError : { registerError },
            );
            setError(
              registerError instanceof Error
                ? registerError.message
                : "ユーザー登録に失敗しました",
            );
          }
        } else {
          logger.error("予期しないエラー", error instanceof Error ? error : { error });
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
        <div className="rounded-lg border border-error-200 bg-error-50 p-6 text-center">
          <div className="mb-4 text-lg font-semibold text-error-900">
            エラーが発生しました
          </div>
          <div className="mb-4 text-sm text-error-700">{error}</div>
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
