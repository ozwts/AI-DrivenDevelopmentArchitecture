import type { Container } from "inversify";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/application/port/logger";
import type { RemoveMemberUseCase } from "@/application/use-case/project/remove-member-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { USER_SUB, type AppContext } from "../constants";

export const buildRemoveMemberHandler =
  ({ container }: { container: Container }) =>
  async (c: AppContext) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<RemoveMemberUseCase>(
      serviceId.REMOVE_MEMBER_USE_CASE,
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

      const projectId = c.req.param("projectId");
      const userId = c.req.param("userId");

      const result = await useCase.execute({
        projectId,
        targetUserId: userId,
        operatorSub: userSub,
      });

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
