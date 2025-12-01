import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import type { Container } from "inversify";
import type { Logger } from "@/domain/support/logger";
import type { AuthClient } from "@/domain/support/auth-client";
import { serviceId } from "@/di-container/service-id";
import { NotFoundError } from "@/util/error-util";
import { buildTodoRouter } from "./todo/todo-router";
import { buildProjectRouter } from "./project/project-router";
import { buildUserRouter } from "./user/user-router";
import { USER_SUB, type AppEnv } from "./constants";

export const buildApp = ({
  container,
}: {
  container: Container;
}): Hono<AppEnv> => {
  const app = new Hono<AppEnv>();
  const logger = container.get<Logger>(serviceId.LOGGER);
  const authClient = container.get<AuthClient>(serviceId.AUTH_CLIENT);
  const allowedOrigins = container.get<string>(serviceId.ALLOWED_ORIGINS);

  // CORS設定
  const origin =
    allowedOrigins === "*"
      ? "*"
      : allowedOrigins.split(",").map((o) => o.trim());

  app.use(
    cors({
      origin,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // ロギングミドルウェア
  app.use(async (c, next) => {
    logger.appendKeys({
      path: c.req.path,
      method: c.req.method,
    });
    logger.info("リクエスト情報", {
      method: c.req.method,
      path: c.req.path,
      query: c.req.query(),
    });
    try {
      await next();
    } finally {
      logger.info("レスポンスステータス", { statusCode: c.res.status });
    }
  });

  // ヘルスチェックは認証不要
  app.get("/health", (c) => c.json({ status: "healthy" }));

  // 認証ミドルウェア
  const authMiddleware: MiddlewareHandler = async (c, next) => {
    const authHeader = c.req.header("Authorization");

    if (authHeader === undefined) {
      logger.warn("認証ヘッダーが存在しません");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (token === "") {
      logger.warn("トークンが存在しません");
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      // トークンを検証してデコード
      const payload = await authClient.decodeToken(token);

      // userSubをコンテキストに設定
      c.set(USER_SUB, payload.userSub);

      logger.appendKeys({ userSub: payload.userSub });

      await next();
      return;
    } catch (error) {
      logger.warn("トークン検証失敗", {
        error: error instanceof Error ? error.message : String(error),
      });
      return c.json({ error: "Invalid token" }, 401);
    }
  };

  // 全ルートで認証ミドルウェアを使用
  app.use("*", authMiddleware);

  // ルーター登録
  app.route("/todos", buildTodoRouter({ container }));
  app.route("/projects", buildProjectRouter({ container }));
  app.route("/users", buildUserRouter({ container }));

  // 404ハンドラー
  app.notFound((c) => {
    const notFoundError = new NotFoundError();
    return c.json(
      {
        name: notFoundError.name,
        message: notFoundError.message,
      },
      404,
    );
  });

  // エラーハンドラー
  app.onError((err, c) => {
    logger.error("Handler処理中のエラー", { error: err.message });
    return c.json(
      {
        name: "UnexpectedError",
        message: err.message,
      },
      500,
    );
  });

  return app;
};
