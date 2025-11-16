import type { Context } from "hono";
import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { PrepareAttachmentUploadUseCase } from "@/use-case/todo/prepare-attachment-upload-use-case";
import type { UserRepository } from "@/domain/model/user/user-repository";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { formatZodError } from "../../hono-handler-util/validation-formatter";
import { USER_SUB } from "../constants";

export const buildPrepareAttachmentUploadHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<PrepareAttachmentUploadUseCase>(
      serviceId.PREPARE_ATTACHMENT_UPLOAD_USE_CASE,
    );
    const userRepository = container.get<UserRepository>(
      serviceId.USER_REPOSITORY,
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

      // userSubからユーザーIDを取得
      const userResult = await userRepository.findBySub({ sub: userSub });
      if (!userResult.success) {
        logger.error("ユーザー情報の取得に失敗しました", userResult.error);
        return handleError(userResult.error, c, logger);
      }

      if (userResult.data === undefined) {
        logger.error("ユーザーが見つかりません", { userSub });
        return c.json(
          {
            name: "NotFoundError",
            message: "ユーザーが見つかりません",
          },
          404,
        );
      }

      const uploadedBy = userResult.data.id;

      const { todoId } = c.req.param();
      const rawBody = await c.req.json();

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
        fileName: body.filename,
        contentType: body.contentType,
        fileSize: body.size,
        uploadedBy,
      });

      if (result.success === false) {
        return handleError(result.error, c, logger);
      }

      // レスポンスのZodバリデーション
      const responseData = {
        uploadUrl: result.data.uploadUrl,
        attachment: {
          id: result.data.attachmentId,
          todoId,
          filename: body.filename,
          contentType: body.contentType,
          size: body.size,
          status: "PREPARED" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
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
