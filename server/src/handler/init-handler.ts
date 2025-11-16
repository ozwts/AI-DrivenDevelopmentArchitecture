import "reflect-metadata";
import type { Container } from "inversify";
import { registerLambdaContainer } from "@/di-container/register-lambda-container";

export const initHandler = async (): Promise<{ container: Container }> => {
  const container = await registerLambdaContainer();
  return { container };
};
