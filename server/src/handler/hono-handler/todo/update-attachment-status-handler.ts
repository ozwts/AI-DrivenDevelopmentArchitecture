import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { UpdateAttachmentStatusUseCase } from "@/use-case/todo/update-attachment-status-use-case";
import { AttachmentStatus } from "@/domain/model/todo/attachment.entity";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { formatZodError } from "../../hono-handler-util/validation-formatter";
import { convertToAttachmentResponse } from "./todo-response-mapper";
import type { AppContext } from "../constants";

export const buildUpdateAttachmentStatusHandler =
  ({ container }: { container: Container }) =>
  async (c: AppContext) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<UpdateAttachmentStatusUseCase>(
      serviceId.UPDATE_ATTACHMENT_STATUS_USE_CASE,
    );

    try {
      const { todoId, attachmentId } = c.req.param();
      const rawBody: unknown = await c.req.json();

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

      // レスポンスのZodバリデーション
      const responseData = convertToAttachmentResponse(todoId, result.data);
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
