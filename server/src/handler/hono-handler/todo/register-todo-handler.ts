import type { Context } from "hono";
import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/domain/support/logger";
import type { RegisterTodoUseCase } from "@/use-case/todo/register-todo-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { formatZodError } from "../../hono-handler-util/validation-formatter";
import { convertToTodoResponse } from "./todo-handler-util";
import { USER_SUB } from "../constants";

export const buildRegisterTodoHandler =
  ({ container }: { container: Container }) =>
  async (c: Context) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<RegisterTodoUseCase>(
      serviceId.REGISTER_TODO_USE_CASE,
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

      const rawBody = await c.req.json();

      // リクエストボディのZodバリデーション
      const parseResult = schemas.RegisterTodoParams.safeParse(rawBody);
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

      // 入力の正規化: 空文字列は意味を持たないのでundefinedに変換
      const projectId =
        body.projectId?.trim() === "" ? undefined : body.projectId;
      const assigneeUserId =
        body.assigneeUserId?.trim() === "" ? undefined : body.assigneeUserId;

      const result = await useCase.execute({
        userSub,
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        dueDate: body.dueDate,
        projectId,
        assigneeUserId,
      });

      if (result.success === false) {
        return handleError(result.error, c, logger);
      }

      // レスポンスのZodバリデーション
      const responseData = convertToTodoResponse(result.data);
      const responseParseResult = schemas.TodoResponse.safeParse(responseData);
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
