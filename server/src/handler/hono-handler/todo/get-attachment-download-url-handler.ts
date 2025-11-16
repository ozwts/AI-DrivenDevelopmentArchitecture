import type { Context } from "hono";
import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { GetAttachmentDownloadUrlUseCase } from "@/use-case/todo/get-attachment-download-url-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";

export const buildGetAttachmentDownloadUrlHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<GetAttachmentDownloadUrlUseCase>(
      serviceId.GET_ATTACHMENT_DOWNLOAD_URL_USE_CASE,
    );

    try {
      const { todoId, attachmentId } = c.req.param();

      const result = await useCase.execute({ todoId, attachmentId });

      if (result.success === false) {
        return handleError(result.error, c, logger);
      }

      // レスポンスのZodバリデーション
      const responseData = {
        downloadUrl: result.data.downloadUrl,
      };
      const responseParseResult =
        schemas.DownloadUrlResponse.safeParse(responseData);
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
