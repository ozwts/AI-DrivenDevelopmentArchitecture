import type { Container } from "inversify";
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/application/port/logger";
import type { SearchUsersUseCase } from "@/application/use-case/user/search-users-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { convertToUserResponse } from "./user-response-mapper";
import { USER_SUB, type AppContext } from "../constants";

// クエリパラメータのZodスキーマ（API契約: minLength: 1, maxLength: 100, required: true）
const searchQuerySchema = z.string().min(1).max(100);

export const buildSearchUsersHandler =
  ({ container }: { container: Container }) =>
  async (c: AppContext) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<SearchUsersUseCase>(
      serviceId.SEARCH_USERS_USE_CASE,
    );

    try {
      const userSub = c.get(USER_SUB);

      // クエリパラメータの取得
      const queryParam = c.req.query("query");

      // クエリパラメータのバリデーション（必須）
      if (queryParam === undefined || queryParam === "") {
        logger.debug("クエリパラメータが指定されていません");
        return c.json(
          {
            name: "ValidationError",
            message: "query: Required",
          },
          400,
        );
      }

      // Zodバリデーション（長さチェック）
      const parseResult = searchQuerySchema.safeParse(queryParam);
      if (!parseResult.success) {
        const errorMessage = `query: ${parseResult.error.errors[0]?.message ?? "Invalid query"}`;
        logger.debug("クエリパラメータバリデーションエラー", {
          errors: parseResult.error.errors,
          queryParam,
        });
        return c.json(
          {
            name: "ValidationError",
            message: errorMessage,
          },
          400,
        );
      }

      const result = await useCase.execute({
        keyword: parseResult.data,
        currentUserId: userSub,
      });

      if (result.isErr()) {
        return handleError(result.error, c, logger);
      }

      // レスポンスのZodバリデーション
      const responseData = result.data.map(convertToUserResponse);
      const responseParseResult =
        schemas.SearchUsersResponse.safeParse(responseData);
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
