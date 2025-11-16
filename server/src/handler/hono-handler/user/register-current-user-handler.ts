import type { Context } from "hono";
import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { AuthClient } from "@/domain/support/auth-client";
import type { RegisterCurrentUserUseCase } from "@/use-case/user/register-current-user-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { convertToUserResponse } from "./user-handler-util";
import { USER_SUB } from "../constants";

export const buildRegisterCurrentUserHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const authClient = container.get<AuthClient>(serviceId.AUTH_CLIENT);
    const useCase = container.get<RegisterCurrentUserUseCase>(
      serviceId.REGISTER_CURRENT_USER_USE_CASE,
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

      // Cognitoからユーザー情報を取得（email, email_verified）
      logger.info("Cognitoからユーザー情報を取得", { userSub });
      let email: string;
      let emailVerified: boolean;

      try {
        const cognitoUser = await authClient.getUserById(userSub);
        logger.info("Cognitoユーザー情報取得成功", {
          email: cognitoUser.email,
          emailVerified: cognitoUser.emailVerified,
        });

        if (
          cognitoUser.email === undefined ||
          cognitoUser.email === null ||
          cognitoUser.email === ""
        ) {
          logger.error("Cognitoユーザーにemailが設定されていません", {
            userSub,
          });
          return c.json(
            {
              name: new UnexpectedError().name,
              message: unexpectedErrorMessage,
            },
            500,
          );
        }

        email = cognitoUser.email;
        emailVerified = cognitoUser.emailVerified ?? false;
      } catch (error) {
        logger.error("Cognitoからのユーザー情報取得に失敗", {
          userSub,
          error: error instanceof Error ? error.message : String(error),
        });
        return c.json(
          {
            name: new UnexpectedError().name,
            message: unexpectedErrorMessage,
          },
          500,
        );
      }

      // 現在のユーザーを登録
      const result = await useCase.execute({
        sub: userSub,
        email,
        emailVerified,
      });

      if (result.success === false) {
        return handleError(result.error, c, logger);
      }

      // レスポンスのZodバリデーション
      const responseData = convertToUserResponse(result.data);
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

      return c.json(responseParseResult.data, 201);
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
