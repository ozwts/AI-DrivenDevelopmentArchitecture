import "reflect-metadata";
import type { LambdaEvent, LambdaContext } from "hono/aws-lambda";
import { handle } from "hono/aws-lambda";
import type { Hono } from "hono";

import { buildApp } from "./hono-handler/client-side-app";
import { initHandler } from "./init-handler";

// アプリケーションインスタンスをキャッシュ（コールドスタート対策）
let cachedApp: Hono | null = null;

// Initialize container and build app
const initializeApp = async () => {
  if (cachedApp !== null) {
    return cachedApp;
  }

  const { container } = await initHandler();
  cachedApp = buildApp({ container });
  return cachedApp;
};

// Lambda handler
export const handler = async (event: LambdaEvent, context: LambdaContext) => {
  const app = await initializeApp();
  return handle(app)(event, context);
};
