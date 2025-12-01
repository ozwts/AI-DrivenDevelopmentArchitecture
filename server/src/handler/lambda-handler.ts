import "reflect-metadata";
import { handle } from "hono/aws-lambda";
import { buildApp } from "./hono-handler/client-side-app";
import { initHandler } from "./init-handler";

// Initialize container and build app
const initializeApp = () => {
  const { container } = initHandler();
  return buildApp({ container });
};

// Export Lambda handler
export const handler = handle(initializeApp());
