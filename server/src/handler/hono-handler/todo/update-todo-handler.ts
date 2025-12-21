import type { Container } from "inversify";
import { schemas } from "@/generated/zod-schemas";
import { serviceId } from "@/di-container/service-id";
import type { Logger } from "@/application/port/logger";
import type { UpdateTodoUseCase } from "@/application/use-case/todo/update-todo-use-case";
import { UnexpectedError, unexpectedErrorMessage } from "@/util/error-util";
import { handleError } from "../../hono-handler-util/error-handler";
import { formatZodError } from "../../hono-handler-util/validation-formatter";
import {
  convertToTodoResponse,
  convertToTodoStatus,
} from "./todo-response-mapper";
import type { AppContext } from "../constants";

export const buildUpdateTodoHandler =
  ({ container }: { container: Container }) =>
  async (c: AppContext) => {
    const logger = container.get<Logger>(serviceId.LOGGER);
    const useCase = container.get<UpdateTodoUseCase>(
      serviceId.UPDATE_TODO_USE_CASE,
    );

    try {
      const { todoId } = c.req.param();
      const rawBody: unknown = await c.req.json();

      // リクエストボディのZodバリデーション
      const parseResult = schemas.UpdateTodoParams.safeParse(rawBody);
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

      // 3値を区別するため、条件付きでプロパティを追加
      // - キー未指定: プロパティを渡さない → UseCase側で "field" in input === false
      // - null送信: undefined を渡す → UseCase側で値をクリア
      // - 値送信: その値を渡す → UseCase側で値を更新
      const result = await useCase.execute({
        todoId,
        title: body.title,
        ...("description" in body && {
          description:
            body.description === null ? undefined : body.description,
        }),
        status: convertToTodoStatus(body.status),
        priority: body.priority,
        ...("dueDate" in body && {
          dueDate: body.dueDate === null ? undefined : body.dueDate,
        }),
        ...("projectId" in body && {
          projectId: body.projectId === null ? undefined : body.projectId,
        }),
        ...("assigneeUserId" in body && {
          assigneeUserId:
            body.assigneeUserId === null ? undefined : body.assigneeUserId,
        }),
      });

      if (!result.isOk()) {
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
