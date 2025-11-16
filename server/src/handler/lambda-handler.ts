import "reflect-metadata";
import { handle } from "hono/aws-lambda";
import { buildApp } from "./hono-handler/client-side-app";
import { initHandler } from "./init-handler";

// Initialize container and build app
const initializeApp = async () => {
  const { container } = await initHandler();
  return buildApp({ container });
};

// Export Lambda handler (using top-level await - ESM native)
export const handler = handle(await initializeApp());
