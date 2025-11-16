import type { Context } from "hono";
import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { CreateProjectUseCase } from "@/use-case/project/create-project-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { formatZodError } from "../../hono-handler-util/validation-formatter";
import { convertToProjectResponse } from "./project-handler-util";

export const buildCreateProjectHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<CreateProjectUseCase>(
      serviceId.CREATE_PROJECT_USE_CASE,
    );

    try {
      const rawBody = await c.req.json();

      // リクエストボディのZodバリデーション
      const parseResult = schemas.CreateProjectParams.safeParse(rawBody);
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
        name: body.name,
        description: body.description,
        color: body.color,
      });

      if (result.success === false) {
        return handleError(result.error, c, logger);
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
