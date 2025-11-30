import type { Context } from "hono";
import type { Container } from "inversify";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { DeleteTodoUseCase } from "@/use-case/todo/delete-todo-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
// Note: DELETE操作はレスポンスボディがないため、バリデーション不要

export const buildDeleteTodoHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<DeleteTodoUseCase>(
      serviceId.DELETE_TODO_USE_CASE,
    );

    try {
      const { todoId } = c.req.param();

      const result = await useCase.execute({ todoId });

      if (!result.isOk()) {
        return handleError(result.error, c, logger);
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
