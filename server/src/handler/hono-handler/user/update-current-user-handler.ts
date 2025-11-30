import type { Context } from "hono";
import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { AuthClient } from "@/domain/support/auth-client";
import type { UpdateCurrentUserUseCase } from "@/use-case/user/update-current-user-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { convertToUserResponse } from "./user-handler-util";
import { USER_SUB } from "../constants";

export const buildUpdateCurrentUserHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const authClient = container.get<AuthClient>(serviceId.AUTH_CLIENT);
    const updateCurrentUserUseCase = container.get<UpdateCurrentUserUseCase>(
      serviceId.UPDATE_CURRENT_USER_USE_CASE,
    );

    try {
      // 認証ミドルウェアで設定されたuserSubを取得
      const userSub = c.get(USER_SUB);

      if (typeof userSub !== "string" || userSub === "") {
        logger.error("userSubがコンテキストに設定されていません");
        return c.json(
          {
            name: new UnexpectedError().name,
            message: unexpectedErrorMessage,
          },
          500,
        );
      }

      // リクエストボディのバリデーション
      const body = await c.req.json();
      const parseResult = schemas.UpdateUserParams.safeParse(body);

      if (!parseResult.success) {
        logger.warn("リクエストバリデーションエラー", {
          errors: parseResult.error.errors,
        });
        return c.json(
          {
            name: "ValidationError",
            message: "Invalid request body",
          },
          400,
        );
      }

      // Cognitoからユーザー情報を取得（email, email_verified）
      // 更新時はオプショナル（取得失敗してもエラーにしない）
      let email: string | undefined;
      let emailVerified: boolean | undefined;

      try {
        const cognitoUser = await authClient.getUserById(userSub);
        email = cognitoUser.email;
        emailVerified = cognitoUser.emailVerified;
        logger.info("Cognitoユーザー情報取得成功", {
          email,
          emailVerified,
        });
      } catch (error) {
        logger.warn("Cognitoからのユーザー情報取得に失敗（続行）", {
          userSub,
          error: error instanceof Error ? error.message : String(error),
        });
        // 取得失敗してもエラーにせず続行（既存のemail情報を保持）
      }

      // 現在のユーザーを更新（subでユーザー検索はユースケース内で実行）
      // - sub: トークンから取得
      // - name: リクエストボディから（ユーザー入力）
      // - email, emailVerified: Cognitoから取得（オプショナル）
      const updateResult = await updateCurrentUserUseCase.execute({
        sub: userSub,
        name: parseResult.data.name,
        email,
        emailVerified,
      });

      if (updateResult.isErr()) {
        return handleError(updateResult.error, c, logger);
      }

      // レスポンスのZodバリデーション
      const responseData = convertToUserResponse(updateResult.data);
      const responseParseResult = schemas.UserResponse.safeParse(responseData);
      if (!responseParseResult.success) {
        logger.error("レスポンスバリデーションエラー", {
          errors: responseParseResult.error.errors,
          responseData,
        });
        return c.json(
          {
            name: new UnexpectedError().name,
            message: unexpectedErrorMessage,
          },
          500,
        );
      }

      return c.json(responseParseResult.data);
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
