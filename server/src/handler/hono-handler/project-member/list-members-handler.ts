import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/application/port/logger";
import type { ListMembersUseCase } from "@/application/use-case/project-member";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { convertToProjectMemberResponse } from "./project-member-response-mapper";
import { USER_SUB, type AppContext } from "../constants";

export const buildListMembersHandler =
  ({ container }: { container: Container }) =>
  async (c: AppContext) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const listMembersUseCase = container.get<ListMembersUseCase>(
      serviceId.LIST_MEMBERS_USE_CASE,
    );

    try {
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

      const result = await listMembersUseCase.execute({
        projectId,
        currentUserId: userSub,
      });

      if (!result.isOk()) {
        return handleError(result.error, c, logger);
      }

      // MemberWithUser[]をProjectMemberResponse[]に変換
      const membersResponse = result.data.map(({ member, user }) =>
        convertToProjectMemberResponse(member, user),
      );

      // レスポンスのZodバリデーション
      const responseParseResult =
        schemas.ProjectMembersResponse.safeParse(membersResponse);
      if (!responseParseResult.success) {
        logger.error("レスポンスバリデーションエラー", {
          errors: responseParseResult.error.errors,
          responseData: membersResponse,
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
