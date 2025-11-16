import type { Context } from "hono";
import type { Container } from "inversify";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { DeleteAttachmentUseCase } from "@/use-case/todo/delete-attachment-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";

export const buildDeleteAttachmentHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<DeleteAttachmentUseCase>(
      serviceId.DELETE_ATTACHMENT_USE_CASE,
    );

    try {
      const { todoId, attachmentId } = c.req.param();

      const result = await useCase.execute({ todoId, attachmentId });

      if (result.success === false) {
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
