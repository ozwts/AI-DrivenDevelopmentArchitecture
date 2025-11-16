import type { Context } from "hono";
import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { GetTodoUseCase } from "@/use-case/todo/get-todo-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { convertToTodoResponse } from "./todo-handler-util";

export const buildListAttachmentsHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<GetTodoUseCase>(serviceId.GET_TODO_USE_CASE);

    try {
      const { todoId } = c.req.param();

      const result = await useCase.execute({ todoId });

      if (result.success === false) {
        return handleError(result.error, c, logger);
      }

      // convertToTodoResponseでUPLOADED状態の添付ファイルのみを取得
      const { attachments } = convertToTodoResponse(result.data);

      // レスポンスのZodバリデーション
      const responseParseResult =
        schemas.AttachmentsResponse.safeParse(attachments);
      if (!responseParseResult.success) {
        logger.error("レスポンスバリデーションエラー", {
          errors: responseParseResult.error.errors,
          attachments,
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
