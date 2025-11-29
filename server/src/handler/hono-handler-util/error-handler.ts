import type { Context } from "hono";
import type { Logger } from "@/domain/support/logger";
import {
  UnexpectedError,
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
  DomainError,
  unexpectedErrorMessage,
} from "@/util/error-util";

/**
 * エラーをハンドリングしてHTTPレスポンスを返す
 *
 * @param error エラーオブジェクト
 * @param c Honoコンテキスト
 * @param logger ロガー
 * @returns HTTPレスポンス
 */
export const handleError = (error: Error, c: Context, logger: Logger) => {
  if (error instanceof ValidationError) {
    logger.warn("バリデーションエラー", { error });
    return c.json(
      {
        name: error.name,
        message: error.message,
      },
      400,
    );
  }

  if (error instanceof DomainError) {
    logger.warn("ドメインエラー", { error });
    return c.json(
      {
        name: error.name,
        message: error.message,
      },
      422,
    );
  }

  if (error instanceof NotFoundError) {
    logger.warn("リソース未検出", { error });
    return c.json(
      {
        name: error.name,
        message: error.message,
      },
      404,
    );
  }

  if (error instanceof ConflictError) {
    logger.warn("競合エラー", { error });
    return c.json(
      {
        name: error.name,
        message: error.message,
      },
      409,
    );
  }

  if (error instanceof ForbiddenError) {
    logger.warn("アクセス拒否", { error });
    return c.json(
      {
        name: error.name,
        message: error.message,
      },
      403,
    );
  }

  if (error instanceof UnexpectedError) {
    logger.error("予期せぬエラー", error);
    return c.json(
      {
        name: error.name,
        message: unexpectedErrorMessage,
      },
      500,
    );
  }

  logger.error("不明なエラー", error);
  return c.json(
    {
      name: "UnknownError",
      message: unexpectedErrorMessage,
    },
    500,
  );
};
