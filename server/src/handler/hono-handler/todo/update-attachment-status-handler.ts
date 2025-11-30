import type { Context } from "hono";
import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { UpdateAttachmentStatusUseCase } from "@/use-case/todo/update-attachment-status-use-case";
import type { GetTodoUseCase } from "@/use-case/todo/get-todo-use-case";
import { AttachmentStatus } from "@/domain/model/todo/attachment.entity";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { formatZodError } from "../../hono-handler-util/validation-formatter";
import { convertToAttachmentResponse } from "./todo-handler-util";

export const buildUpdateAttachmentStatusHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<UpdateAttachmentStatusUseCase>(
      serviceId.UPDATE_ATTACHMENT_STATUS_USE_CASE,
    );
    const getTodoUseCase = container.get<GetTodoUseCase>(
      serviceId.GET_TODO_USE_CASE,
    );

    try {
      const { todoId, attachmentId } = c.req.param();
      const rawBody = await c.req.json();

      // リクエストボディのZodバリデーション
      const parseResult = schemas.UpdateAttachmentParams.safeParse(rawBody);
      if (!parseResult.success) {
        logger.debug("リクエストバリデーションエラー", {
          errors: parseResult.error.errors,
          rawBody,
        });
        return c.json(
          {
            name: "ValidationError",
            message: formatZodError(parseResult.error),
          },
          400,
        );
      }

      const body = parseResult.data;

      const result = await useCase.execute({
        todoId,
        attachmentId,
        status:
          body.status === "UPLOADED"
            ? AttachmentStatus.uploaded()
            : AttachmentStatus.prepared(),
      });

      if (!result.isOk()) {
        return handleError(result.error, c, logger);
      }

      // 更新後のTODOを取得して添付ファイル情報を返す
      const todoResult = await getTodoUseCase.execute({ todoId });
      if (!todoResult.isOk()) {
        return handleError(todoResult.error, c, logger);
      }

      const attachment = todoResult.data.attachments.find(
        (a) => a.id === attachmentId,
      );
      if (attachment === undefined) {
        return c.json(
          {
            name: "NotFoundError",
            message: "添付ファイルが見つかりません",
          },
          404,
        );
      }

      // レスポンスのZodバリデーション
      const responseData = convertToAttachmentResponse(todoId, attachment);
      const responseParseResult =
        schemas.AttachmentResponse.safeParse(responseData);
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
