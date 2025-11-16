import type { Context } from "hono";
import type { Container } from "inversify";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { DeleteCurrentUserUseCase } from "@/use-case/user/delete-current-user-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { USER_SUB } from "../constants";
// Note: DELETE操作はレスポンスボディがないため、バリデーション不要

/**
 * 現在のユーザーを削除するハンドラ
 *
 * 認証トークンから現在のユーザーを特定して削除する。
 * ユーザーは自分自身のアカウントのみ削除可能。
 */
export const buildDeleteCurrentUserHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const deleteCurrentUserUseCase = container.get<DeleteCurrentUserUseCase>(
      serviceId.DELETE_CURRENT_USER_USE_CASE,
    );

    try {
      // 認証ミドルウェアで設定されたコンテキストからuserSubを取得
      const userSub = c.get(USER_SUB) as string | undefined;

      if (userSub === undefined) {
        logger.warn("コンテキストにuserSubが存在しません");
        return c.json(
          {
            name: "ValidationError",
            message: "認証情報が不正です",
          },
          401,
        );
      }

      // 現在のユーザーを削除（subでユーザー検索はユースケース内で実行）
      const deleteResult = await deleteCurrentUserUseCase.execute({
        sub: userSub,
      });

      if (deleteResult.success === false) {
        return handleError(deleteResult.error, c, logger);
      }

      return c.body(null, 204);
    } catch (error) {
      logger.error("ハンドラーで予期せぬエラーをキャッチ", error as Error);
      return c.json(
        {
          name: new UnexpectedError().name,
          message: unexpectedErrorMessage,
        },
        500,
      );
    }
  };
