import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { UpdateCurrentUserUseCase } from "@/use-case/user/update-current-user-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { convertToUserResponse } from "./user-response-mapper";
import { USER_SUB, type AppContext } from "../constants";

export const buildUpdateCurrentUserHandler =
  ({ container }: { container: Container }) =>
  async (c: AppContext) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<UpdateCurrentUserUseCase>(
      serviceId.UPDATE_CURRENT_USER_USE_CASE,
    );

    try {
      // 認証ミドルウェアで設定されたuserSubを取得
      const userSub = c.get(USER_SUB);

      if (userSub === "") {
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
      const rawBody: unknown = await c.req.json();
      const parseResult = schemas.UpdateUserParams.safeParse(rawBody);

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

      // 現在のユーザーを更新（AuthClientはUseCase内で呼び出し）
      const result = await useCase.execute({
        sub: userSub,
        name: parseResult.data.name,
      });

      if (result.isErr()) {
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
