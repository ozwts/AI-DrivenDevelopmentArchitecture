import "reflect-metadata";
import type { Container } from "inversify";
import { registerLambdaContainer } from "@/di-container/register-lambda-container";

export const initHandler = (): { container: Container } => {
  const container = registerLambdaContainer();
  return { container };
};
