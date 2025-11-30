import type { Context } from "hono";
import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { GetProjectUseCase } from "@/use-case/project/get-project-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { convertToProjectResponse } from "./project-handler-util";

export const buildGetProjectHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<GetProjectUseCase>(
      serviceId.GET_PROJECT_USE_CASE,
    );

    try {
      const projectId = c.req.param("projectId");

      const result = await useCase.execute({ projectId });

      if (!result.isOk()) {
        return handleError(result.error, c, logger);
      }

      // プロジェクトが存在しない場合
      if (result.data === undefined) {
        return c.json(
          {
            name: "NotFoundError",
            message: "プロジェクトが見つかりませんでした",
          },
          404,
        );
      }

      // レスポンスのZodバリデーション
      const responseData = convertToProjectResponse(result.data);
      const responseParseResult =
        schemas.ProjectResponse.safeParse(responseData);
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

      return c.json(responseParseResult.data, 200);
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
