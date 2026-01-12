import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/application/port/logger";
import type { InviteMemberUseCase } from "@/application/use-case/project-member";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { formatZodError } from "../../hono-handler-util/validation-formatter";
import { convertToProjectMemberResponse } from "./project-member-response-mapper";
import { USER_SUB, type AppContext } from "../constants";

export const buildInviteMemberHandler =
  ({ container }: { container: Container }) =>
  async (c: AppContext) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const inviteMemberUseCase = container.get<InviteMemberUseCase>(
      serviceId.INVITE_MEMBER_USE_CASE,
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
      const parseResult = schemas.InviteMemberParams.safeParse(rawBody);
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

      const result = await inviteMemberUseCase.execute({
        projectId,
        currentUserId: userSub,
        userId: body.userId,
        role: body.role,
      });

      if (!result.isOk()) {
        return handleError(result.error, c, logger);
      }

      // InviteMemberWithUserをProjectMemberResponseに変換
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
