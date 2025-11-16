import type { Context } from "hono";
import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { GetCurrentUserUseCase } from "@/use-case/user/get-current-user-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { convertToUserResponse } from "./user-handler-util";
import { USER_SUB } from "../constants";

export const buildGetCurrentUserHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<GetCurrentUserUseCase>(
      serviceId.GET_CURRENT_USER_USE_CASE,
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

      const result = await useCase.execute({ sub: userSub });

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
