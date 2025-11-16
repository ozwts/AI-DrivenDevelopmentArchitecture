import type { Context } from "hono";
import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { ListTodosUseCase } from "@/use-case/todo/list-todos-use-case";
import type { TodoStatus } from "@/domain/model/todo/todo";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { convertToTodoResponse } from "./todo-handler-util";

export const buildListTodosHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<ListTodosUseCase>(
      serviceId.LIST_TODOS_USE_CASE,
    );

    try {
      // クエリパラメータからstatusとprojectIdを取得
      const statusParam = c.req.query("status");
      const projectIdParam = c.req.query("projectId");

      // Zodバリデーション（statusがある場合のみ）
      if (statusParam !== undefined && statusParam !== "") {
        const parseResult = schemas.TodoStatus.safeParse(statusParam);
        if (!parseResult.success) {
          const errorMessage = `status: ${parseResult.error.errors[0]?.message ?? "Invalid status"}`;
          logger.debug("クエリパラメータバリデーションエラー", {
            errors: parseResult.error.errors,
            statusParam,
          });
          return c.json(
            {
              name: "ValidationError",
              message: errorMessage,
            },
            400,
          );
        }
      }

      const result = await useCase.execute({
        status:
          statusParam !== undefined && statusParam !== ""
            ? (statusParam as TodoStatus)
            : undefined,
        projectId:
          projectIdParam !== undefined && projectIdParam !== ""
            ? projectIdParam
            : undefined,
      });

      if (result.success === false) {
        return handleError(result.error, c, logger);
      }

      // レスポンスのZodバリデーション
      const responseData = result.data.map((todo) =>
        convertToTodoResponse(todo),
      );
      const responseParseResult = schemas.TodosResponse.safeParse(responseData);
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
