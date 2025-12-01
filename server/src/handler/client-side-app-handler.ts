import "reflect-metadata";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";
import { handle } from "hono/aws-lambda";
import type { Hono } from "hono";

import { buildApp } from "./hono-handler/client-side-app";
import { initHandler } from "./init-handler";
import type { AppEnv } from "./hono-handler/constants";

// アプリケーションインスタンスをキャッシュ（コールドスタート対策）
let cachedApp: Hono<AppEnv> | null = null;

// Initialize container and build app
const initializeApp = (): Hono<AppEnv> => {
  if (cachedApp !== null) {
    return cachedApp;
  }

  const { container } = initHandler();
  cachedApp = buildApp({ container });
  return cachedApp;
};

// Lambda handler
export const handler = (event: LambdaEvent, context: LambdaContext) => {
  const app = initializeApp();
  return handle(app)(event, context);
};
