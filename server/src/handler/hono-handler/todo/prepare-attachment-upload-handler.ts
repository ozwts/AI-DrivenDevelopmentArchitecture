import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/application/port/logger";
import type { PrepareAttachmentUploadUseCase } from "@/application/use-case/todo/prepare-attachment-upload-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { formatZodError } from "../../hono-handler-util/validation-formatter";
import { convertToPrepareAttachmentResponse } from "./todo-response-mapper";
import { USER_SUB, type AppContext } from "../constants";

export const buildPrepareAttachmentUploadHandler =
  ({ container }: { container: Container }) =>
  async (c: AppContext) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<PrepareAttachmentUploadUseCase>(
      serviceId.PREPARE_ATTACHMENT_UPLOAD_USE_CASE,
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

      const { todoId } = c.req.param();
      const rawBody: unknown = await c.req.json();

      // リクエストボディのZodバリデーション
      const parseResult = schemas.PrepareAttachmentParams.safeParse(rawBody);
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
        userSub,
        fileName: body.filename,
        contentType: body.contentType,
        fileSize: body.filesize,
      });

      if (!result.isOk()) {
        return handleError(result.error, c, logger);
      }

      // レスポンスのZodバリデーション
      const responseData = convertToPrepareAttachmentResponse(
        todoId,
        result.data.uploadUrl,
        result.data.attachment,
      );
      const responseParseResult =
        schemas.PrepareAttachmentResponse.safeParse(responseData);
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
