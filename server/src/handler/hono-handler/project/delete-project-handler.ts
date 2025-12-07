import type { Context } from "hono";
import type { Container } from "inversify";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/application/port/logger";
import type { DeleteProjectUseCase } from "@/application/use-case/project/delete-project-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";

export const buildDeleteProjectHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<DeleteProjectUseCase>(
      serviceId.DELETE_PROJECT_USE_CASE,
    );

    try {
      const projectId = c.req.param("projectId");

      const result = await useCase.execute({ projectId });

      if (!result.isOk()) {
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
