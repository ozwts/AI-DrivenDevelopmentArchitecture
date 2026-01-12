import type { Context } from "hono";
import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/application/port/logger";
import type { ListProjectMembersUseCase } from "@/application/use-case/project/list-project-members-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { convertToProjectMemberResponse } from "./project-member-response-mapper";

export const buildListProjectMembersHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<ListProjectMembersUseCase>(
      serviceId.LIST_PROJECT_MEMBERS_USE_CASE,
    );

    try {
      const projectId = c.req.param("projectId");

      const result = await useCase.execute({ projectId });

      if (!result.isOk()) {
        return handleError(result.error, c, logger);
      }

      // レスポンスのZodバリデーション
      const responseData = result.data.map(convertToProjectMemberResponse);
      const responseParseResult =
        schemas.ProjectMembersResponse.safeParse(responseData);
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
