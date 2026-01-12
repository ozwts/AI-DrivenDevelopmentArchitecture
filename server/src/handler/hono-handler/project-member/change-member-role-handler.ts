import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/application/port/logger";
import type { ChangeMemberRoleUseCase } from "@/application/use-case/project-member";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { formatZodError } from "../../hono-handler-util/validation-formatter";
import { convertToProjectMemberResponse } from "./project-member-response-mapper";
import { USER_SUB, type AppContext } from "../constants";

export const buildChangeMemberRoleHandler =
  ({ container }: { container: Container }) =>
  async (c: AppContext) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const changeMemberRoleUseCase = container.get<ChangeMemberRoleUseCase>(
      serviceId.CHANGE_MEMBER_ROLE_USE_CASE,
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

      const rawBody: unknown = await c.req.json();

      // リクエストボディのZodバリデーション
      const parseResult = schemas.ChangeMemberRoleParams.safeParse(rawBody);
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
      const projectId = c.req.param("projectId");
      const memberId = c.req.param("memberId");

      const result = await changeMemberRoleUseCase.execute({
        projectId,
        currentUserId: userSub,
        targetMemberId: memberId,
        newRole: body.role,
      });

      if (!result.isOk()) {
        return handleError(result.error, c, logger);
      }

      // ChangeMemberRoleWithUserをProjectMemberResponseに変換
      const responseData = convertToProjectMemberResponse(
        result.data.member,
        result.data.user,
      );
      const responseParseResult =
        schemas.ProjectMemberResponse.safeParse(responseData);
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
